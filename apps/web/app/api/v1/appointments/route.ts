import { NextRequest } from 'next/server';
import { AppointmentCreateSchema } from '@remote-care/shared';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { successResponse, errorResponse, paginatedResponse } from '@/lib/api-response';
import { checkOrigin } from '@/lib/csrf';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return errorResponse('AUTH_REQUIRED', '請先登入');
    }

    if (!['caregiver', 'patient', 'admin'].includes(auth.role)) {
      return errorResponse('AUTH_FORBIDDEN', '此角色無權存取行程');
    }

    const url = new URL(request.url);
    const recipientId = url.searchParams.get('recipient_id');
    const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? '20')));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (recipientId) {
      where.recipient_id = recipientId;
    }

    // Ownership check for caregiver
    if (auth.role === 'caregiver') {
      const recipientIds = await prisma.recipient.findMany({
        where: { caregiver_id: auth.userId, deleted_at: null },
        select: { id: true },
      });
      const ids = recipientIds.map((r) => r.id);
      if (recipientId) {
        if (!ids.includes(recipientId)) {
          return errorResponse('RESOURCE_OWNERSHIP_DENIED', '無權存取此被照護者的行程');
        }
      } else {
        where.recipient_id = { in: ids };
      }
    }

    // Ownership check for patient
    if (auth.role === 'patient') {
      const recipientIds = await prisma.recipient.findMany({
        where: { patient_user_id: auth.userId, deleted_at: null },
        select: { id: true },
      });
      const ids = recipientIds.map((r) => r.id);
      if (recipientId) {
        if (!ids.includes(recipientId)) {
          return errorResponse('RESOURCE_OWNERSHIP_DENIED', '無權存取此行程');
        }
      } else {
        where.recipient_id = { in: ids };
      }
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        orderBy: { appointment_date: 'asc' },
        skip,
        take: limit,
        include: { recipient: { select: { id: true, name: true } } },
      }),
      prisma.appointment.count({ where }),
    ]);

    const data = appointments.map((a) => ({
      id: a.id,
      recipient_id: a.recipient_id,
      recipient: a.recipient,
      title: a.title,
      hospital_name: a.hospital_name,
      department: a.department,
      doctor_name: a.doctor_name,
      appointment_date: a.appointment_date.toISOString(),
      note: a.note,
      created_at: a.created_at.toISOString(),
    }));

    return paginatedResponse(data, { page, limit, total });
  } catch {
    return errorResponse('SERVER_ERROR', '伺服器錯誤，請稍後再試');
  }
}

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
      return errorResponse('AUTH_FORBIDDEN', '僅照護者可新增行程');
    }

    const body: unknown = await request.json();
    const parsed = AppointmentCreateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        '輸入資料驗證失敗',
        parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      );
    }

    const data = parsed.data;

    // Ownership check
    const recipient = await prisma.recipient.findFirst({
      where: { id: data.recipient_id, caregiver_id: auth.userId, deleted_at: null },
    });
    if (!recipient) {
      return errorResponse('RESOURCE_NOT_FOUND', '找不到此被照護者');
    }

    const appointment = await prisma.appointment.create({
      data: {
        recipient_id: data.recipient_id,
        title: data.title,
        hospital_name: data.hospital_name ?? null,
        department: data.department ?? null,
        doctor_name: data.doctor_name ?? null,
        appointment_date: new Date(data.appointment_date),
        note: data.note ?? null,
      },
    });

    return successResponse(
      {
        id: appointment.id,
        recipient_id: appointment.recipient_id,
        title: appointment.title,
        hospital_name: appointment.hospital_name,
        department: appointment.department,
        doctor_name: appointment.doctor_name,
        appointment_date: appointment.appointment_date.toISOString(),
        note: appointment.note,
        created_at: appointment.created_at.toISOString(),
      },
      201,
    );
  } catch {
    return errorResponse('SERVER_ERROR', '伺服器錯誤，請稍後再試');
  }
}
