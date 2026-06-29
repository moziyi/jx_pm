// @ts-check
import { describe, it, expect } from 'vitest';
import { ELEMENTS, EL, SCENES, EVENTS, STARTERS, INITIAL_ITEMS, POKEDEX, weightedPick } from '../config.js';

describe('ELEMENTS', () => {
  it('has 5 elements', () => {
    expect(ELEMENTS.length).toBe(5);
    expect(ELEMENTS).toContain('金');
    expect(ELEMENTS).toContain('水');
  });
});

describe('EL mapping', () => {
  it('maps correctly', () => {
    expect(EL.METAL).toBe(0);
    expect(EL.WOOD).toBe(1);
    expect(EL.EARTH).toBe(2);
    expect(EL.WATER).toBe(3);
    expect(EL.FIRE).toBe(4);
  });
});

describe('SCENES', () => {
  it('has 6 scenes with unique ids', () => {
    const ids = Object.values(SCENES).map(s => s.id);
    const uniqueIds = [...new Set(ids)];
    expect(ids.length).toBe(6);
    expect(uniqueIds.length).toBe(ids.length);
  });
});

describe('EVENTS', () => {
  it('has all 6 scenes', () => {
    expect(Object.keys(EVENTS).length).toBe(6);
  });

  it('each scene has battles and events arrays', () => {
    for (const [key, pool] of Object.entries(EVENTS)) {
      expect(pool.battles).toBeInstanceOf(Array);
      expect(pool.battles.length).toBeGreaterThan(0);
      expect(pool.events).toBeInstanceOf(Array);
      expect(pool.events.length).toBeGreaterThan(0);
    }
  });

  it('battles have valid elements', () => {
    for (const pool of Object.values(EVENTS)) {
      for (const e of pool.battles) {
        expect(e.w).toBeGreaterThan(0);
        expect(e.enemy.el).toBeGreaterThanOrEqual(0);
        expect(e.enemy.el).toBeLessThan(5);
      }
    }
  });
});

describe('STARTERS', () => {
  it('has 5 starters', () => {
    expect(Array.isArray(STARTERS)).toBe(true);
    expect(STARTERS.length).toBe(5);
  });

  it('each starter has required fields', () => {
    for (const s of STARTERS) {
      expect(s.n).toBeTypeOf('string');
      expect(s.hp).toBeGreaterThan(0);
      expect(s.atk).toBeGreaterThan(0);
      expect(s.el).toBeGreaterThanOrEqual(0);
      expect(s.el).toBeLessThan(5);
    }
  });
});

describe('INITIAL_ITEMS', () => {
  it('has all item keys', () => {
    expect(INITIAL_ITEMS.herbs).toBeGreaterThanOrEqual(0);
    expect(INITIAL_ITEMS.herb50).toBeGreaterThanOrEqual(0);
    expect(INITIAL_ITEMS.herb_half).toBeGreaterThanOrEqual(0);
    expect(INITIAL_ITEMS.herb_full).toBeGreaterThanOrEqual(0);
    expect(INITIAL_ITEMS.revives).toBeGreaterThanOrEqual(0);
    expect(INITIAL_ITEMS.charms).toBeGreaterThanOrEqual(0);
    expect(INITIAL_ITEMS.great_charms).toBeGreaterThanOrEqual(0);
    expect(INITIAL_ITEMS.revive_full).toBeGreaterThanOrEqual(0);
  });
});

describe('POKEDEX', () => {
  it('has 24 monsters across 6 groups', () => {
    let total = 0;
    for (const monsters of Object.values(POKEDEX)) {
      expect(Array.isArray(monsters)).toBe(true);
      total += monsters.length;
    }
    expect(total).toBe(24);
  });
});

describe('weightedPick', () => {
  it('picks one item', () => {
    const items = [{ w: 1, val: 'a' }, { w: 1, val: 'b' }];
    const result = weightedPick(items);
    expect(result).toHaveProperty('val');
  });

  it('returns weighted result over many calls', () => {
    const items = [{ w: 3, val: 'a' }, { w: 1, val: 'b' }];
    const counts = { a: 0, b: 0 };
    for (let i = 0; i < 4000; i++) {
      const result = weightedPick(items);
      counts[result.val]++;
    }
    expect(counts.a / counts.b).toBeGreaterThan(1.5);
    expect(counts.a + counts.b).toBe(4000);
  });

  it('handles single item', () => {
    expect(weightedPick([{ w: 1, val: 'x' }]).val).toBe('x');
  });
});
