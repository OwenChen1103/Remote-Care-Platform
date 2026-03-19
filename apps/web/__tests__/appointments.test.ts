import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockPrisma = vi.hoisted(() => ({
  recipient: { findMany: vi.fn(), findFirst: vi.fn() },
  appointment: {
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

const mockVerifyAuth = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth', () => ({
  verifyAuth: mockVerifyAuth,
  signJwt: vi.fn(() => 'mock-token'),
}));

vi.mock('@/lib/csrf', () => ({
  checkOrigin: () => true,
}));

// ---------------------------------------------------------------------------
// GET /api/v1/appointments
// ---------------------------------------------------------------------------
describe('GET /api/v1/appointments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createGetRequest() {
    return new NextRequest(
      new URL('http://localhost:3000/api/v1/appointments'),
      { method: 'GET' },
    );
  }

  it('should return 200 for caregiver listing appointments', async () => {
    mockVerifyAuth.mockResolvedValue({ userId: 'user-1', role: 'caregiver' });
    mockPrisma.recipient.findMany.mockResolvedValue([
      { id: 'recip-1' },
    ]);

    const mockAppointment = {
      id: 'appt-1',
      recipient_id: 'recip-1',
      recipient: { id: 'recip-1', name: 'Test Recipient' },
      title: 'Check-up',
      hospital_name: 'Hospital A',
      department: 'Cardiology',
      doctor_name: 'Dr. Wang',
      appointment_date: new Date('2026-04-01T09:00:00Z'),
      note: null,
      created_at: new Date('2026-03-19T10:00:00Z'),
    };

    mockPrisma.appointment.findMany.mockResolvedValue([mockAppointment]);
    mockPrisma.appointment.count.mockResolvedValue(1);

    const { GET } = await import('../app/api/v1/appointments/route');
    const response = await GET(createGetRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe('appt-1');
  });

  it('should return 401 for unauthenticated requests', async () => {
    mockVerifyAuth.mockResolvedValue(null);

    const { GET } = await import('../app/api/v1/appointments/route');
    const response = await GET(createGetRequest());
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error.code).toBe('AUTH_REQUIRED');
  });

  it('should return 403 for provider role', async () => {
    mockVerifyAuth.mockResolvedValue({ userId: 'prov-1', role: 'provider' });

    const { GET } = await import('../app/api/v1/appointments/route');
    const response = await GET(createGetRequest());
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error.code).toBe('AUTH_FORBIDDEN');
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/appointments
// ---------------------------------------------------------------------------
describe('POST /api/v1/appointments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createPostRequest(body: Record<string, unknown>) {
    return new NextRequest(
      new URL('http://localhost:3000/api/v1/appointments'),
      {
        method: 'POST',
        headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
  }

  const validBody = {
    recipient_id: '00000000-0000-0000-0000-000000000001',
    title: 'Check-up',
    appointment_date: '2026-04-01T09:00:00Z',
  };

  it('should return 201 when caregiver creates appointment', async () => {
    mockVerifyAuth.mockResolvedValue({ userId: 'user-1', role: 'caregiver' });
    mockPrisma.recipient.findFirst.mockResolvedValue({ id: validBody.recipient_id });

    const mockCreated = {
      id: 'appt-new',
      recipient_id: validBody.recipient_id,
      title: 'Check-up',
      hospital_name: null,
      department: null,
      doctor_name: null,
      appointment_date: new Date('2026-04-01T09:00:00Z'),
      note: null,
      created_at: new Date('2026-03-19T12:00:00Z'),
    };
    mockPrisma.appointment.create.mockResolvedValue(mockCreated);

    const { POST } = await import('../app/api/v1/appointments/route');
    const response = await POST(createPostRequest(validBody));
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.id).toBe('appt-new');
  });

  it('should return 403 for non-caregiver', async () => {
    mockVerifyAuth.mockResolvedValue({ userId: 'prov-1', role: 'provider' });

    const { POST } = await import('../app/api/v1/appointments/route');
    const response = await POST(createPostRequest(validBody));
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error.code).toBe('AUTH_FORBIDDEN');
  });

  it('should return 400 for invalid body', async () => {
    mockVerifyAuth.mockResolvedValue({ userId: 'user-1', role: 'caregiver' });

    const { POST } = await import('../app/api/v1/appointments/route');
    const response = await POST(createPostRequest({ title: '' }));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// PUT /api/v1/appointments/[id]
// ---------------------------------------------------------------------------
describe('PUT /api/v1/appointments/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createPutRequest(body: Record<string, unknown>) {
    return new NextRequest(
      new URL('http://localhost:3000/api/v1/appointments/appt-1'),
      {
        method: 'PUT',
        headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
  }

  it('should return 200 when caregiver updates appointment', async () => {
    mockVerifyAuth.mockResolvedValue({ userId: 'user-1', role: 'caregiver' });

    mockPrisma.appointment.findUnique.mockResolvedValue({
      id: 'appt-1',
      recipient: { id: 'recip-1', caregiver_id: 'user-1', deleted_at: null },
    });

    const mockUpdated = {
      id: 'appt-1',
      recipient_id: 'recip-1',
      title: 'Updated Title',
      hospital_name: null,
      department: null,
      doctor_name: null,
      appointment_date: new Date('2026-04-01T09:00:00Z'),
      note: null,
      created_at: new Date('2026-03-19T10:00:00Z'),
    };
    mockPrisma.appointment.update.mockResolvedValue(mockUpdated);

    const { PUT } = await import('../app/api/v1/appointments/[id]/route');
    const response = await PUT(createPutRequest({ title: 'Updated Title' }), {
      params: Promise.resolve({ id: 'appt-1' }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.title).toBe('Updated Title');
  });

  it('should return 403 for non-caregiver', async () => {
    mockVerifyAuth.mockResolvedValue({ userId: 'prov-1', role: 'provider' });

    const { PUT } = await import('../app/api/v1/appointments/[id]/route');
    const response = await PUT(createPutRequest({ title: 'Nope' }), {
      params: Promise.resolve({ id: 'appt-1' }),
    });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error.code).toBe('AUTH_FORBIDDEN');
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/appointments/[id]
// ---------------------------------------------------------------------------
describe('DELETE /api/v1/appointments/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createDeleteRequest() {
    return new NextRequest(
      new URL('http://localhost:3000/api/v1/appointments/appt-1'),
      {
        method: 'DELETE',
        headers: { origin: 'http://localhost:3000' },
      },
    );
  }

  it('should return 200 when caregiver deletes appointment', async () => {
    mockVerifyAuth.mockResolvedValue({ userId: 'user-1', role: 'caregiver' });

    mockPrisma.appointment.findUnique.mockResolvedValue({
      id: 'appt-1',
      recipient: { id: 'recip-1', caregiver_id: 'user-1', deleted_at: null },
    });
    mockPrisma.appointment.delete.mockResolvedValue({ id: 'appt-1' });

    const { DELETE } = await import('../app/api/v1/appointments/[id]/route');
    const response = await DELETE(createDeleteRequest(), {
      params: Promise.resolve({ id: 'appt-1' }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.message).toBe('行程已刪除');
  });

  it('should return 403 for non-caregiver', async () => {
    mockVerifyAuth.mockResolvedValue({ userId: 'prov-1', role: 'provider' });

    const { DELETE } = await import('../app/api/v1/appointments/[id]/route');
    const response = await DELETE(createDeleteRequest(), {
      params: Promise.resolve({ id: 'appt-1' }),
    });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error.code).toBe('AUTH_FORBIDDEN');
  });
});
