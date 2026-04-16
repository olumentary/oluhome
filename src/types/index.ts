import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type {
  users,
  collectionItemTypes,
  collectionItems,
  itemPhotos,
  itemMeasurements,
  vendors,
  acquisitions,
  valuations,
  shareTokens,
  aiAnalyses,
  planLimits,
  usageTracking,
} from '@/db/schema';

// ---------------------------------------------------------------------------
// Inferred table types (Select)
// ---------------------------------------------------------------------------

export type User = InferSelectModel<typeof users>;
export type CollectionItemType = InferSelectModel<typeof collectionItemTypes>;
export type CollectionItem = InferSelectModel<typeof collectionItems>;
export type ItemPhoto = InferSelectModel<typeof itemPhotos>;
export type ItemMeasurement = InferSelectModel<typeof itemMeasurements>;
export type Vendor = InferSelectModel<typeof vendors>;
export type Acquisition = InferSelectModel<typeof acquisitions>;
export type Valuation = InferSelectModel<typeof valuations>;
export type ShareToken = InferSelectModel<typeof shareTokens>;
export type AiAnalysis = InferSelectModel<typeof aiAnalyses>;
export type PlanLimit = InferSelectModel<typeof planLimits>;
export type UsageTracking = InferSelectModel<typeof usageTracking>;

// ---------------------------------------------------------------------------
// Inferred table types (Insert)
// ---------------------------------------------------------------------------

export type NewUser = InferInsertModel<typeof users>;
export type NewCollectionItemType = InferInsertModel<typeof collectionItemTypes>;
export type NewCollectionItem = InferInsertModel<typeof collectionItems>;
export type NewItemPhoto = InferInsertModel<typeof itemPhotos>;
export type NewItemMeasurement = InferInsertModel<typeof itemMeasurements>;
export type NewVendor = InferInsertModel<typeof vendors>;
export type NewAcquisition = InferInsertModel<typeof acquisitions>;
export type NewValuation = InferInsertModel<typeof valuations>;
export type NewShareToken = InferInsertModel<typeof shareTokens>;
export type NewAiAnalysis = InferInsertModel<typeof aiAnalyses>;
export type NewUsageTracking = InferInsertModel<typeof usageTracking>;

// ---------------------------------------------------------------------------
// Field schema types (for collection_item_types.field_schema)
// ---------------------------------------------------------------------------

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multi_select'
  | 'date'
  | 'url';

export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  unit?: string;
  options?: string[];
  required: boolean;
  group: string;
  min?: number;
  max?: number;
}

export interface FieldSchema {
  fields: FieldDefinition[];
  measurement_presets?: string[];
  default_materials?: string[];
  pdf_sections?: string[];
}

export type CustomFieldValues = Record<
  string,
  string | number | boolean | string[] | null
>;

// ---------------------------------------------------------------------------
// Plan / usage types
// ---------------------------------------------------------------------------

export type PlanFeature =
  | 'items'
  | 'photos'
  | 'storage'
  | 'custom_types'
  | 'ai_analyses'
  | 'pdf_exports'
  | 'share_links'
  | 'batch_pdf'
  | 'analytics';

export interface PlanCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  plan: string;
}

// ---------------------------------------------------------------------------
// AI Analysis response types
// ---------------------------------------------------------------------------

export type AiAnalysisTypeKey = 'identify' | 'condition' | 'provenance' | 'value_estimate';

export interface IdentifyResponse {
  period: string;
  dateRange: string;
  style: string;
  origin: { country: string; region?: string };
  materials: string[];
  makerAttribution: string | null;
  confidence: 'low' | 'medium' | 'high';
  comparables: Array<{ description: string; institution?: string }>;
  notes: string;
}

export interface ConditionIssue {
  area: string;
  description: string;
  severity: 'minor' | 'moderate' | 'significant';
}

export interface ConditionRestoration {
  area: string;
  description: string;
  quality: string;
}

export interface ConditionResponse {
  rating: 'excellent' | 'very_good' | 'good' | 'fair' | 'poor';
  issues: ConditionIssue[];
  restorations: ConditionRestoration[];
  recommendations: string[];
  overallNotes: string;
}

export interface ProvenanceMark {
  type: string;
  description: string;
  location: string;
}

export interface ProvenanceResponse {
  narrative: string;
  identifiedMarks: ProvenanceMark[];
  suggestedResearch: string[];
}

export interface ComparableSale {
  description: string;
  price: number;
  venue?: string;
  date?: string;
}

export interface ValueEstimateResponse {
  estimatedRange: { low: number; high: number };
  currency: 'USD';
  basis: string;
  comparablesSold: ComparableSale[];
  marketNotes: string;
  confidence: 'low' | 'medium' | 'high';
}

export type AiAnalysisResponse =
  | IdentifyResponse
  | ConditionResponse
  | ProvenanceResponse
  | ValueEstimateResponse;

// ---------------------------------------------------------------------------
// AI Conversation types
// ---------------------------------------------------------------------------

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** What the API returns for a single analysis turn */
export interface AnalysisTurnResult {
  analysisId: string;
  /** null while the conversation is ongoing, populated when the model provides its final JSON */
  response: AiAnalysisResponse | null;
  /** The latest assistant message (conversational or final) */
  assistantMessage: string;
  /** Full conversation history (text only, no images) */
  messages: ConversationMessage[];
  /** true when the model has provided its final structured result */
  complete: boolean;
}
