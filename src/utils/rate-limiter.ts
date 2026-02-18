import { RATE_LIMIT_DELAY_MS } from "../config/constants.js";

export class RateLimiter {
  private lastRequestTime = 0;
  private delayMs: number;

  constructor(delayMs: number = RATE_LIMIT_DELAY_MS) {
    this.delayMs = delayMs;
  }

  async wait(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;

    if (elapsed < this.delayMs) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.delayMs - elapsed)
      );
    }

    this.lastRequestTime = Date.now();
  }
}

export const globalRateLimiter = new RateLimiter();
