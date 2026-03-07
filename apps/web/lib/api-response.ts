import { NextResponse } from 'next/server';
import type { ErrorCode } from '@remote-care/shared';
import { ERROR_STATUS_MAP } from '@remote-care/shared';

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(code: ErrorCode, message: string, details?: unknown[]) {
  const status = ERROR_STATUS_MAP[code] ?? 500;
  return NextResponse.json(
    { success: false, error: { code, message, details: details ?? [] } },
    { status },
  );
}

export function paginatedResponse<T>(
  data: T[],
  meta: { page: number; limit: number; total: number },
) {
  return NextResponse.json({ success: true, data, meta });
}
