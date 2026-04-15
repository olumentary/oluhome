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
