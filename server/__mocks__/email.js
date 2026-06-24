// Manual mock for server/email.js, used by the API tests via vi.mock(). Instead
// of sending, it records every (email, code, purpose) so tests can read the
// verification/reset code that would have been emailed. Import { __codes } to
// inspect; clear it between tests with `__codes.length = 0`.
import { vi } from 'vitest';

export const __codes = [];

export const deliverCode = vi.fn(async (email, code, purpose = 'signup') => {
  __codes.push({ email, code, purpose });
});
