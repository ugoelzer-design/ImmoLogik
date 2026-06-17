export type PaginationQuery = {
  page?: string;
  pageSize?: string;
};

export function getPaginationOptions(query: PaginationQuery = {}) {
  if (query.page === undefined && query.pageSize === undefined) {
    return {};
  }

  const page = parsePositiveInteger(query.page, 1);
  const pageSize = Math.min(parsePositiveInteger(query.pageSize, 50), 100);

  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}
