import { sql } from 'drizzle-orm';
import { db } from '@/db';

export interface SearchResult {
  id: string;
  title: string;
  room: string | null;
  period: string | null;
  typeName: string;
  thumbnailKey: string | null;
  snippet: string;
  rank: number;
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
}

/**
 * Full-text search over collection_items using the search_vector tsvector column.
 * Returns results ranked by ts_rank with highlighted snippets via ts_headline.
 */
export async function fullTextSearch(
  userId: string,
  query: string,
  limit = 24,
  offset = 0,
): Promise<SearchResponse> {
  if (!query.trim()) return { results: [], totalCount: 0 };

  const rows = await db.execute(sql`
    SELECT
      ci.id,
      ci.title,
      ci.room,
      ci.period,
      cit.name AS type_name,
      ip.thumbnail_key,
      ts_headline(
        'english',
        coalesce(ci.title, '') || ' ' ||
        coalesce(ci.description, '') || ' ' ||
        coalesce(ci.period, '') || ' ' ||
        coalesce(ci.style, '') || ' ' ||
        coalesce(ci.maker_attribution, '') || ' ' ||
        coalesce(ci.provenance_narrative, '') || ' ' ||
        coalesce(ci.notes, ''),
        plainto_tsquery('english', ${query}),
        'StartSel=<mark>, StopSel=</mark>, MaxFragments=2, MaxWords=30, MinWords=10'
      ) AS snippet,
      ts_rank(ci.search_vector, plainto_tsquery('english', ${query})) AS rank,
      count(*) OVER() AS total_count
    FROM collection_items ci
    INNER JOIN collection_item_types cit ON ci.item_type_id = cit.id
    LEFT JOIN item_photos ip ON ip.item_id = ci.id AND ip.is_primary = true
    WHERE ci.user_id = ${userId}
      AND ci.search_vector @@ plainto_tsquery('english', ${query})
    ORDER BY rank DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `);

  const resultRows = rows.rows as Array<Record<string, unknown>>;

  const results: SearchResult[] = resultRows.map((row) => ({
    id: row.id as string,
    title: row.title as string,
    room: (row.room as string) ?? null,
    period: (row.period as string) ?? null,
    typeName: row.type_name as string,
    thumbnailKey: (row.thumbnail_key as string) ?? null,
    snippet: row.snippet as string,
    rank: Number(row.rank),
  }));

  const totalCount = resultRows[0]?.total_count ?? 0;

  return { results, totalCount: Number(totalCount) };
}
