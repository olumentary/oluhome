import {
  eq,
  and,
  sql,
  desc,
  count,
  sum,
  avg,
  max,
  isNotNull,
} from 'drizzle-orm';
import { db } from '@/db';
import {
  collectionItems,
  valuations,
  acquisitions,
  vendors,
  itemPhotos,
} from '@/db/schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CollectionSummary {
  totalItems: number;
  totalEstimatedValue: number;
  totalAcquisitionCost: number;
  appreciation: number;
}

export interface ValueByRoom {
  room: string;
  totalValue: number;
  itemCount: number;
}

export interface ValueOverTimeEntry {
  period: string;
  estimated: number;
  insured: number;
  cost: number;
}

export interface CoverageGap {
  itemId: string;
  title: string;
  estimatedValue: number;
  insuredValue: number;
  lastInsuredDate: string | null;
  gapAmount: number;
  status: 'underinsured' | 'uninsured' | 'stale';
}

export interface CompositionEntry {
  value: string;
  count: number;
  totalValue: number;
}

export interface TopItem {
  id: string;
  title: string;
  room: string | null;
  value: number;
}

export interface SpendingEntry {
  period: string;
  totalSpend: number;
  itemCount: number;
}

export interface VendorAnalysisEntry {
  vendorId: string;
  vendorName: string;
  spend: number;
  itemCount: number;
  avgDiscount: number;
  lastPurchase: string | null;
}

// ---------------------------------------------------------------------------
// getCollectionSummary
// ---------------------------------------------------------------------------

export async function getCollectionSummary(
  userId: string,
): Promise<CollectionSummary> {
  const [itemCountResult, valuationResult, costResult] = await Promise.all([
    // Total items
    db
      .select({ total: count() })
      .from(collectionItems)
      .where(eq(collectionItems.userId, userId)),

    // Total estimated value — use latest valuation per item via DISTINCT ON
    db.execute<{ total_value: string | null }>(sql`
      SELECT COALESCE(SUM(v.val), 0) AS total_value
      FROM (
        SELECT DISTINCT ON (sub.item_id)
          COALESCE(sub.value_single, (sub.value_low + sub.value_high) / 2) AS val
        FROM ${valuations} sub
        JOIN ${collectionItems} ci ON ci.id = sub.item_id
        WHERE ci.user_id = ${userId}
        ORDER BY sub.item_id, sub.valuation_date DESC NULLS LAST, sub.created_at DESC
      ) v
    `),

    // Total acquisition cost
    db
      .select({
        total: sql<string>`COALESCE(SUM(${acquisitions.totalCost}), 0)`,
      })
      .from(acquisitions)
      .innerJoin(collectionItems, eq(acquisitions.itemId, collectionItems.id))
      .where(eq(collectionItems.userId, userId)),
  ]);

  const totalItems = itemCountResult[0]?.total ?? 0;
  const totalEstimatedValue = parseFloat(
    valuationResult.rows[0]?.total_value ?? '0',
  );
  const totalAcquisitionCost = parseFloat(costResult[0]?.total ?? '0');
  const appreciation =
    totalAcquisitionCost > 0
      ? ((totalEstimatedValue - totalAcquisitionCost) / totalAcquisitionCost) *
        100
      : 0;

  return { totalItems, totalEstimatedValue, totalAcquisitionCost, appreciation };
}

// ---------------------------------------------------------------------------
// getValueByRoom
// ---------------------------------------------------------------------------

export async function getValueByRoom(userId: string): Promise<ValueByRoom[]> {
  const rows = await db.execute<{
    room: string;
    total_value: string;
    item_count: string;
  }>(sql`
    SELECT
      ci.room,
      COUNT(DISTINCT ci.id)::text AS item_count,
      COALESCE(SUM(v.val), 0)::text AS total_value
    FROM ${collectionItems} ci
    LEFT JOIN LATERAL (
      SELECT DISTINCT ON (sub.item_id)
        COALESCE(sub.value_single, (sub.value_low + sub.value_high) / 2) AS val
      FROM ${valuations} sub
      WHERE sub.item_id = ci.id
      ORDER BY sub.item_id, sub.valuation_date DESC NULLS LAST, sub.created_at DESC
    ) v ON TRUE
    WHERE ci.user_id = ${userId} AND ci.room IS NOT NULL
    GROUP BY ci.room
    ORDER BY COALESCE(SUM(v.val), 0) DESC
  `);

  return rows.rows.map((r) => ({
    room: r.room,
    totalValue: parseFloat(r.total_value),
    itemCount: parseInt(r.item_count, 10),
  }));
}

// ---------------------------------------------------------------------------
// getValueOverTime
// ---------------------------------------------------------------------------

export async function getValueOverTime(
  userId: string,
  granularity: 'monthly' | 'quarterly' | 'yearly' = 'monthly',
): Promise<ValueOverTimeEntry[]> {
  const truncExpr =
    granularity === 'yearly'
      ? sql`TO_CHAR(v.valuation_date::date, 'YYYY')`
      : granularity === 'quarterly'
        ? sql`TO_CHAR(v.valuation_date::date, 'YYYY-"Q"') || CEIL(EXTRACT(QUARTER FROM v.valuation_date::date))`
        : sql`TO_CHAR(v.valuation_date::date, 'YYYY-MM')`;

  // For quarterly, we need a different approach
  const periodExpr =
    granularity === 'yearly'
      ? sql`TO_CHAR(v.valuation_date::date, 'YYYY')`
      : granularity === 'quarterly'
        ? sql`TO_CHAR(v.valuation_date::date, 'YYYY') || '-Q' || EXTRACT(QUARTER FROM v.valuation_date::date)::int`
        : sql`TO_CHAR(v.valuation_date::date, 'YYYY-MM')`;

  const rows = await db.execute<{
    period: string;
    estimated: string;
    insured: string;
  }>(sql`
    SELECT
      ${periodExpr} AS period,
      COALESCE(SUM(CASE WHEN v.valuation_type != 'insured'
        THEN COALESCE(v.value_single, (v.value_low + v.value_high) / 2) ELSE 0 END), 0)::text AS estimated,
      COALESCE(SUM(CASE WHEN v.valuation_type = 'insured'
        THEN COALESCE(v.value_single, (v.value_low + v.value_high) / 2) ELSE 0 END), 0)::text AS insured
    FROM ${valuations} v
    JOIN ${collectionItems} ci ON ci.id = v.item_id
    WHERE ci.user_id = ${userId} AND v.valuation_date IS NOT NULL
    GROUP BY ${periodExpr}
    ORDER BY ${periodExpr}
  `);

  // Get acquisition cost by period
  const costRows = await db.execute<{
    period: string;
    cost: string;
  }>(sql`
    SELECT
      ${granularity === 'yearly'
        ? sql`TO_CHAR(a.acquisition_date::date, 'YYYY')`
        : granularity === 'quarterly'
          ? sql`TO_CHAR(a.acquisition_date::date, 'YYYY') || '-Q' || EXTRACT(QUARTER FROM a.acquisition_date::date)::int`
          : sql`TO_CHAR(a.acquisition_date::date, 'YYYY-MM')`} AS period,
      COALESCE(SUM(a.total_cost), 0)::text AS cost
    FROM ${acquisitions} a
    JOIN ${collectionItems} ci ON ci.id = a.item_id
    WHERE ci.user_id = ${userId} AND a.acquisition_date IS NOT NULL
    GROUP BY 1
    ORDER BY 1
  `);

  const costMap = new Map(costRows.rows.map((r) => [r.period, parseFloat(r.cost)]));

  // Merge
  const allPeriods = new Set([
    ...rows.rows.map((r) => r.period),
    ...costRows.rows.map((r) => r.period),
  ]);

  const valMap = new Map(
    rows.rows.map((r) => [
      r.period,
      { estimated: parseFloat(r.estimated), insured: parseFloat(r.insured) },
    ]),
  );

  return Array.from(allPeriods)
    .sort()
    .map((period) => ({
      period,
      estimated: valMap.get(period)?.estimated ?? 0,
      insured: valMap.get(period)?.insured ?? 0,
      cost: costMap.get(period) ?? 0,
    }));
}

// ---------------------------------------------------------------------------
// getCoverageGaps
// ---------------------------------------------------------------------------

export async function getCoverageGaps(userId: string): Promise<CoverageGap[]> {
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
  const cutoff = threeYearsAgo.toISOString().split('T')[0];

  const rows = await db.execute<{
    item_id: string;
    title: string;
    estimated_value: string | null;
    insured_value: string | null;
    last_insured_date: string | null;
  }>(sql`
    SELECT
      ci.id AS item_id,
      ci.title,
      lv.val AS estimated_value,
      iv.val AS insured_value,
      iv.valuation_date AS last_insured_date
    FROM ${collectionItems} ci
    LEFT JOIN LATERAL (
      SELECT DISTINCT ON (sub.item_id)
        COALESCE(sub.value_single, (sub.value_low + sub.value_high) / 2) AS val
      FROM ${valuations} sub
      WHERE sub.item_id = ci.id
      ORDER BY sub.item_id, sub.valuation_date DESC NULLS LAST, sub.created_at DESC
    ) lv ON TRUE
    LEFT JOIN LATERAL (
      SELECT DISTINCT ON (sub.item_id)
        COALESCE(sub.value_single, (sub.value_low + sub.value_high) / 2) AS val,
        sub.valuation_date
      FROM ${valuations} sub
      WHERE sub.item_id = ci.id AND sub.valuation_type = 'insured'
      ORDER BY sub.item_id, sub.valuation_date DESC NULLS LAST, sub.created_at DESC
    ) iv ON TRUE
    WHERE ci.user_id = ${userId}
      AND lv.val IS NOT NULL
      AND lv.val > 0
      AND (
        iv.val IS NULL
        OR iv.val < lv.val
        OR iv.valuation_date IS NULL
        OR iv.valuation_date < ${cutoff}
      )
    ORDER BY lv.val DESC
  `);

  return rows.rows.map((r) => {
    const estimated = parseFloat(r.estimated_value ?? '0');
    const insured = parseFloat(r.insured_value ?? '0');
    const gap = estimated - insured;

    let status: 'underinsured' | 'uninsured' | 'stale';
    if (!r.insured_value || insured === 0) {
      status = 'uninsured';
    } else if (
      r.last_insured_date &&
      r.last_insured_date < cutoff
    ) {
      status = 'stale';
    } else {
      status = 'underinsured';
    }

    return {
      itemId: r.item_id,
      title: r.title,
      estimatedValue: estimated,
      insuredValue: insured,
      lastInsuredDate: r.last_insured_date,
      gapAmount: gap,
      status,
    };
  });
}

// ---------------------------------------------------------------------------
// getCompositionByField
// ---------------------------------------------------------------------------

export async function getCompositionByField(
  userId: string,
  field: 'type' | 'period' | 'room' | 'condition',
): Promise<CompositionEntry[]> {
  const fieldCol =
    field === 'type'
      ? sql`cit.name`
      : field === 'period'
        ? sql`ci.period`
        : field === 'room'
          ? sql`ci.room`
          : sql`ci.condition`;

  const joinType = field === 'type' ? true : false;

  const rows = await db.execute<{
    value: string;
    count: string;
    total_value: string;
  }>(sql`
    SELECT
      ${fieldCol} AS value,
      COUNT(DISTINCT ci.id)::text AS count,
      COALESCE(SUM(lv.val), 0)::text AS total_value
    FROM ${collectionItems} ci
    ${joinType ? sql`JOIN collection_item_types cit ON cit.id = ci.item_type_id` : sql``}
    LEFT JOIN LATERAL (
      SELECT DISTINCT ON (sub.item_id)
        COALESCE(sub.value_single, (sub.value_low + sub.value_high) / 2) AS val
      FROM ${valuations} sub
      WHERE sub.item_id = ci.id
      ORDER BY sub.item_id, sub.valuation_date DESC NULLS LAST, sub.created_at DESC
    ) lv ON TRUE
    WHERE ci.user_id = ${userId} AND ${fieldCol} IS NOT NULL
    GROUP BY ${fieldCol}
    ORDER BY COALESCE(SUM(lv.val), 0) DESC
  `);

  return rows.rows.map((r) => ({
    value: r.value,
    count: parseInt(r.count, 10),
    totalValue: parseFloat(r.total_value),
  }));
}

// ---------------------------------------------------------------------------
// getTopItemsByValue
// ---------------------------------------------------------------------------

export async function getTopItemsByValue(
  userId: string,
  limit = 10,
): Promise<TopItem[]> {
  const rows = await db.execute<{
    id: string;
    title: string;
    room: string | null;
    value: string;
  }>(sql`
    SELECT
      ci.id,
      ci.title,
      ci.room,
      lv.val::text AS value
    FROM ${collectionItems} ci
    JOIN LATERAL (
      SELECT DISTINCT ON (sub.item_id)
        COALESCE(sub.value_single, (sub.value_low + sub.value_high) / 2) AS val
      FROM ${valuations} sub
      WHERE sub.item_id = ci.id
      ORDER BY sub.item_id, sub.valuation_date DESC NULLS LAST, sub.created_at DESC
    ) lv ON TRUE
    WHERE ci.user_id = ${userId} AND lv.val > 0
    ORDER BY lv.val DESC
    LIMIT ${limit}
  `);

  return rows.rows.map((r) => ({
    id: r.id,
    title: r.title,
    room: r.room,
    value: parseFloat(r.value),
  }));
}

// ---------------------------------------------------------------------------
// getSpendingOverTime
// ---------------------------------------------------------------------------

export async function getSpendingOverTime(
  userId: string,
): Promise<SpendingEntry[]> {
  const rows = await db.execute<{
    period: string;
    total_spend: string;
    item_count: string;
  }>(sql`
    SELECT
      TO_CHAR(a.acquisition_date::date, 'YYYY-MM') AS period,
      COALESCE(SUM(a.total_cost), 0)::text AS total_spend,
      COUNT(DISTINCT a.item_id)::text AS item_count
    FROM ${acquisitions} a
    JOIN ${collectionItems} ci ON ci.id = a.item_id
    WHERE ci.user_id = ${userId} AND a.acquisition_date IS NOT NULL
    GROUP BY 1
    ORDER BY 1
  `);

  return rows.rows.map((r) => ({
    period: r.period,
    totalSpend: parseFloat(r.total_spend),
    itemCount: parseInt(r.item_count, 10),
  }));
}

// ---------------------------------------------------------------------------
// getVendorAnalysis
// ---------------------------------------------------------------------------

export async function getVendorAnalysis(
  userId: string,
): Promise<VendorAnalysisEntry[]> {
  const rows = await db.execute<{
    vendor_id: string;
    vendor_name: string;
    spend: string;
    item_count: string;
    avg_discount: string;
    last_purchase: string | null;
  }>(sql`
    SELECT
      v.id AS vendor_id,
      COALESCE(v.business_name, v.name) AS vendor_name,
      COALESCE(SUM(a.total_cost), 0)::text AS spend,
      COUNT(DISTINCT a.item_id)::text AS item_count,
      COALESCE(
        AVG(
          CASE WHEN a.listed_price > 0 AND a.purchase_price > 0
            THEN ((a.listed_price - a.purchase_price) / a.listed_price * 100)
          END
        ), 0
      )::text AS avg_discount,
      MAX(a.acquisition_date) AS last_purchase
    FROM ${vendors} v
    JOIN ${acquisitions} a ON a.vendor_id = v.id
    JOIN ${collectionItems} ci ON ci.id = a.item_id
    WHERE v.user_id = ${userId}
    GROUP BY v.id, v.name, v.business_name
    ORDER BY COALESCE(SUM(a.total_cost), 0) DESC
  `);

  return rows.rows.map((r) => ({
    vendorId: r.vendor_id,
    vendorName: r.vendor_name,
    spend: parseFloat(r.spend),
    itemCount: parseInt(r.item_count, 10),
    avgDiscount: parseFloat(r.avg_discount),
    lastPurchase: r.last_purchase,
  }));
}
