"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usageTrackingRelations = exports.aiAnalysesRelations = exports.shareTokensRelations = exports.valuationsRelations = exports.acquisitionsRelations = exports.vendorsRelations = exports.itemMeasurementsRelations = exports.itemPhotosRelations = exports.collectionItemsRelations = exports.collectionItemTypesRelations = exports.usersRelations = exports.usageTracking = exports.planLimits = exports.aiAnalyses = exports.shareTokens = exports.valuations = exports.acquisitions = exports.vendors = exports.itemMeasurements = exports.itemPhotos = exports.collectionItems = exports.collectionItemTypes = exports.users = exports.fieldTypeEnum = exports.aiAnalysisTypeEnum = exports.shareScopeEnum = exports.valuationPurposeEnum = exports.valuationTypeEnum = exports.acquisitionTypeEnum = exports.vendorTypeEnum = exports.itemStatusEnum = exports.itemConditionEnum = exports.userPlanEnum = exports.userRoleEnum = void 0;
var drizzle_orm_1 = require("drizzle-orm");
var pg_core_1 = require("drizzle-orm/pg-core");
// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
exports.userRoleEnum = (0, pg_core_1.pgEnum)('user_role', ['owner', 'admin']);
exports.userPlanEnum = (0, pg_core_1.pgEnum)('user_plan', [
    'free',
    'pro',
    'premium',
    'admin',
]);
exports.itemConditionEnum = (0, pg_core_1.pgEnum)('item_condition', [
    'excellent',
    'very_good',
    'good',
    'fair',
    'poor',
]);
exports.itemStatusEnum = (0, pg_core_1.pgEnum)('item_status', [
    'active',
    'sold',
    'gifted',
    'stored',
    'on_loan',
]);
exports.vendorTypeEnum = (0, pg_core_1.pgEnum)('vendor_type', [
    'dealer',
    'auction_house',
    'private',
    'estate_sale',
    'flea_market',
    'gallery',
    'other',
]);
exports.acquisitionTypeEnum = (0, pg_core_1.pgEnum)('acquisition_type', [
    'purchase',
    'gift',
    'inheritance',
    'trade',
]);
exports.valuationTypeEnum = (0, pg_core_1.pgEnum)('valuation_type', [
    'estimated',
    'appraised',
    'insured',
    'auction_estimate',
    'retail',
]);
exports.valuationPurposeEnum = (0, pg_core_1.pgEnum)('valuation_purpose', [
    'insurance',
    'estate',
    'sale',
    'donation',
    'personal',
]);
exports.shareScopeEnum = (0, pg_core_1.pgEnum)('share_scope', [
    'item',
    'room',
    'collection',
]);
exports.aiAnalysisTypeEnum = (0, pg_core_1.pgEnum)('ai_analysis_type', [
    'identify',
    'condition',
    'provenance',
    'value_estimate',
]);
exports.fieldTypeEnum = (0, pg_core_1.pgEnum)('field_type', [
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
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).notNull().unique(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    passwordHash: (0, pg_core_1.varchar)('password_hash', { length: 255 }).notNull(),
    role: (0, exports.userRoleEnum)('role').notNull().default('owner'),
    plan: (0, exports.userPlanEnum)('plan').notNull().default('free'),
    stripeCustomerId: (0, pg_core_1.varchar)('stripe_customer_id', { length: 255 }),
    stripeSubscriptionId: (0, pg_core_1.varchar)('stripe_subscription_id', { length: 255 }),
    planValidUntil: (0, pg_core_1.timestamp)('plan_valid_until', { withTimezone: true }),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow()
        .$onUpdate(function () { return new Date(); }),
}, function (table) { return [(0, pg_core_1.uniqueIndex)('users_email_idx').on(table.email)]; });
exports.collectionItemTypes = (0, pg_core_1.pgTable)('collection_item_types', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)('user_id').references(function () { return exports.users.id; }, { onDelete: 'cascade' }),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    slug: (0, pg_core_1.varchar)('slug', { length: 255 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    icon: (0, pg_core_1.varchar)('icon', { length: 64 }),
    fieldSchema: (0, pg_core_1.jsonb)('field_schema'),
    displayOrder: (0, pg_core_1.integer)('display_order').notNull().default(0),
    isDefault: (0, pg_core_1.boolean)('is_default').notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow()
        .$onUpdate(function () { return new Date(); }),
}, function (table) { return [(0, pg_core_1.index)('collection_item_types_user_id_idx').on(table.userId)]; });
exports.collectionItems = (0, pg_core_1.pgTable)('collection_items', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .references(function () { return exports.users.id; }, { onDelete: 'cascade' }),
    itemTypeId: (0, pg_core_1.uuid)('item_type_id')
        .notNull()
        .references(function () { return exports.collectionItemTypes.id; }, { onDelete: 'restrict' }),
    title: (0, pg_core_1.varchar)('title', { length: 500 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    period: (0, pg_core_1.varchar)('period', { length: 255 }),
    style: (0, pg_core_1.varchar)('style', { length: 255 }),
    originCountry: (0, pg_core_1.varchar)('origin_country', { length: 255 }),
    originRegion: (0, pg_core_1.varchar)('origin_region', { length: 255 }),
    makerAttribution: (0, pg_core_1.varchar)('maker_attribution', { length: 500 }),
    materials: (0, pg_core_1.text)('materials').array(),
    condition: (0, exports.itemConditionEnum)('condition'),
    conditionNotes: (0, pg_core_1.text)('condition_notes'),
    height: (0, pg_core_1.numeric)('height', { precision: 10, scale: 2 }),
    width: (0, pg_core_1.numeric)('width', { precision: 10, scale: 2 }),
    depth: (0, pg_core_1.numeric)('depth', { precision: 10, scale: 2 }),
    diameter: (0, pg_core_1.numeric)('diameter', { precision: 10, scale: 2 }),
    weight: (0, pg_core_1.numeric)('weight', { precision: 10, scale: 2 }),
    room: (0, pg_core_1.varchar)('room', { length: 255 }),
    positionInRoom: (0, pg_core_1.varchar)('position_in_room', { length: 255 }),
    customFields: (0, pg_core_1.jsonb)('custom_fields'),
    provenanceNarrative: (0, pg_core_1.text)('provenance_narrative'),
    provenanceReferences: (0, pg_core_1.text)('provenance_references'),
    notes: (0, pg_core_1.text)('notes'),
    tags: (0, pg_core_1.text)('tags').array(),
    status: (0, exports.itemStatusEnum)('status').notNull().default('active'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow()
        .$onUpdate(function () { return new Date(); }),
}, function (table) { return [
    (0, pg_core_1.index)('collection_items_user_id_idx').on(table.userId),
    (0, pg_core_1.index)('collection_items_item_type_id_idx').on(table.itemTypeId),
    (0, pg_core_1.index)('collection_items_room_idx').on(table.room),
    (0, pg_core_1.index)('collection_items_status_idx').on(table.status),
]; });
exports.itemPhotos = (0, pg_core_1.pgTable)('item_photos', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    itemId: (0, pg_core_1.uuid)('item_id')
        .notNull()
        .references(function () { return exports.collectionItems.id; }, { onDelete: 'cascade' }),
    s3Key: (0, pg_core_1.varchar)('s3_key', { length: 1024 }).notNull(),
    thumbnailKey: (0, pg_core_1.varchar)('thumbnail_key', { length: 1024 }),
    originalFilename: (0, pg_core_1.varchar)('original_filename', { length: 512 }),
    contentType: (0, pg_core_1.varchar)('content_type', { length: 128 }),
    caption: (0, pg_core_1.text)('caption'),
    isPrimary: (0, pg_core_1.boolean)('is_primary').notNull().default(false),
    displayOrder: (0, pg_core_1.integer)('display_order').notNull().default(0),
    widthPx: (0, pg_core_1.integer)('width_px'),
    heightPx: (0, pg_core_1.integer)('height_px'),
    fileSizeBytes: (0, pg_core_1.integer)('file_size_bytes'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, function (table) { return [
    (0, pg_core_1.index)('item_photos_item_id_display_order_idx').on(table.itemId, table.displayOrder),
]; });
exports.itemMeasurements = (0, pg_core_1.pgTable)('item_measurements', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    itemId: (0, pg_core_1.uuid)('item_id')
        .notNull()
        .references(function () { return exports.collectionItems.id; }, { onDelete: 'cascade' }),
    label: (0, pg_core_1.varchar)('label', { length: 255 }).notNull(),
    height: (0, pg_core_1.numeric)('height', { precision: 10, scale: 2 }),
    width: (0, pg_core_1.numeric)('width', { precision: 10, scale: 2 }),
    depth: (0, pg_core_1.numeric)('depth', { precision: 10, scale: 2 }),
    diameter: (0, pg_core_1.numeric)('diameter', { precision: 10, scale: 2 }),
    notes: (0, pg_core_1.text)('notes'),
    displayOrder: (0, pg_core_1.integer)('display_order').notNull().default(0),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
exports.vendors = (0, pg_core_1.pgTable)('vendors', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .references(function () { return exports.users.id; }, { onDelete: 'cascade' }),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    businessName: (0, pg_core_1.varchar)('business_name', { length: 255 }),
    type: (0, exports.vendorTypeEnum)('type'),
    email: (0, pg_core_1.varchar)('email', { length: 255 }),
    phone: (0, pg_core_1.varchar)('phone', { length: 64 }),
    website: (0, pg_core_1.varchar)('website', { length: 512 }),
    address: (0, pg_core_1.text)('address'),
    specialty: (0, pg_core_1.text)('specialty'),
    notes: (0, pg_core_1.text)('notes'),
    rating: (0, pg_core_1.integer)('rating'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow()
        .$onUpdate(function () { return new Date(); }),
}, function (table) { return [(0, pg_core_1.index)('vendors_user_id_idx').on(table.userId)]; });
exports.acquisitions = (0, pg_core_1.pgTable)('acquisitions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    itemId: (0, pg_core_1.uuid)('item_id')
        .notNull()
        .references(function () { return exports.collectionItems.id; }, { onDelete: 'cascade' }),
    vendorId: (0, pg_core_1.uuid)('vendor_id').references(function () { return exports.vendors.id; }, {
        onDelete: 'set null',
    }),
    acquisitionDate: (0, pg_core_1.date)('acquisition_date'),
    listedPrice: (0, pg_core_1.numeric)('listed_price', { precision: 10, scale: 2 }),
    purchasePrice: (0, pg_core_1.numeric)('purchase_price', { precision: 10, scale: 2 }),
    buyersPremiumPct: (0, pg_core_1.numeric)('buyers_premium_pct', {
        precision: 5,
        scale: 2,
    }),
    taxAmount: (0, pg_core_1.numeric)('tax_amount', { precision: 10, scale: 2 }),
    shippingCost: (0, pg_core_1.numeric)('shipping_cost', { precision: 10, scale: 2 }),
    totalCost: (0, pg_core_1.numeric)('total_cost', { precision: 10, scale: 2 }),
    lotNumber: (0, pg_core_1.varchar)('lot_number', { length: 255 }),
    saleName: (0, pg_core_1.varchar)('sale_name', { length: 500 }),
    acquisitionType: (0, exports.acquisitionTypeEnum)('acquisition_type'),
    receiptS3Key: (0, pg_core_1.varchar)('receipt_s3_key', { length: 1024 }),
    notes: (0, pg_core_1.text)('notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, function (table) { return [
    (0, pg_core_1.index)('acquisitions_item_id_idx').on(table.itemId),
    (0, pg_core_1.index)('acquisitions_vendor_id_idx').on(table.vendorId),
]; });
exports.valuations = (0, pg_core_1.pgTable)('valuations', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    itemId: (0, pg_core_1.uuid)('item_id')
        .notNull()
        .references(function () { return exports.collectionItems.id; }, { onDelete: 'cascade' }),
    valuationType: (0, exports.valuationTypeEnum)('valuation_type').notNull(),
    valueLow: (0, pg_core_1.numeric)('value_low', { precision: 12, scale: 2 }),
    valueHigh: (0, pg_core_1.numeric)('value_high', { precision: 12, scale: 2 }),
    valueSingle: (0, pg_core_1.numeric)('value_single', { precision: 12, scale: 2 }),
    appraiserName: (0, pg_core_1.varchar)('appraiser_name', { length: 255 }),
    appraiserCredentials: (0, pg_core_1.varchar)('appraiser_credentials', { length: 500 }),
    valuationDate: (0, pg_core_1.date)('valuation_date'),
    purpose: (0, exports.valuationPurposeEnum)('purpose'),
    notes: (0, pg_core_1.text)('notes'),
    documentS3Key: (0, pg_core_1.varchar)('document_s3_key', { length: 1024 }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, function (table) { return [
    (0, pg_core_1.index)('valuations_item_id_valuation_date_idx').on(table.itemId, table.valuationDate),
]; });
exports.shareTokens = (0, pg_core_1.pgTable)('share_tokens', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .references(function () { return exports.users.id; }, { onDelete: 'cascade' }),
    token: (0, pg_core_1.varchar)('token', { length: 21 }).notNull().unique(),
    scope: (0, exports.shareScopeEnum)('scope').notNull(),
    scopeId: (0, pg_core_1.varchar)('scope_id', { length: 255 }).notNull(),
    recipientEmail: (0, pg_core_1.varchar)('recipient_email', { length: 255 }),
    recipientName: (0, pg_core_1.varchar)('recipient_name', { length: 255 }),
    expiresAt: (0, pg_core_1.timestamp)('expires_at', { withTimezone: true }),
    includeValues: (0, pg_core_1.boolean)('include_values').notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    lastAccessedAt: (0, pg_core_1.timestamp)('last_accessed_at', { withTimezone: true }),
}, function (table) { return [(0, pg_core_1.uniqueIndex)('share_tokens_token_idx').on(table.token)]; });
exports.aiAnalyses = (0, pg_core_1.pgTable)('ai_analyses', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    itemId: (0, pg_core_1.uuid)('item_id')
        .notNull()
        .references(function () { return exports.collectionItems.id; }, { onDelete: 'cascade' }),
    analysisType: (0, exports.aiAnalysisTypeEnum)('analysis_type').notNull(),
    promptUsed: (0, pg_core_1.text)('prompt_used'),
    response: (0, pg_core_1.jsonb)('response'),
    modelVersion: (0, pg_core_1.varchar)('model_version', { length: 128 }),
    photoIds: (0, pg_core_1.text)('photo_ids').array(),
    applied: (0, pg_core_1.boolean)('applied').notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
exports.planLimits = (0, pg_core_1.pgTable)('plan_limits', {
    plan: (0, exports.userPlanEnum)('plan').primaryKey(),
    maxItems: (0, pg_core_1.integer)('max_items').notNull(),
    maxPhotosPerItem: (0, pg_core_1.integer)('max_photos_per_item').notNull(),
    maxStorageMb: (0, pg_core_1.integer)('max_storage_mb').notNull(),
    maxCustomTypes: (0, pg_core_1.integer)('max_custom_types').notNull(),
    aiAnalysesPerMonth: (0, pg_core_1.integer)('ai_analyses_per_month').notNull(),
    pdfExportsPerMonth: (0, pg_core_1.integer)('pdf_exports_per_month').notNull(),
    shareLinksEnabled: (0, pg_core_1.boolean)('share_links_enabled').notNull().default(false),
    batchPdfEnabled: (0, pg_core_1.boolean)('batch_pdf_enabled').notNull().default(false),
    analyticsEnabled: (0, pg_core_1.boolean)('analytics_enabled').notNull().default(false),
    prioritySupport: (0, pg_core_1.boolean)('priority_support').notNull().default(false),
});
exports.usageTracking = (0, pg_core_1.pgTable)('usage_tracking', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .references(function () { return exports.users.id; }, { onDelete: 'cascade' }),
    period: (0, pg_core_1.varchar)('period', { length: 7 }).notNull(),
    itemsCount: (0, pg_core_1.integer)('items_count').notNull().default(0),
    photosCount: (0, pg_core_1.integer)('photos_count').notNull().default(0),
    storageBytes: (0, pg_core_1.bigint)('storage_bytes', { mode: 'number' })
        .notNull()
        .default(0),
    aiAnalysesCount: (0, pg_core_1.integer)('ai_analyses_count').notNull().default(0),
    pdfExportsCount: (0, pg_core_1.integer)('pdf_exports_count').notNull().default(0),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow()
        .$onUpdate(function () { return new Date(); }),
}, function (table) { return [
    (0, pg_core_1.unique)('usage_tracking_user_id_period_uniq').on(table.userId, table.period),
]; });
// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------
exports.usersRelations = (0, drizzle_orm_1.relations)(exports.users, function (_a) {
    var many = _a.many;
    return ({
        collectionItems: many(exports.collectionItems),
        collectionItemTypes: many(exports.collectionItemTypes),
        vendors: many(exports.vendors),
        shareTokens: many(exports.shareTokens),
        usageTracking: many(exports.usageTracking),
    });
});
exports.collectionItemTypesRelations = (0, drizzle_orm_1.relations)(exports.collectionItemTypes, function (_a) {
    var one = _a.one, many = _a.many;
    return ({
        user: one(exports.users, {
            fields: [exports.collectionItemTypes.userId],
            references: [exports.users.id],
        }),
        items: many(exports.collectionItems),
    });
});
exports.collectionItemsRelations = (0, drizzle_orm_1.relations)(exports.collectionItems, function (_a) {
    var one = _a.one, many = _a.many;
    return ({
        user: one(exports.users, {
            fields: [exports.collectionItems.userId],
            references: [exports.users.id],
        }),
        itemType: one(exports.collectionItemTypes, {
            fields: [exports.collectionItems.itemTypeId],
            references: [exports.collectionItemTypes.id],
        }),
        photos: many(exports.itemPhotos),
        measurements: many(exports.itemMeasurements),
        acquisitions: many(exports.acquisitions),
        valuations: many(exports.valuations),
        aiAnalyses: many(exports.aiAnalyses),
    });
});
exports.itemPhotosRelations = (0, drizzle_orm_1.relations)(exports.itemPhotos, function (_a) {
    var one = _a.one;
    return ({
        item: one(exports.collectionItems, {
            fields: [exports.itemPhotos.itemId],
            references: [exports.collectionItems.id],
        }),
    });
});
exports.itemMeasurementsRelations = (0, drizzle_orm_1.relations)(exports.itemMeasurements, function (_a) {
    var one = _a.one;
    return ({
        item: one(exports.collectionItems, {
            fields: [exports.itemMeasurements.itemId],
            references: [exports.collectionItems.id],
        }),
    });
});
exports.vendorsRelations = (0, drizzle_orm_1.relations)(exports.vendors, function (_a) {
    var one = _a.one, many = _a.many;
    return ({
        user: one(exports.users, {
            fields: [exports.vendors.userId],
            references: [exports.users.id],
        }),
        acquisitions: many(exports.acquisitions),
    });
});
exports.acquisitionsRelations = (0, drizzle_orm_1.relations)(exports.acquisitions, function (_a) {
    var one = _a.one;
    return ({
        item: one(exports.collectionItems, {
            fields: [exports.acquisitions.itemId],
            references: [exports.collectionItems.id],
        }),
        vendor: one(exports.vendors, {
            fields: [exports.acquisitions.vendorId],
            references: [exports.vendors.id],
        }),
    });
});
exports.valuationsRelations = (0, drizzle_orm_1.relations)(exports.valuations, function (_a) {
    var one = _a.one;
    return ({
        item: one(exports.collectionItems, {
            fields: [exports.valuations.itemId],
            references: [exports.collectionItems.id],
        }),
    });
});
exports.shareTokensRelations = (0, drizzle_orm_1.relations)(exports.shareTokens, function (_a) {
    var one = _a.one;
    return ({
        user: one(exports.users, {
            fields: [exports.shareTokens.userId],
            references: [exports.users.id],
        }),
    });
});
exports.aiAnalysesRelations = (0, drizzle_orm_1.relations)(exports.aiAnalyses, function (_a) {
    var one = _a.one;
    return ({
        item: one(exports.collectionItems, {
            fields: [exports.aiAnalyses.itemId],
            references: [exports.collectionItems.id],
        }),
    });
});
exports.usageTrackingRelations = (0, drizzle_orm_1.relations)(exports.usageTracking, function (_a) {
    var one = _a.one;
    return ({
        user: one(exports.users, {
            fields: [exports.usageTracking.userId],
            references: [exports.users.id],
        }),
    });
});
