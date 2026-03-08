import { NextRequest } from 'next/server';
import { AiChatCreateSchema, AI_DISCLAIMER } from '@remote-care/shared';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { checkOrigin } from '@/lib/csrf';
import { checkChatRateLimit } from '@/lib/ai-rate-limit';
import { generateChat, buildPromptContext } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    if (!checkOrigin(request)) {
      return errorResponse('AUTH_FORBIDDEN', '不允許的來源');
    }

    const auth = await verifyAuth(request);
    if (!auth) {
      return errorResponse('AUTH_REQUIRED', '請先登入');
    }

    if (auth.role !== 'caregiver') {
      return errorResponse('AUTH_FORBIDDEN', '僅照護者可使用 AI 對話');
    }

    const body: unknown = await request.json();
    const parsed = AiChatCreateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        '輸入資料驗證失敗',
        parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      );
    }

    const { recipient_id, task } = parsed.data;

    // Ownership check
    const recipient = await prisma.recipient.findFirst({
      where: { id: recipient_id, deleted_at: null },
    });

    if (!recipient) {
      return errorResponse('RESOURCE_NOT_FOUND', '找不到此被照護者');
    }

    if (recipient.caregiver_id !== auth.userId) {
      return errorResponse('RESOURCE_OWNERSHIP_DENIED', '無權存取此被照護者');
    }

    // Rate limit check
    const rateCheck = await checkChatRateLimit(auth.userId);
    if (!rateCheck.allowed) {
      return errorResponse('AI_RATE_LIMITED', '已達到 AI 對話上限，請稍後再試');
    }

    // Fetch recent measurements for context
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const measurements = await prisma.measurement.findMany({
      where: {
        recipient_id,
        measured_at: { gte: thirtyDaysAgo },
      },
      orderBy: { measured_at: 'desc' },
      take: 50,
    });

    const ctx = buildPromptContext(recipient, measurements);
    const result = await generateChat(task, ctx);

    return successResponse({
      task,
      result: result.output,
      disclaimer: AI_DISCLAIMER,
      is_fallback: result.is_fallback,
    });
  } catch {
    return errorResponse('SERVER_ERROR', '伺服器錯誤，請稍後再試');
  }
}
