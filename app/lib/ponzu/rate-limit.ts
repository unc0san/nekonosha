import "server-only";
import { PonzuError } from "./errors";

export class CallLimiter {
  private start = 0;
  private count = 0;
  private last = -Infinity;
  private active = false;
  constructor(private readonly clock: () => number = Date.now) {}
  acquire(): () => void {
    const now = this.clock();
    if (this.active) throw new PonzuError("rate_limited", 3);
    if (now - this.last < 3000) throw new PonzuError("rate_limited", Math.max(1, Math.ceil((3000 - now + this.last) / 1000)));
    if (now - this.start >= 60000) { this.start = now; this.count = 0; }
    if (this.count >= 6) throw new PonzuError("rate_limited", Math.max(1, Math.ceil((60000 - now + this.start) / 1000)));
    this.count++;
    this.last = now;
    this.active = true;
    let released = false;
    return () => { if (!released) { this.active = false; released = true; } };
  }
}
// Process-wide and intentionally independent of spoofable IP headers or client cookies.
// Restarts reset this limiter; multiple instances need a shared production rate-limit store.
const state = globalThis as typeof globalThis & { __nekonoshaAILimiter?: CallLimiter };
export const callLimiter = state.__nekonoshaAILimiter ??= new CallLimiter();
