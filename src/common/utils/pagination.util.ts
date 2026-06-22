import { BadRequestException } from '@nestjs/common';

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

export interface CursorPaginationParams {
  limit?: number;
  cursor?: string;
}

export interface CursorPaginatedResult<T> {
  data: T[];
  meta: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
}

interface CursorItem {
  id: string;
  createdAt: Date;
}

export function normalizeLimit(limit?: number): number {
  const value = limit ?? DEFAULT_PAGE_LIMIT;
  return Math.min(Math.max(value, 1), MAX_PAGE_LIMIT);
}

export function getPaginationArgs(pagination: CursorPaginationParams = {}) {
  const limit = normalizeLimit(pagination.limit);

  return {
    limit,
    take: limit + 1,
    cursorFilter: buildCursorFilter(pagination.cursor),
    orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
  };
}

function encodeCursor(item: CursorItem): string {
  return Buffer.from(`${item.createdAt.toISOString()}|${item.id}`).toString(
    'base64url',
  );
}

function decodeCursor(cursor: string): CursorItem {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const separatorIndex = decoded.indexOf('|');

    if (separatorIndex === -1) {
      throw new Error('Invalid cursor format');
    }

    const createdAt = decoded.slice(0, separatorIndex);
    const id = decoded.slice(separatorIndex + 1);

    if (!createdAt || !id || Number.isNaN(Date.parse(createdAt))) {
      throw new Error('Invalid cursor format');
    }

    return { createdAt: new Date(createdAt), id };
  } catch {
    throw new BadRequestException('Invalid pagination cursor');
  }
}

function buildCursorFilter(cursor?: string) {
  if (!cursor) {
    return undefined;
  }

  const { createdAt, id } = decodeCursor(cursor);

  return {
    OR: [
      { createdAt: { lt: createdAt } },
      {
        AND: [{ createdAt }, { id: { lt: id } }],
      },
    ],
  };
}

export function buildCursorPaginatedResult<T extends CursorItem>(
  items: T[],
  limit: number,
): CursorPaginatedResult<T> {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const lastItem = data.at(-1);

  return {
    data,
    meta: {
      limit,
      hasMore,
      nextCursor: hasMore && lastItem ? encodeCursor(lastItem) : null,
    },
  };
}
