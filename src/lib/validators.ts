import { z } from 'zod';
import type { FieldSchema } from '@/types';

// ---------------------------------------------------------------------------
// Field definition validators
// ---------------------------------------------------------------------------

const FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'boolean',
  'select',
  'multi_select',
  'date',
  'url',
] as const;

export const fieldDefinitionSchema = z.object({
  key: z
    .string()
    .min(1, 'Key is required')
    .max(64)
    .regex(/^[a-z][a-z0-9_]*$/, 'Key must be snake_case starting with a letter'),
  label: z.string().min(1, 'Label is required').max(128),
  type: z.enum(FIELD_TYPES),
  unit: z.string().max(32).optional(),
  options: z.array(z.string().min(1).max(128)).optional(),
  required: z.boolean(),
  group: z.string().max(64).default('General'),
  min: z.number().optional(),
  max: z.number().optional(),
});

export const fieldSchemaSchema = z.object({
  fields: z.array(fieldDefinitionSchema),
  measurement_presets: z.array(z.string().min(1).max(128)).optional(),
  default_materials: z.array(z.string().min(1).max(128)).optional(),
  pdf_sections: z.array(z.string().min(1).max(128)).optional(),
});

// ---------------------------------------------------------------------------
// Item type validators
// ---------------------------------------------------------------------------

export const itemTypeFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens'),
  description: z.string().max(1000).optional(),
  icon: z.string().max(64).optional(),
  fieldSchema: fieldSchemaSchema,
});

export type ItemTypeFormValues = z.infer<typeof itemTypeFormSchema>;

// ---------------------------------------------------------------------------
// Item form validators
// ---------------------------------------------------------------------------

const ITEM_CONDITIONS = [
  'excellent',
  'very_good',
  'good',
  'fair',
  'poor',
] as const;

const ITEM_STATUSES = [
  'active',
  'sold',
  'gifted',
  'stored',
  'on_loan',
] as const;

export const itemFormSchema = z.object({
  itemTypeId: z.string().uuid('Please select an item type'),
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().max(5000).optional(),
  period: z.string().max(255).optional(),
  style: z.string().max(255).optional(),
  originCountry: z.string().max(255).optional(),
  originRegion: z.string().max(255).optional(),
  makerAttribution: z.string().max(500).optional(),
  materials: z.array(z.string().min(1).max(128)).optional(),
  condition: z.enum(ITEM_CONDITIONS).optional(),
  conditionNotes: z.string().max(5000).optional(),
  height: z.number().positive().optional(),
  width: z.number().positive().optional(),
  depth: z.number().positive().optional(),
  diameter: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  room: z.string().max(255).optional(),
  positionInRoom: z.string().max(255).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
  provenanceNarrative: z.string().max(10000).optional(),
  provenanceReferences: z.string().max(5000).optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string().min(1).max(128)).optional(),
  status: z.enum(ITEM_STATUSES).optional(),
});

export type ItemFormValues = z.infer<typeof itemFormSchema>;

// ---------------------------------------------------------------------------
// Vendor form validators
// ---------------------------------------------------------------------------

const VENDOR_TYPES = [
  'dealer',
  'auction_house',
  'private',
  'estate_sale',
  'flea_market',
  'gallery',
  'other',
] as const;

export const vendorFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  businessName: z.string().max(255).optional(),
  type: z.enum(VENDOR_TYPES).optional(),
  email: z.string().email('Invalid email address').max(255).optional().or(z.literal('')),
  phone: z.string().max(64).optional(),
  website: z.string().max(512).optional(),
  address: z.string().max(2000).optional(),
  specialty: z.string().max(2000).optional(),
  notes: z.string().max(5000).optional(),
  rating: z.number().int().min(1).max(5).optional(),
});

export type VendorFormValues = z.infer<typeof vendorFormSchema>;

// ---------------------------------------------------------------------------
// Acquisition form validators
// ---------------------------------------------------------------------------

const ACQUISITION_TYPES = [
  'purchase',
  'gift',
  'inheritance',
  'trade',
] as const;

export const acquisitionFormSchema = z.object({
  vendorId: z.string().uuid().optional().or(z.literal('')),
  acquisitionDate: z.string().optional(),
  acquisitionType: z.enum(ACQUISITION_TYPES).optional(),
  listedPrice: z.number().nonnegative().optional(),
  purchasePrice: z.number().nonnegative().optional(),
  buyersPremiumPct: z.number().min(0).max(100).optional(),
  taxAmount: z.number().nonnegative().optional(),
  shippingCost: z.number().nonnegative().optional(),
  totalCost: z.number().nonnegative().optional(),
  lotNumber: z.string().max(255).optional(),
  saleName: z.string().max(500).optional(),
  notes: z.string().max(5000).optional(),
  receiptS3Key: z.string().max(1024).optional(),
});

export type AcquisitionFormValues = z.infer<typeof acquisitionFormSchema>;

// ---------------------------------------------------------------------------
// Dynamic schema generator
// ---------------------------------------------------------------------------

export function generateDynamicSchema(fieldSchema: FieldSchema | null) {
  if (!fieldSchema?.fields?.length) return z.object({});

  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fieldSchema.fields) {
    let fieldValidator: z.ZodTypeAny;

    switch (field.type) {
      case 'text':
      case 'textarea':
      case 'url':
        fieldValidator = z.string();
        break;
      case 'number': {
        let num = z.number();
        if (field.min != null) num = num.min(field.min);
        if (field.max != null) num = num.max(field.max);
        fieldValidator = num;
        break;
      }
      case 'boolean':
        fieldValidator = z.boolean();
        break;
      case 'select':
        fieldValidator =
          field.options && field.options.length > 0
            ? z.enum(field.options as [string, ...string[]])
            : z.string();
        break;
      case 'multi_select':
        fieldValidator =
          field.options && field.options.length > 0
            ? z.array(z.enum(field.options as [string, ...string[]]))
            : z.array(z.string());
        break;
      case 'date':
        fieldValidator = z.string().date();
        break;
      default:
        fieldValidator = z.string();
    }

    shape[field.key] = field.required
      ? fieldValidator
      : fieldValidator.optional();
  }

  return z.object(shape);
}
