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
