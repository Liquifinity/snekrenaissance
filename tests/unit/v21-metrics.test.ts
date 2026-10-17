import { describe, expect, it } from 'vitest';
import { V21MetricsTracker, steeringMagnitude } from '../../src/game/metrics';

describe('V2.1 continuous control metrics', () => {
  it('clamps steering magnitude to the normalized radial range', () => {
    expect(steeringMagnitude({ yaw: 0, pitch: 0 })).toBe(0);
    expect(steeringMagnitude({ yaw: 0.3, pitch: 0.4 })).toBeCloseTo(0.5, 12);
    expect(steeringMagnitude({ yaw: 1, pitch: 1 })).toBe(1);
  });

  it('tracks grid-cell entries and average steering magnitude', () => {
    const tracker = new V21MetricsTracker();
    tracker.observeTick({ yaw: 0, pitch: 0 }, 0);
    tracker.observeTick({ yaw: 0.3, pitch: 0.4 }, 2);
    tracker.observeTick({ yaw: 1, pitch: 1 }, 1);

    const snapshot = tracker.snapshot();
    expect(snapshot.totalGridCellEntries).toBe(3);
    expect(snapshot.averageSteeringMagnitude).toBeCloseTo(0.5, 12);
  });

  it('tracks the longest consecutive non-zero steering streak and resets on neutral', () => {
    const tracker = new V21MetricsTracker();
    tracker.observeTick({ yaw: 1, pitch: 0 }, 0);
    tracker.observeTick({ yaw: 0.2, pitch: 0 }, 0);
    tracker.observeTick({ yaw: 0, pitch: 0 }, 0);
    tracker.observeTick({ yaw: 0, pitch: -1 }, 0);

    expect(tracker.snapshot().maxConsecutiveNonZeroSteeringTicks).toBe(2);
  });

  it('rejects invalid cell-entry counts', () => {
    const tracker = new V21MetricsTracker();
    expect(() => tracker.observeTick({ yaw: 0, pitch: 0 }, -1)).toThrow(RangeError);
    expect(() => tracker.observeTick({ yaw: 0, pitch: 0 }, 1.5)).toThrow(RangeError);
  });
});
