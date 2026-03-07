import { ERROR_CODES } from '@remote-care/shared';

describe('App smoke test', () => {
  it('should have shared package available', () => {
    expect(ERROR_CODES.AUTH_REQUIRED).toBe('AUTH_REQUIRED');
    expect(ERROR_CODES.SERVER_ERROR).toBe('SERVER_ERROR');
  });
});
