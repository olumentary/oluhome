import { relations } from 'drizzle-orm';
import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  bigint,
  numeric,
  date,
  jsonb,
  index,
  uniqueIndex,
  unique,
  primaryKey,
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const userRoleEnum = pgEnum('user_role', ['owner', 'admin']);

export const userPlanEnum = pgEnum('user_plan', [
  'free',
  'pro',
  'premium',
  'admin',
]);

export const itemConditionEnum = pgEnum('item_condition', [
  'excellent',
  'very_good',
  'good',
  'fair',
  'poor',
]);

export const itemStatusEnum = pgEnum('item_status', [
  'active',
  'sold',
  'gifted',
  'stored',
  'on_loan',
]);

export const vendorTypeEnum = pgEnum('vendor_type', [
  'dealer',
  'auction_house',
  'private',
  'estate_sale',
  'flea_market',
  'gallery',
  'other',
]);

export const acquisitionTypeEnum = pgEnum('acquisition_type', [
  'purchase',
  'gift',
  'inheritance',
  'trade',
]);

export const valuationTypeEnum = pgEnum('valuation_type', [
  'estimated',
  'appraised',
  'insured',
  'auction_estimate',
  'retail',
]);

export const valuationPurposeEnum = pgEnum('valuation_purpose', [
  'insurance',
  'estate',
  'sale',
  'donation',
  'personal',
]);

export const shareScopeEnum = pgEnum('share_scope', [
  'item',
  'room',
  'collection',
]);

export const aiAnalysisTypeEnum = pgEnum('ai_analysis_type', [
  'identify',
  'condition',
  'provenance',
  'value_estimate',
]);

export const fieldTypeEnum = pgEnum('field_type', [
  'text',
  'textarea',
  'number',
  'boolean',
  'select',
  'multi_select',
  'date',
  'url',
]);

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: userRoleEnum('role').notNull().default('owner'),
    plan: userPlanEnum('plan').notNull().default('free'),
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
    planValidUntil: timestamp('plan_valid_until', { withTimezone: true }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex('users_email_idx').on(table.email)],
);

export const collectionItemTypes = pgTable(
  'collection_item_types',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    description: text('description'),
    icon: varchar('icon', { length: 64 }),
    fieldSchema: jsonb('field_schema'),
    displayOrder: integer('display_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('collection_item_types_user_id_idx').on(table.userId),
    uniqueIndex('collection_item_types_user_id_slug_idx').on(
      table.userId,
      table.slug,
    ),
  ],
);

export const collectionItems = pgTable(
  'collection_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    itemTypeId: uuid('item_type_id')
      .notNull()
      .references(() => collectionItemTypes.id, { onDelete: 'restrict' }),
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    period: varchar('period', { length: 255 }),
    style: varchar('style', { length: 255 }),
    originCountry: varchar('origin_country', { length: 255 }),
    originRegion: varchar('origin_region', { length: 255 }),
    makerAttribution: varchar('maker_attribution', { length: 500 }),
    materials: text('materials').array(),
    condition: itemConditionEnum('condition'),
    conditionNotes: text('condition_notes'),
    height: numeric('height', { precision: 10, scale: 2 }),
    width: numeric('width', { precision: 10, scale: 2 }),
    depth: numeric('depth', { precision: 10, scale: 2 }),
    diameter: numeric('diameter', { precision: 10, scale: 2 }),
    weight: numeric('weight', { precision: 10, scale: 2 }),
    room: varchar('room', { length: 255 }),
    positionInRoom: varchar('position_in_room', { length: 255 }),
    customFields: jsonb('custom_fields'),
    provenanceNarrative: text('provenance_narrative'),
    provenanceReferences: text('provenance_references'),
    notes: text('notes'),
    tags: text('tags').array(),
    status: itemStatusEnum('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('collection_items_user_id_idx').on(table.userId),
    index('collection_items_item_type_id_idx').on(table.itemTypeId),
    index('collection_items_room_idx').on(table.room),
    index('collection_items_status_idx').on(table.status),
  ],
);

export const itemPhotos = pgTable(
  'item_photos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    itemId: uuid('item_id')
      .notNull()
      .references(() => collectionItems.id, { onDelete: 'cascade' }),
    s3Key: varchar('s3_key', { length: 1024 }).notNull(),
    thumbnailKey: varchar('thumbnail_key', { length: 1024 }),
    originalFilename: varchar('original_filename', { length: 512 }),
    contentType: varchar('content_type', { length: 128 }),
    caption: text('caption'),
    isPrimary: boolean('is_primary').notNull().default(false),
    displayOrder: integer('display_order').notNull().default(0),
    widthPx: integer('width_px'),
    heightPx: integer('height_px'),
    fileSizeBytes: integer('file_size_bytes'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('item_photos_item_id_display_order_idx').on(
      table.itemId,
      table.displayOrder,
    ),
  ],
);

export const itemMeasurements = pgTable('item_measurements', {
  id: uuid('id').primaryKey().defaultRandom(),
  itemId: uuid('item_id')
    .notNull()
    .references(() => collectionItems.id, { onDelete: 'cascade' }),
  label: varchar('label', { length: 255 }).notNull(),
  height: numeric('height', { precision: 10, scale: 2 }),
  width: numeric('width', { precision: 10, scale: 2 }),
  depth: numeric('depth', { precision: 10, scale: 2 }),
  diameter: numeric('diameter', { precision: 10, scale: 2 }),
  notes: text('notes'),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const vendors = pgTable(
  'vendors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    businessName: varchar('business_name', { length: 255 }),
    type: vendorTypeEnum('type'),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 64 }),
    website: varchar('website', { length: 512 }),
    address: text('address'),
    specialty: text('specialty'),
    notes: text('notes'),
    rating: integer('rating'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index('vendors_user_id_idx').on(table.userId)],
);

export const acquisitions = pgTable(
  'acquisitions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    itemId: uuid('item_id')
      .notNull()
      .references(() => collectionItems.id, { onDelete: 'cascade' }),
    vendorId: uuid('vendor_id').references(() => vendors.id, {
      onDelete: 'set null',
    }),
    acquisitionDate: date('acquisition_date'),
    listedPrice: numeric('listed_price', { precision: 10, scale: 2 }),
    purchasePrice: numeric('purchase_price', { precision: 10, scale: 2 }),
    buyersPremiumPct: numeric('buyers_premium_pct', {
      precision: 5,
      scale: 2,
    }),
    taxAmount: numeric('tax_amount', { precision: 10, scale: 2 }),
    shippingCost: numeric('shipping_cost', { precision: 10, scale: 2 }),
    totalCost: numeric('total_cost', { precision: 10, scale: 2 }),
    lotNumber: varchar('lot_number', { length: 255 }),
    saleName: varchar('sale_name', { length: 500 }),
    acquisitionType: acquisitionTypeEnum('acquisition_type'),
    receiptS3Key: varchar('receipt_s3_key', { length: 1024 }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('acquisitions_item_id_idx').on(table.itemId),
    index('acquisitions_vendor_id_idx').on(table.vendorId),
  ],
);

export const valuations = pgTable(
  'valuations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    itemId: uuid('item_id')
      .notNull()
      .references(() => collectionItems.id, { onDelete: 'cascade' }),
    valuationType: valuationTypeEnum('valuation_type').notNull(),
    valueLow: numeric('value_low', { precision: 12, scale: 2 }),
    valueHigh: numeric('value_high', { precision: 12, scale: 2 }),
    valueSingle: numeric('value_single', { precision: 12, scale: 2 }),
    appraiserName: varchar('appraiser_name', { length: 255 }),
    appraiserCredentials: varchar('appraiser_credentials', { length: 500 }),
    valuationDate: date('valuation_date'),
    purpose: valuationPurposeEnum('purpose'),
    notes: text('notes'),
    documentS3Key: varchar('document_s3_key', { length: 1024 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('valuations_item_id_valuation_date_idx').on(
      table.itemId,
      table.valuationDate,
    ),
  ],
);

export const shareTokens = pgTable(
  'share_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: varchar('token', { length: 21 }).notNull().unique(),
    scope: shareScopeEnum('scope').notNull(),
    scopeId: varchar('scope_id', { length: 255 }).notNull(),
    recipientEmail: varchar('recipient_email', { length: 255 }),
    recipientName: varchar('recipient_name', { length: 255 }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    includeValues: boolean('include_values').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastAccessedAt: timestamp('last_accessed_at', { withTimezone: true }),
  },
  (table) => [uniqueIndex('share_tokens_token_idx').on(table.token)],
);

export const aiAnalyses = pgTable('ai_analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  itemId: uuid('item_id')
    .notNull()
    .references(() => collectionItems.id, { onDelete: 'cascade' }),
  analysisType: aiAnalysisTypeEnum('analysis_type').notNull(),
  promptUsed: text('prompt_used'),
  response: jsonb('response'),
  messages: jsonb('messages').$type<
    Array<{ role: 'user' | 'assistant'; content: string }>
  >(),
  modelVersion: varchar('model_version', { length: 128 }),
  photoIds: text('photo_ids').array(),
  applied: boolean('applied').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const planLimits = pgTable('plan_limits', {
  plan: userPlanEnum('plan').primaryKey(),
  maxItems: integer('max_items').notNull(),
  maxPhotosPerItem: integer('max_photos_per_item').notNull(),
  maxStorageMb: integer('max_storage_mb').notNull(),
  maxCustomTypes: integer('max_custom_types').notNull(),
  aiAnalysesPerMonth: integer('ai_analyses_per_month').notNull(),
  pdfExportsPerMonth: integer('pdf_exports_per_month').notNull(),
  shareLinksEnabled: boolean('share_links_enabled').notNull().default(false),
  batchPdfEnabled: boolean('batch_pdf_enabled').notNull().default(false),
  analyticsEnabled: boolean('analytics_enabled').notNull().default(false),
  prioritySupport: boolean('priority_support').notNull().default(false),
});

export const usageTracking = pgTable(
  'usage_tracking',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    period: varchar('period', { length: 7 }).notNull(),
    itemsCount: integer('items_count').notNull().default(0),
    photosCount: integer('photos_count').notNull().default(0),
    storageBytes: bigint('storage_bytes', { mode: 'number' })
      .notNull()
      .default(0),
    aiAnalysesCount: integer('ai_analyses_count').notNull().default(0),
    pdfExportsCount: integer('pdf_exports_count').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique('usage_tracking_user_id_period_uniq').on(
      table.userId,
      table.period,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  collectionItems: many(collectionItems),
  collectionItemTypes: many(collectionItemTypes),
  vendors: many(vendors),
  shareTokens: many(shareTokens),
  usageTracking: many(usageTracking),
}));

export const collectionItemTypesRelations = relations(
  collectionItemTypes,
  ({ one, many }) => ({
    user: one(users, {
      fields: [collectionItemTypes.userId],
      references: [users.id],
    }),
    items: many(collectionItems),
  }),
);

export const collectionItemsRelations = relations(
  collectionItems,
  ({ one, many }) => ({
    user: one(users, {
      fields: [collectionItems.userId],
      references: [users.id],
    }),
    itemType: one(collectionItemTypes, {
      fields: [collectionItems.itemTypeId],
      references: [collectionItemTypes.id],
    }),
    photos: many(itemPhotos),
    measurements: many(itemMeasurements),
    acquisitions: many(acquisitions),
    valuations: many(valuations),
    aiAnalyses: many(aiAnalyses),
  }),
);

export const itemPhotosRelations = relations(itemPhotos, ({ one }) => ({
  item: one(collectionItems, {
    fields: [itemPhotos.itemId],
    references: [collectionItems.id],
  }),
}));

export const itemMeasurementsRelations = relations(
  itemMeasurements,
  ({ one }) => ({
    item: one(collectionItems, {
      fields: [itemMeasurements.itemId],
      references: [collectionItems.id],
    }),
  }),
);

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
  user: one(users, {
    fields: [vendors.userId],
    references: [users.id],
  }),
  acquisitions: many(acquisitions),
}));

export const acquisitionsRelations = relations(acquisitions, ({ one }) => ({
  item: one(collectionItems, {
    fields: [acquisitions.itemId],
    references: [collectionItems.id],
  }),
  vendor: one(vendors, {
    fields: [acquisitions.vendorId],
    references: [vendors.id],
  }),
}));

export const valuationsRelations = relations(valuations, ({ one }) => ({
  item: one(collectionItems, {
    fields: [valuations.itemId],
    references: [collectionItems.id],
  }),
}));

export const shareTokensRelations = relations(shareTokens, ({ one }) => ({
  user: one(users, {
    fields: [shareTokens.userId],
    references: [users.id],
  }),
}));

export const aiAnalysesRelations = relations(aiAnalyses, ({ one }) => ({
  item: one(collectionItems, {
    fields: [aiAnalyses.itemId],
    references: [collectionItems.id],
  }),
}));

export const usageTrackingRelations = relations(usageTracking, ({ one }) => ({
  user: one(users, {
    fields: [usageTracking.userId],
    references: [users.id],
  }),
}));
