// @ts-check
import { describe, it, expect } from 'vitest';
import { checksum, parseWasmState } from '../storage.js';

describe('checksum', () => {
  it('returns same checksum for same string', () => {
    expect(checksum('hello')).toBe(checksum('hello'));
  });

  it('returns different checksum for different strings', () => {
    expect(checksum('hello')).not.toBe(checksum('world'));
  });

  it('returns number within 0-65535', () => {
    const v = checksum('a'.repeat(1000));
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(65535);
  });
});

describe('parseWasmState', () => {
  const mockSave = [
    '9',
    '12345', // checksum (ignored by parser)
    '0',     // active
    '3', '1', '2', '1', '1', '1', '0', '0', // inventory
    '1',     // owned_count
    '1', '小幽', '🧚', '35', '8', '3', '5', '1', '0', '35', '4', // pet
    '0',     // stored_count
  ].join('\n');

  it('parses basic state correctly', () => {
    const state = parseWasmState(mockSave);
    expect(state).not.toBeNull();
    expect(state?.active).toBe(0);
    expect(state?.inv.herbs).toBe(3);
    expect(state?.inv.herb50).toBe(1);
    expect(state?.pets.length).toBe(1);
    expect(state?.stored.length).toBe(0);
  });

  it('parses pet data', () => {
    const state = parseWasmState(mockSave);
    expect(state?.pets[0].n).toBe('小幽');
    expect(state?.pets[0].hp).toBe(35);
    expect(state?.pets[0].atk).toBe(8);
    expect(state?.pets[0].cur_hp).toBe(35);
    expect(state?.pets[0].el).toBe(4);
  });

  it('handles null/empty input', () => {
    expect(parseWasmState('')).toBeNull();
    expect(parseWasmState(null)).toBeNull();
    expect(parseWasmState(undefined)).toBeNull();
  });

  it('rejects ver < 9', () => {
    const lines = mockSave.split('\n');
    lines[0] = '8';
    expect(parseWasmState(lines.join('\n'))).toBeNull();
  });

  it('parses stored pets', () => {
    const state = parseWasmState([
      '9', '0', '0',
      '3','1','2','1','1','1','0','0',
      '1', // owned_count
      '1','小幽','🧚','35','8','3','5','1','0','35','4',
      '1', // stored_count
      '2','小幽2','🧚','30','10','3','5','1','0','30','4',
    ].join('\n'));
    expect(state?.stored.length).toBe(1);
    expect(state?.stored[0].n).toBe('小幽2');
  });
});
