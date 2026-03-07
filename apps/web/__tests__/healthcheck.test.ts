import { describe, it, expect } from 'vitest';
import { GET } from '../app/api/v1/healthcheck/route';

describe('GET /api/v1/healthcheck', () => {
  it('should return success with ok status', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ok');
    expect(body.data.version).toBe('0.1.0');
    expect(body.data.timestamp).toBeDefined();
  });
});
