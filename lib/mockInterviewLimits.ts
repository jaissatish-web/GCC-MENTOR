/**
 * Shared by the mock-interview answer route and its screen, so the box stops
 * the user at the same length the server would refuse (audit M05, 2026-09-15).
 * About 500 words — a long spoken interview answer — and it bounds what one
 * feedback call can cost.
 */
export const MOCK_ANSWER_MAX_CHARS = 3000
