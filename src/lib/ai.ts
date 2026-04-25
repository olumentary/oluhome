import { generateText, type ModelMessage, type UserContent } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type {
  AiAnalysisTypeKey,
  AiAnalysisResponse,
  ConversationMessage,
} from '@/types';

// ---------------------------------------------------------------------------
// Provider — swap this to use a different model / provider
// ---------------------------------------------------------------------------

const model = anthropic('claude-sonnet-4-20250514');

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

const PROMPTS: Record<AiAnalysisTypeKey, string> = {
  identify: `You are an expert appraiser and art historian specializing in antiques and decorative arts. Analyze the photos and any information the user provides to identify the item.

Consider construction techniques, decorative elements, proportions, and materials visible. If you need clarification or additional details from the user, ask clear specific questions.

When you have enough information, provide your final analysis as a single JSON code block with no other text:
\`\`\`json
{ "period": string, "dateRange": string, "style": string, "origin": { "country": string, "region"?: string }, "materials": string[], "makerAttribution": string|null, "confidence": "low"|"medium"|"high", "comparables": [{ "description": string, "institution"?: string }], "notes": string }
\`\`\``,

  condition: `You are a conservator assessing condition. Examine the photos and any information the user provides for damage, wear, repairs, and restoration evidence. If you need clarification or additional details from the user, ask clear specific questions.

When you have enough information, provide your final analysis as a single JSON code block with no other text:
\`\`\`json
{ "rating": "excellent"|"very_good"|"good"|"fair"|"poor", "issues": [{ "area": string, "description": string, "severity": "minor"|"moderate"|"significant" }], "restorations": [{ "area": string, "description": string, "quality": string }], "recommendations": string[], "overallNotes": string }
\`\`\``,

  provenance: `You are an art historian. Given the item details and photos, draft a provenance narrative suitable for an auction catalog. Use formal art historical language. Note any visible marks, labels, stamps, or inscriptions. If you need clarification or additional details from the user, ask clear specific questions.

When you have enough information, provide your final analysis as a single JSON code block with no other text:
\`\`\`json
{ "narrative": string, "identifiedMarks": [{ "type": string, "description": string, "location": string }], "suggestedResearch": string[] }
\`\`\``,

  value_estimate: `You are an antiques appraiser. Based on the details and photos provided, provide an informal market value estimate. This is not a formal appraisal. If you need clarification or additional details from the user, ask clear specific questions.

When you have enough information, provide your final analysis as a single JSON code block with no other text:
\`\`\`json
{ "estimatedRange": { "low": number, "high": number }, "currency": "USD", "basis": string, "comparablesSold": [{ "description": string, "price": number, "venue"?: string, "date"?: string }], "marketNotes": string, "confidence": "low"|"medium"|"high" }
\`\`\``,
};

// ---------------------------------------------------------------------------
// Item context builder
// ---------------------------------------------------------------------------

interface ItemContext {
  title: string;
  period?: string | null;
  style?: string | null;
  originCountry?: string | null;
  originRegion?: string | null;
  makerAttribution?: string | null;
  materials?: string[] | null;
  condition?: string | null;
  conditionNotes?: string | null;
  description?: string | null;
}

function buildTextContext(item: ItemContext): string {
  const lines: string[] = [`Item: ${item.title}`];
  if (item.period) lines.push(`Period: ${item.period}`);
  if (item.style) lines.push(`Style: ${item.style}`);
  if (item.originCountry) {
    lines.push(`Origin: ${item.originCountry}${item.originRegion ? `, ${item.originRegion}` : ''}`);
  }
  if (item.makerAttribution) lines.push(`Attribution: ${item.makerAttribution}`);
  if (item.materials?.length) lines.push(`Materials: ${item.materials.join(', ')}`);
  if (item.condition) lines.push(`Current condition: ${item.condition}`);
  if (item.conditionNotes) lines.push(`Condition notes: ${item.conditionNotes}`);
  if (item.description) lines.push(`Description: ${item.description}`);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Response parsing — detect final JSON vs conversational
// ---------------------------------------------------------------------------

const JSON_BLOCK_RE = /```json\s*\n([\s\S]*?)\n\s*```/;

export function parseAssistantResponse(text: string): {
  isResult: boolean;
  parsed: AiAnalysisResponse | null;
} {
  const match = JSON_BLOCK_RE.exec(text);
  if (match) {
    try {
      const parsed = JSON.parse(match[1]) as AiAnalysisResponse;
      return { isResult: true, parsed };
    } catch {
      // Malformed JSON inside code block — treat as conversational
    }
  }

  // Also try parsing the entire response as JSON (in case model omits fences)
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as AiAnalysisResponse;
      return { isResult: true, parsed };
    } catch {
      // Not valid JSON
    }
  }

  return { isResult: false, parsed: null };
}

// ---------------------------------------------------------------------------
// Build AI SDK messages from conversation history + images
// ---------------------------------------------------------------------------

function buildMessages(
  item: ItemContext,
  photoBase64s: Array<{ base64: string; mediaType: string }>,
  conversationHistory: ConversationMessage[],
  userContext?: string,
): ModelMessage[] {
  // First message always includes photos + item context
  const firstUserContent: UserContent = [
    {
      type: 'text',
      text: `Here are the item details:\n\n${buildTextContext(item)}${userContext ? `\n\nAdditional context from the owner:\n${userContext}` : ''}\n\nPlease analyze the following photos:`,
    },
    ...photoBase64s.map(
      (photo) =>
        ({
          type: 'image',
          image: photo.base64,
          mimeType: photo.mediaType,
        }) as const,
    ),
  ];

  const messages: ModelMessage[] = [{ role: 'user', content: firstUserContent }];

  // Append conversation history (skip the first user message — we rebuilt it with images)
  for (const msg of conversationHistory.slice(1)) {
    messages.push({ role: msg.role, content: msg.content });
  }

  return messages;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export { PROMPTS };
export type { ItemContext };

/**
 * Start or continue an AI analysis conversation.
 *
 * - For a new analysis: pass item, photos, analysisType, and optional userContext.
 * - For a follow-up: also pass priorMessages (the stored conversation so far).
 *
 * Returns the assistant's response text, updated message history, and whether
 * the response contains a final structured result.
 */
export async function analyzeItem(
  analysisType: AiAnalysisTypeKey,
  item: ItemContext,
  photoBase64s: Array<{ base64: string; mediaType: string }>,
  options?: {
    userContext?: string;
    priorMessages?: ConversationMessage[];
    followUpMessage?: string;
  },
): Promise<{
  assistantText: string;
  messages: ConversationMessage[];
  result: AiAnalysisResponse | null;
  isComplete: boolean;
  model: string;
  promptUsed: string;
}> {
  const systemPrompt = PROMPTS[analysisType];
  const priorMessages = options?.priorMessages ?? [];

  // Build the stored conversation messages (text only, for DB)
  let storedMessages: ConversationMessage[];

  if (priorMessages.length === 0) {
    // New conversation
    const userText = `${buildTextContext(item)}${options?.userContext ? `\n\nAdditional context: ${options.userContext}` : ''}`;
    storedMessages = [{ role: 'user', content: userText }];
  } else {
    // Continuing — append the follow-up
    storedMessages = [...priorMessages];
    if (options?.followUpMessage) {
      storedMessages.push({ role: 'user', content: options.followUpMessage });
    }
  }

  // Build full messages array for AI SDK (with images attached to first message)
  const aiMessages = buildMessages(item, photoBase64s, storedMessages, options?.userContext);

  const response = await generateText({
    model,
    system: systemPrompt,
    messages: aiMessages,
    maxOutputTokens: 4096,
  });

  const assistantText = response.text;

  // Check if this is a final result
  const { isResult, parsed } = parseAssistantResponse(assistantText);

  // Append assistant message to stored history
  storedMessages.push({ role: 'assistant', content: assistantText });

  return {
    assistantText,
    messages: storedMessages,
    result: isResult ? parsed : null,
    isComplete: isResult,
    model: response.response?.modelId ?? 'unknown',
    promptUsed: systemPrompt,
  };
}
