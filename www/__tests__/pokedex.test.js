// @ts-check
import { describe, it, expect, beforeEach } from 'vitest';
import { createPokedex } from '../pokedex.js';

const store = {};
const localStorageMock = {
  getItem: (key) => store[key] || null,
  setItem: (key, val) => { store[key] = val; },
  removeItem: (key) => { delete store[key]; },
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('createPokedex', () => {
  beforeEach(() => { Object.keys(store).forEach(k => delete store[k]); });

  it('returns module with expected methods', () => {
    const pdx = createPokedex();
    expect(pdx.state).toBeTypeOf('function');
    expect(pdx.markEncountered).toBeTypeOf('function');
    expect(pdx.markCaught).toBeTypeOf('function');
    expect(pdx.countDiscovered).toBeTypeOf('function');
    expect(pdx.render).toBeTypeOf('function');
  });

  it('starts with empty state', () => {
    const pdx = createPokedex();
    expect(pdx.countDiscovered()).toBe(0);
    expect(pdx.state('测试怪')).toBe('');
  });

  it('marks encountered', () => {
    const pdx = createPokedex();
    pdx.markEncountered('测试怪');
    expect(pdx.state('测试怪')).toBe('seen');
    expect(pdx.countDiscovered()).toBe(1);
  });

  it('marks caught', () => {
    const pdx = createPokedex();
    pdx.markCaught('测试怪');
    expect(pdx.state('测试怪')).toBe('caught');
    expect(pdx.countDiscovered()).toBe(1);
  });

  it('counts multiple discoveries', () => {
    const pdx = createPokedex();
    pdx.markEncountered('怪A');
    pdx.markCaught('怪B');
    pdx.markEncountered('怪C');
    expect(pdx.countDiscovered()).toBe(3);
    expect(pdx.state('怪A')).toBe('seen');
    expect(pdx.state('怪B')).toBe('caught');
    expect(pdx.state('怪C')).toBe('seen');
  });
});
