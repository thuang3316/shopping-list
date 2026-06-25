// Manual mock for server/email.js, used by the API tests via vi.mock(). Instead
// of sending, it records every (email, code, purpose) so tests can read the
// verification/reset code that would have been emailed. Import { __codes } to
// inspect; clear it between tests with `__codes.length = 0`.
import { vi } from 'vitest';

export const __codes = [];

export const deliverCode = vi.fn(async (email, code, purpose = 'signup') => {
  __codes.push({ email, code, purpose });
});

// Captures feedback that would have been emailed to the owner. Tests assert against
// this instead of sending. Clear it between tests with `__feedback.length = 0`.
export const __feedback = [];

export const deliverFeedback = vi.fn(async (payload) => {
  __feedback.push(payload);
});
