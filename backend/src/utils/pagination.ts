/**
 * Parsed pagination parameters ready for use in DB queries.
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Parse and clamp pagination parameters from a query-string object.
 *
 * @param query - Typically `req.query`, expected to contain optional
 *   `page` and `limit` string values.
 * @returns Normalised `{ page, limit, offset }`.
 *
 * @example
 *   const { page, limit, offset } = parsePaginationParams(req.query);
 *   const { data, count } = await supabaseAdmin
 *     .from('contacts')
 *     .select('*', { count: 'exact' })
 *     .eq('tenant_id', tenantId)
 *     .range(offset, offset + limit - 1);
 */
export function parsePaginationParams(
  query: Record<string, unknown>,
): PaginationParams {
  let page = Number(query.page);
  let limit = Number(query.limit);

  if (!Number.isFinite(page) || page < 1) {
    page = DEFAULT_PAGE;
  }

  if (!Number.isFinite(limit) || limit < 1) {
    limit = DEFAULT_LIMIT;
  }

  if (limit > MAX_LIMIT) {
    limit = MAX_LIMIT;
  }

  page = Math.floor(page);
  limit = Math.floor(limit);

  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Build the pagination metadata block for an API response.
 */
export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
) {
  return {
    page,
    limit,
    total,
    total_pages: Math.ceil(total / limit) || 1,
  };
}
