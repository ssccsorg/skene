import { describe, expect, it } from 'vitest';
import { acrossOf, atOf, readingOf, shownIn } from '@/lib/zoom';

describe('the window the transport reads', () => {
  it('is the whole run at the shallowest depth', () => {
    const reading = readingOf(40, 100, 1);
    expect(reading.view).toBe(100);
    expect(reading.start).toBe(0);
    expect(acrossOf(0, reading)).toBe(0);
    expect(acrossOf(100, reading)).toBe(100);
  });

  it('is a part of the run around the cursor at a deeper one', () => {
    const reading = readingOf(40, 100, 4);
    expect(reading.view).toBe(25);
    expect(reading.start).toBe(27.5);
    // The cursor is the middle of the window, so the record being read stays where the eye is.
    expect(acrossOf(40, reading)).toBeCloseTo(50, 6);
  });

  it('is held inside the run at either end', () => {
    const atTheStart = readingOf(0, 100, 4);
    expect(atTheStart.start).toBe(0);
    expect(acrossOf(0, atTheStart)).toBe(0);

    const atTheEnd = readingOf(100, 100, 4);
    expect(atTheEnd.start).toBe(75);
    expect(acrossOf(100, atTheEnd)).toBe(100);
  });

  it('reads a place across the track back to the position it came from', () => {
    const reading = readingOf(30, 100, 8);
    for (const at of [reading.start, 32, 36, reading.start + reading.view]) {
      expect(atOf(acrossOf(at, reading), reading)).toBeCloseTo(at, 6);
    }
  });

  it('seeks a click inside the window rather than across the whole run', () => {
    const reading = readingOf(40, 100, 4);
    expect(atOf(25, reading)).toBeCloseTo(33.75, 6);
    expect(atOf(0, reading)).toBe(27.5);
    expect(atOf(100, reading)).toBe(52.5);
  });

  it('holds only the records the window covers', () => {
    const reading = readingOf(40, 100, 4);
    expect(shownIn(27.5, reading)).toBe(true);
    expect(shownIn(52.5, reading)).toBe(true);
    expect(shownIn(20, reading)).toBe(false);
    expect(shownIn(60, reading)).toBe(false);
  });
});
