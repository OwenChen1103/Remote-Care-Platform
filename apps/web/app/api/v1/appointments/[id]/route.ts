import { NextRequest } from 'next/server';
import { AppointmentUpdateSchema } from '@remote-care/shared';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { checkOrigin } from '@/lib/csrf';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!checkOrigin(request)) {
      return errorResponse('AUTH_FORBIDDEN', '不允許的來源');
    }

    const auth = await verifyAuth(request);
    if (!auth) {
      return errorResponse('AUTH_REQUIRED', '請先登入');
    }

    if (auth.role !== 'caregiver') {
      return errorResponse('AUTH_FORBIDDEN', '僅照護者可更新行程');
    }

    const { id } = await params;

    const body: unknown = await request.json();
    const parsed = AppointmentUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        '輸入資料驗證失敗',
        parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      );
    }

    const data = parsed.data;

    // Ownership check: appointment's recipient must belong to the caregiver
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { recipient: { select: { id: true, caregiver_id: true, deleted_at: true } } },
    });

    if (!appointment) {
      return errorResponse('RESOURCE_NOT_FOUND', '找不到此行程');
    }

    if (
      !appointment.recipient ||
      appointment.recipient.caregiver_id !== auth.userId ||
      appointment.recipient.deleted_at !== null
    ) {
      return errorResponse('RESOURCE_OWNERSHIP_DENIED', '無權更新此行程');
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.hospital_name !== undefined && { hospital_name: data.hospital_name }),
        ...(data.department !== undefined && { department: data.department }),
        ...(data.doctor_name !== undefined && { doctor_name: data.doctor_name }),
        ...(data.appointment_date !== undefined && {
          appointment_date: new Date(data.appointment_date),
        }),
        ...(data.note !== undefined && { note: data.note }),
      },
    });

    return successResponse({
      id: updated.id,
      recipient_id: updated.recipient_id,
      title: updated.title,
      hospital_name: updated.hospital_name,
      department: updated.department,
      doctor_name: updated.doctor_name,
      appointment_date: updated.appointment_date.toISOString(),
      note: updated.note,
      created_at: updated.created_at.toISOString(),
    });
  } catch {
    return errorResponse('SERVER_ERROR', '伺服器錯誤，請稍後再試');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!checkOrigin(request)) {
      return errorResponse('AUTH_FORBIDDEN', '不允許的來源');
    }

    const auth = await verifyAuth(request);
    if (!auth) {
      return errorResponse('AUTH_REQUIRED', '請先登入');
    }

    if (auth.role !== 'caregiver') {
      return errorResponse('AUTH_FORBIDDEN', '僅照護者可刪除行程');
    }

    const { id } = await params;

    // Ownership check: appointment's recipient must belong to the caregiver
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { recipient: { select: { id: true, caregiver_id: true, deleted_at: true } } },
    });

    if (!appointment) {
      return errorResponse('RESOURCE_NOT_FOUND', '找不到此行程');
    }

    if (
      !appointment.recipient ||
      appointment.recipient.caregiver_id !== auth.userId ||
      appointment.recipient.deleted_at !== null
    ) {
      return errorResponse('RESOURCE_OWNERSHIP_DENIED', '無權刪除此行程');
    }

    await prisma.appointment.delete({ where: { id } });

    return successResponse({ message: '行程已刪除' });
  } catch {
    return errorResponse('SERVER_ERROR', '伺服器錯誤，請稍後再試');
  }
}
