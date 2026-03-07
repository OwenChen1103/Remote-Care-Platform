import { NextRequest } from 'next/server';
import { LoginSchema } from '@remote-care/shared';
import { errorResponse } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  const body: unknown = await request.json();

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      '輸入資料驗證失敗',
      parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    );
  }

  // Placeholder: will be implemented in Slice 1
  return errorResponse('SERVICE_UNAVAILABLE', '登入功能尚未實作');
}
