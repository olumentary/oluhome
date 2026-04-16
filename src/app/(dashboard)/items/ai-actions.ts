'use server';

import { revalidatePath } from 'next/cache';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-helpers';
import { db } from '@/db';
import { aiAnalyses, collectionItems, valuations } from '@/db/schema';
import type {
  AiAnalysisTypeKey,
  ConversationMessage,
  IdentifyResponse,
  ConditionResponse,
  ProvenanceResponse,
  ValueEstimateResponse,
} from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AiActionState {
  error?: string;
  success?: boolean;
}

export interface AnalysisHistoryEntry {
  id: string;
  analysisType: AiAnalysisTypeKey;
  response: unknown;
  messages: ConversationMessage[] | null;
  modelVersion: string | null;
  photoIds: string[] | null;
  applied: boolean;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// getAnalysisHistory — for the analysis panel
// ---------------------------------------------------------------------------

export async function getAnalysisHistory(
  itemId: string,
): Promise<AnalysisHistoryEntry[]> {
  const user = await requireAuth();

  // Verify item ownership
  const item = await db.query.collectionItems.findFirst({
    where: and(
      eq(collectionItems.id, itemId),
      eq(collectionItems.userId, user.id),
    ),
    columns: { id: true },
  });
  if (!item) return [];

  const analyses = await db.query.aiAnalyses.findMany({
    where: eq(aiAnalyses.itemId, itemId),
    orderBy: [desc(aiAnalyses.createdAt)],
  });

  return analyses.map((a) => ({
    id: a.id,
    analysisType: a.analysisType as AiAnalysisTypeKey,
    response: a.response,
    messages: (a.messages ?? null) as ConversationMessage[] | null,
    modelVersion: a.modelVersion,
    photoIds: a.photoIds,
    applied: a.applied,
    createdAt: a.createdAt,
  }));
}

// ---------------------------------------------------------------------------
// applyIdentifyFields — apply selected fields from an identify analysis
// ---------------------------------------------------------------------------

export async function applyIdentifyFields(
  itemId: string,
  analysisId: string,
  fields: Partial<{
    period: boolean;
    style: boolean;
    originCountry: boolean;
    originRegion: boolean;
    makerAttribution: boolean;
    materials: boolean;
  }>,
): Promise<AiActionState> {
  const user = await requireAuth();

  const item = await db.query.collectionItems.findFirst({
    where: and(
      eq(collectionItems.id, itemId),
      eq(collectionItems.userId, user.id),
    ),
    columns: { id: true },
  });
  if (!item) return { error: 'Item not found' };

  const analysis = await db.query.aiAnalyses.findFirst({
    where: and(eq(aiAnalyses.id, analysisId), eq(aiAnalyses.itemId, itemId)),
  });
  if (!analysis) return { error: 'Analysis not found' };

  const data = analysis.response as IdentifyResponse;

  const updates: Record<string, unknown> = {};
  if (fields.period) updates.period = data.period;
  if (fields.style) updates.style = data.style;
  if (fields.originCountry) updates.originCountry = data.origin.country;
  if (fields.originRegion && data.origin.region) updates.originRegion = data.origin.region;
  if (fields.makerAttribution) updates.makerAttribution = data.makerAttribution;
  if (fields.materials) updates.materials = data.materials;

  if (Object.keys(updates).length === 0) return { error: 'No fields selected' };

  await db
    .update(collectionItems)
    .set(updates)
    .where(and(eq(collectionItems.id, itemId), eq(collectionItems.userId, user.id)));

  await db
    .update(aiAnalyses)
    .set({ applied: true })
    .where(eq(aiAnalyses.id, analysisId));

  revalidatePath(`/items/${itemId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// applyConditionRating
// ---------------------------------------------------------------------------

export async function applyConditionRating(
  itemId: string,
  analysisId: string,
): Promise<AiActionState> {
  const user = await requireAuth();

  const item = await db.query.collectionItems.findFirst({
    where: and(
      eq(collectionItems.id, itemId),
      eq(collectionItems.userId, user.id),
    ),
    columns: { id: true },
  });
  if (!item) return { error: 'Item not found' };

  const analysis = await db.query.aiAnalyses.findFirst({
    where: and(eq(aiAnalyses.id, analysisId), eq(aiAnalyses.itemId, itemId)),
  });
  if (!analysis) return { error: 'Analysis not found' };

  const data = analysis.response as ConditionResponse;

  await db
    .update(collectionItems)
    .set({ condition: data.rating, conditionNotes: data.overallNotes })
    .where(and(eq(collectionItems.id, itemId), eq(collectionItems.userId, user.id)));

  await db
    .update(aiAnalyses)
    .set({ applied: true })
    .where(eq(aiAnalyses.id, analysisId));

  revalidatePath(`/items/${itemId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// applyProvenanceNarrative
// ---------------------------------------------------------------------------

export async function applyProvenanceNarrative(
  itemId: string,
  analysisId: string,
): Promise<AiActionState> {
  const user = await requireAuth();

  const item = await db.query.collectionItems.findFirst({
    where: and(
      eq(collectionItems.id, itemId),
      eq(collectionItems.userId, user.id),
    ),
    columns: { id: true },
  });
  if (!item) return { error: 'Item not found' };

  const analysis = await db.query.aiAnalyses.findFirst({
    where: and(eq(aiAnalyses.id, analysisId), eq(aiAnalyses.itemId, itemId)),
  });
  if (!analysis) return { error: 'Analysis not found' };

  const data = analysis.response as ProvenanceResponse;

  await db
    .update(collectionItems)
    .set({ provenanceNarrative: data.narrative })
    .where(and(eq(collectionItems.id, itemId), eq(collectionItems.userId, user.id)));

  await db
    .update(aiAnalyses)
    .set({ applied: true })
    .where(eq(aiAnalyses.id, analysisId));

  revalidatePath(`/items/${itemId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// applyValueEstimate — creates a valuation record
// ---------------------------------------------------------------------------

export async function applyValueEstimate(
  itemId: string,
  analysisId: string,
): Promise<AiActionState> {
  const user = await requireAuth();

  const item = await db.query.collectionItems.findFirst({
    where: and(
      eq(collectionItems.id, itemId),
      eq(collectionItems.userId, user.id),
    ),
    columns: { id: true },
  });
  if (!item) return { error: 'Item not found' };

  const analysis = await db.query.aiAnalyses.findFirst({
    where: and(eq(aiAnalyses.id, analysisId), eq(aiAnalyses.itemId, itemId)),
  });
  if (!analysis) return { error: 'Analysis not found' };

  const data = analysis.response as ValueEstimateResponse;

  await db.insert(valuations).values({
    itemId,
    valuationType: 'estimated',
    valueLow: String(data.estimatedRange.low),
    valueHigh: String(data.estimatedRange.high),
    notes: `AI-generated estimate: ${data.basis}`,
    purpose: 'personal',
  });

  await db
    .update(aiAnalyses)
    .set({ applied: true })
    .where(eq(aiAnalyses.id, analysisId));

  revalidatePath(`/items/${itemId}`);
  return { success: true };
}
