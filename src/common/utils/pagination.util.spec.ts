import { BadRequestException } from '@nestjs/common';
import {
  buildCursorPaginatedResult,
  getPaginationArgs,
  normalizeLimit,
} from './pagination.util';

function encodeCursor(item: { id: string; createdAt: Date }): string {
  return Buffer.from(`${item.createdAt.toISOString()}|${item.id}`).toString(
    'base64url',
  );
}

describe('pagination.util', () => {
  const items = [
    { id: 'c', createdAt: new Date('2026-06-20T12:00:00.000Z') },
    { id: 'b', createdAt: new Date('2026-06-19T12:00:00.000Z') },
    { id: 'a', createdAt: new Date('2026-06-18T12:00:00.000Z') },
  ];

  it('normalizes limit bounds', () => {
    expect(normalizeLimit()).toBe(20);
    expect(normalizeLimit(200)).toBe(100);
    expect(normalizeLimit(0)).toBe(1);
  });

  it('builds pagination query args', () => {
    const cursor = encodeCursor(items[0]);
    const args = getPaginationArgs({ limit: 10, cursor });

    expect(args.limit).toBe(10);
    expect(args.take).toBe(11);
    expect(args.cursorFilter).toBeDefined();
  });

  it('rejects invalid cursors via pagination args', () => {
    expect(() => getPaginationArgs({ cursor: 'bad' })).toThrow(
      BadRequestException,
    );
  });

  it('builds cursor pagination metadata', () => {
    const result = buildCursorPaginatedResult(items, 2);

    expect(result.data).toHaveLength(2);
    expect(result.meta.hasMore).toBe(true);
    expect(result.meta.nextCursor).toBe(encodeCursor(items[1]));
  });
});
