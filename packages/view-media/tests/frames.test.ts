import { describe, expect, it } from 'vitest';
import { frameAddress } from '../src/still';

// A still is the address asked again, and the counter it carries is what makes an answer a new
// picture. The address a device hands the app already has its token in a query, so the counter is
// the one thing that can break the gate it travels with.

describe('frameAddress', () => {
  it('starts a query where the address has none', () => {
    expect(frameAddress('http://robot:8081/snapshot.jpg', 3)).toBe('http://robot:8081/snapshot.jpg?frame=3');
  });

  it('joins the query a device already wrote, so its token stays one parameter', () => {
    expect(frameAddress('http://robot:8081/snapshot.jpg?token=abc', 12)).toBe(
      'http://robot:8081/snapshot.jpg?token=abc&frame=12',
    );
  });

  it('counts, so two answers are two addresses', () => {
    expect(frameAddress('/eye.jpg', 1)).not.toBe(frameAddress('/eye.jpg', 2));
  });
});
