import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MixedModeScheduler } from './MixedModeScheduler';

describe('MixedModeScheduler', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('coalesces a burst of requests into one fire per window', () => {
    const s = new MixedModeScheduler(50);
    const fire = vi.fn();
    s.request(fire);
    s.request(fire);
    s.request(fire);
    expect(fire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    expect(fire).toHaveBeenCalledTimes(1);
    // A new window fires again.
    s.request(fire);
    vi.advanceTimersByTime(50);
    expect(fire).toHaveBeenCalledTimes(2);
  });

  it('accepts each result once, in order', () => {
    const s = new MixedModeScheduler();
    const a = s.begin();
    const b = s.begin();
    expect(s.accept(a)).toBe(true);
    expect(s.accept(a)).toBe(false); // duplicate
    expect(s.accept(b)).toBe(true);
  });

  it('under the continuous board loop, a result completing after a newer submission still lands', () => {
    const s = new MixedModeScheduler();
    const first = s.begin();
    s.begin(); // next run already queued before `first` finishes
    // The worker returns in submission order, so `first` completes first and
    // must be applied (this was the original lastAppliedRunId fix).
    expect(s.accept(first)).toBe(true);
  });

  it('rejects an out-of-order (older) result after a newer one applied', () => {
    const s = new MixedModeScheduler();
    const a = s.begin();
    const b = s.begin();
    expect(s.accept(b)).toBe(true);
    expect(s.accept(a)).toBe(false);
  });

  it('invalidate() rejects everything already in flight', () => {
    const s = new MixedModeScheduler();
    const inFlight = s.begin();
    s.invalidate();
    expect(s.accept(inFlight)).toBe(false);
    // ...but a run submitted after the invalidation is fresh.
    const next = s.begin();
    expect(s.accept(next)).toBe(true);
  });

  it('invalidate() drops a pending debounced fire (no ghost run after Stop)', () => {
    const s = new MixedModeScheduler(50);
    const fire = vi.fn();
    s.request(fire);
    s.invalidate();
    vi.advanceTimersByTime(200);
    expect(fire).not.toHaveBeenCalled();
    // The scheduler still works afterwards.
    s.request(fire);
    vi.advanceTimersByTime(50);
    expect(fire).toHaveBeenCalledTimes(1);
  });
});
