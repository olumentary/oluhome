import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-helpers';
import { aiEnabled, aiBetaAccess } from '@/flags';
import { db } from '@/db';
import { collectionItems, itemPhotos, aiAnalyses } from '@/db/schema';
import { getObject } from '@/lib/storage';
import { analyzeItem } from '@/lib/ai';
import type { AiAnalysisTypeKey, ConversationMessage, AnalysisTurnResult } from '@/types';

const VALID_TYPES: AiAnalysisTypeKey[] = ['identify', 'condition', 'provenance', 'value_estimate'];

const MEDIA_TYPE_MAP: Record<string, string> = {
  'image/jpeg': 'image/jpeg',
  'image/jpg': 'image/jpeg',
  'image/png': 'image/png',
  'image/gif': 'image/gif',
  'image/webp': 'image/webp',
};

// ---------------------------------------------------------------------------
// Download photos from S3 as base64
// ---------------------------------------------------------------------------

async function downloadPhotos(
  photos: Array<{ id: string; s3Key: string; contentType: string | null }>,
): Promise<Array<{ base64: string; mediaType: string }>> {
  const results: Array<{ base64: string; mediaType: string }> = [];
  for (const photo of photos) {
    try {
      const s3Response = await getObject(photo.s3Key);
      const bodyBytes = await s3Response.Body?.transformToByteArray();
      if (!bodyBytes) continue;
      results.push({
        base64: Buffer.from(bodyBytes).toString('base64'),
        mediaType: MEDIA_TYPE_MAP[photo.contentType ?? 'image/jpeg'] ?? 'image/jpeg',
      });
    } catch (err) {
      console.error(`Failed to download photo ${photo.id}:`, err);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// POST handler — new analysis or follow-up message
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // Feature flag gate
  const [aiFlag, betaFlag] = await Promise.all([aiEnabled(), aiBetaAccess()]);
  if (!aiFlag && !betaFlag) {
    return NextResponse.json({ error: 'AI features not enabled' }, { status: 403 });
  }

  const user = await requireAuth();

  let body: {
    itemId?: string;
    photoIds?: string[];
    analysisType?: string;
    userContext?: string;
    // Follow-up fields
    analysisId?: string;
    message?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // -----------------------------------------------------------------------
  // Follow-up on existing conversation
  // -----------------------------------------------------------------------
  if (body.analysisId && body.message) {
    return handleFollowUp(user.id, body.analysisId, body.message);
  }

  // -----------------------------------------------------------------------
  // New analysis
  // -----------------------------------------------------------------------
  const { itemId, photoIds, analysisType, userContext } = body;

  if (!itemId || !analysisType) {
    return NextResponse.json({ error: 'Missing itemId or analysisType' }, { status: 400 });
  }
  if (!VALID_TYPES.includes(analysisType as AiAnalysisTypeKey)) {
    return NextResponse.json({ error: 'Invalid analysis type' }, { status: 400 });
  }

  // Verify item ownership
  const item = await db.query.collectionItems.findFirst({
    where: and(eq(collectionItems.id, itemId), eq(collectionItems.userId, user.id)),
  });
  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  // Fetch and filter photos
  const photos = await db.query.itemPhotos.findMany({
    where: eq(itemPhotos.itemId, itemId),
  });
  const selectedPhotos = photoIds?.length
    ? photos.filter((p) => photoIds.includes(p.id))
    : photos;
  if (selectedPhotos.length === 0) {
    return NextResponse.json({ error: 'No photos available for analysis' }, { status: 400 });
  }

  const photoBase64s = await downloadPhotos(selectedPhotos);
  if (photoBase64s.length === 0) {
    return NextResponse.json({ error: 'Failed to download photos' }, { status: 500 });
  }

  try {
    const aiResult = await analyzeItem(
      analysisType as AiAnalysisTypeKey,
      {
        title: item.title,
        period: item.period,
        style: item.style,
        originCountry: item.originCountry,
        originRegion: item.originRegion,
        makerAttribution: item.makerAttribution,
        materials: item.materials,
        condition: item.condition,
        conditionNotes: item.conditionNotes,
        description: item.description,
      },
      photoBase64s,
      { userContext },
    );

    // Store in DB
    const [analysis] = await db
      .insert(aiAnalyses)
      .values({
        itemId,
        analysisType: analysisType as AiAnalysisTypeKey,
        promptUsed: aiResult.promptUsed,
        response: aiResult.isComplete ? aiResult.result : null,
        messages: aiResult.messages,
        modelVersion: aiResult.model,
        photoIds: selectedPhotos.map((p) => p.id),
        applied: false,
      })
      .returning();

    const turnResult: AnalysisTurnResult = {
      analysisId: analysis.id,
      response: aiResult.isComplete ? aiResult.result : null,
      assistantMessage: aiResult.assistantText,
      messages: aiResult.messages,
      complete: aiResult.isComplete,
    };

    return NextResponse.json(turnResult);
  } catch (err) {
    return handleAiError(err);
  }
}

// ---------------------------------------------------------------------------
// Follow-up handler
// ---------------------------------------------------------------------------

async function handleFollowUp(
  userId: string,
  analysisId: string,
  userMessage: string,
) {
  // Load existing analysis
  const analysis = await db.query.aiAnalyses.findFirst({
    where: eq(aiAnalyses.id, analysisId),
  });
  if (!analysis) {
    return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
  }

  // Verify ownership via item
  const item = await db.query.collectionItems.findFirst({
    where: and(
      eq(collectionItems.id, analysis.itemId),
      eq(collectionItems.userId, userId),
    ),
  });
  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  // Analysis already complete — no more follow-ups
  if (analysis.response !== null) {
    return NextResponse.json({ error: 'Analysis already complete' }, { status: 400 });
  }

  // Re-download photos for the vision context
  const photos = await db.query.itemPhotos.findMany({
    where: eq(itemPhotos.itemId, analysis.itemId),
  });
  const selectedPhotos = analysis.photoIds?.length
    ? photos.filter((p) => analysis.photoIds!.includes(p.id))
    : photos;

  const photoBase64s = await downloadPhotos(selectedPhotos);
  if (photoBase64s.length === 0) {
    return NextResponse.json({ error: 'Failed to download photos' }, { status: 500 });
  }

  const priorMessages = (analysis.messages ?? []) as ConversationMessage[];

  try {
    const aiResult = await analyzeItem(
      analysis.analysisType as AiAnalysisTypeKey,
      {
        title: item.title,
        period: item.period,
        style: item.style,
        originCountry: item.originCountry,
        originRegion: item.originRegion,
        makerAttribution: item.makerAttribution,
        materials: item.materials,
        condition: item.condition,
        conditionNotes: item.conditionNotes,
        description: item.description,
      },
      photoBase64s,
      {
        priorMessages,
        followUpMessage: userMessage,
      },
    );

    // Update the existing analysis record
    await db
      .update(aiAnalyses)
      .set({
        response: aiResult.isComplete ? aiResult.result : null,
        messages: aiResult.messages,
        modelVersion: aiResult.model,
      })
      .where(eq(aiAnalyses.id, analysisId));

    const turnResult: AnalysisTurnResult = {
      analysisId,
      response: aiResult.isComplete ? aiResult.result : null,
      assistantMessage: aiResult.assistantText,
      messages: aiResult.messages,
      complete: aiResult.isComplete,
    };

    return NextResponse.json(turnResult);
  } catch (err) {
    return handleAiError(err);
  }
}

// ---------------------------------------------------------------------------
// Error handler
// ---------------------------------------------------------------------------

function handleAiError(err: unknown) {
  console.error('AI analysis failed:', err);

  const errName = err instanceof Error ? err.name : '';
  const errMsg = err instanceof Error ? err.message : '';

  if (errName === 'AI_LoadAPIKeyError' || errMsg.includes('API key')) {
    return NextResponse.json(
      { error: 'AI service is not configured — please contact the administrator' },
      { status: 503 },
    );
  }
  if (errMsg.includes('rate_limit')) {
    return NextResponse.json(
      { error: 'Please wait a moment before running another analysis' },
      { status: 429 },
    );
  }
  if (err instanceof SyntaxError) {
    return NextResponse.json(
      { error: 'Could not parse AI response — try again' },
      { status: 502 },
    );
  }
  return NextResponse.json(
    { error: 'Analysis failed — please try again' },
    { status: 500 },
  );
}
