export type TimerStatus = "idle" | "running" | "paused" | "completed";

export class SessionTimer {
  private totalMs: number;
  private remainingMs: number;
  private startedAt = 0;
  status: TimerStatus = "idle";

  constructor(seconds: number) {
    this.totalMs = seconds * 1000;
    this.remainingMs = this.totalMs;
  }

  reset(seconds = this.totalMs / 1000) {
    this.totalMs = seconds * 1000;
    this.remainingMs = this.totalMs;
    this.startedAt = 0;
    this.status = "idle";
  }

  start(now: number) {
    if (this.status === "running") return;
    if (this.status === "completed") this.reset();
    this.startedAt = now;
    this.status = "running";
  }

  pause(now: number) {
    if (this.status !== "running") return;
    this.remainingMs = this.snapshot(now).remainingSeconds * 1000;
    this.status = this.remainingMs > 0 ? "paused" : "completed";
  }

  snapshot(now: number) {
    const remaining =
      this.status === "running"
        ? Math.max(0, this.remainingMs - Math.max(0, now - this.startedAt))
        : this.remainingMs;
    if (this.status === "running" && remaining === 0) {
      this.remainingMs = 0;
      this.status = "completed";
    }
    return {
      status: this.status,
      remainingSeconds: remaining / 1000,
      elapsedSeconds: (this.totalMs - remaining) / 1000,
      progress: (this.totalMs - remaining) / this.totalMs,
    };
  }
}
