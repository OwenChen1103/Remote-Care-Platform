import { NextRequest } from 'next/server';
import { AiReportListQuerySchema, AI_DISCLAIMER } from '@remote-care/shared';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { errorResponse, paginatedResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return errorResponse('AUTH_REQUIRED', '請先登入');
    }

    const url = new URL(request.url);
    const queryObj: Record<string, string> = {};
    for (const [key, value] of url.searchParams.entries()) {
      queryObj[key] = value;
    }

    const parsed = AiReportListQuerySchema.safeParse(queryObj);
    if (!parsed.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        '查詢參數驗證失敗',
        parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      );
    }

    const { recipient_id, report_type, page, limit } = parsed.data;

    // Ownership check
    const recipient = await prisma.recipient.findFirst({
      where: { id: recipient_id, deleted_at: null },
    });

    if (!recipient) {
      return errorResponse('RESOURCE_NOT_FOUND', '找不到此被照護者');
    }

    if (auth.role === 'caregiver' && recipient.caregiver_id !== auth.userId) {
      return errorResponse('RESOURCE_OWNERSHIP_DENIED', '無權存取此被照護者');
    }

    const where: Record<string, unknown> = { recipient_id };
    if (report_type) where.report_type = report_type;

    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      prisma.aiReport.findMany({
        where,
        orderBy: { generated_at: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          recipient_id: true,
          report_type: true,
          status_label: true,
          summary: true,
          reasons: true,
          suggestions: true,
          model: true,
          input_tokens: true,
          output_tokens: true,
          generated_at: true,
          created_at: true,
        },
      }),
      prisma.aiReport.count({ where }),
    ]);

    const data = reports.map((r) => ({
      ...r,
      disclaimer: AI_DISCLAIMER,
    }));

    return paginatedResponse(data, { page, limit, total });
  } catch {
    return errorResponse('SERVER_ERROR', '伺服器錯誤，請稍後再試');
  }
}
