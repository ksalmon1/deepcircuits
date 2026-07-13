import { describe, it, expect } from 'vitest';
import { UnionFind } from './unionFind';

describe('UnionFind', () => {
  it('unions keys into one set', () => {
    const uf = new UnionFind();
    uf.union('a', 'b');
    uf.union('b', 'c');
    expect(uf.find('a')).toBe(uf.find('c'));
    expect(uf.find('a')).toBe(uf.find('b'));
  });

  it('keeps disjoint sets separate', () => {
    const uf = new UnionFind();
    uf.union('a', 'b');
    uf.add('x');
    expect(uf.find('a')).not.toBe(uf.find('x'));
  });

  it('propagates a forced canonical name across unions', () => {
    const uf = new UnionFind();
    uf.setCanonical('gnd', '0');
    uf.union('gnd', 'a');
    uf.union('a', 'b');
    expect(uf.getCanonical('b')).toBe('0');
    expect(uf.getCanonical('a')).toBe('0');
  });

  it('a set with no canonical returns undefined', () => {
    const uf = new UnionFind();
    uf.union('a', 'b');
    expect(uf.getCanonical('a')).toBeUndefined();
  });

  it('merging two pinned sets keeps a single name (identical-name case)', () => {
    const uf = new UnionFind();
    uf.setCanonical('g1', '0');
    uf.setCanonical('g2', '0');
    uf.union('g1', 'g2');
    expect(uf.getCanonical('g1')).toBe('0');
  });
});
