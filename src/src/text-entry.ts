/**
 * Pure state machine behind the in-VR virtual keyboard. It knows nothing about
 * panels or pointers: the runtime maps key presses to {@link KeyAction}s and
 * renders {@link TextEntryState} back into the keyboard panel.
 */
export type EntryMode = 'text' | 'numeric';

export interface TextEntryState {
  /** Which project field is being edited; opaque to this module. */
  field: string;
  label: string;
  mode: EntryMode;
  value: string;
  shift: boolean;
  maxLength: number;
}

export type KeyAction =
  | { type: 'char'; value: string }
  | { type: 'space' }
  | { type: 'backspace' }
  | { type: 'shift' }
  | { type: 'clear' };

export interface EntryLimits { maxLength: number }

const defaultLimits: Record<EntryMode, EntryLimits> = { text: { maxLength: 16000 }, numeric: { maxLength: 18 } };

export function beginEntry(field: string, label: string, mode: EntryMode, value: string, limits: Partial<EntryLimits> = {}): TextEntryState {
  const maxLength = limits.maxLength ?? defaultLimits[mode].maxLength;
  return { field, label, mode, value: Array.from(value).slice(0, maxLength).join(''), shift: false, maxLength };
}

/** Accepts one key and returns the next state; invalid keys leave the state unchanged. */
export function applyKey(state: TextEntryState, key: KeyAction): TextEntryState {
  switch (key.type) {
    case 'shift':
      return { ...state, shift: !state.shift };
    case 'clear':
      return { ...state, value: '', shift: false };
    case 'backspace':
      return { ...state, value: Array.from(state.value).slice(0, -1).join('') };
    case 'space':
      if (state.mode === 'numeric') return state;
      return insert(state, ' ');
    case 'char': {
      if (!isAcceptedCharacter(state.mode, key.value)) return state;
      const character = state.mode === 'text' && state.shift ? key.value.toUpperCase() : key.value;
      // Shift applies to a single character, as on phone keyboards.
      return { ...insert(state, character), shift: false };
    }
  }
}

function insert(state: TextEntryState, text: string): TextEntryState {
  if (Array.from(state.value).length + Array.from(text).length > state.maxLength) return state;
  return { ...state, value: state.value + text };
}

function isAcceptedCharacter(mode: EntryMode, value: string): boolean {
  if (Array.from(value).length !== 1) return false;
  if (mode === 'numeric') return /^[0-9.]$/.test(value);
  // Printable, no control characters; the engine caps lengths separately.
  return !/[\p{Cc}\p{Cs}]/u.test(value);
}

/** Display string with a caret so users can see where the next character lands. */
export function caretDisplay(state: TextEntryState, caret = '|'): string {
  return `${state.value}${caret}`;
}

/** Human hint rendered above the keyboard. */
export function entryHint(state: TextEntryState): string {
  const remaining = state.maxLength - Array.from(state.value).length;
  if (state.mode === 'numeric') return 'Digits and one decimal point. Leave empty to clear the value.';
  return remaining <= 200 ? `${remaining} characters left.` : state.shift ? 'Shift: next letter upper case.' : 'Select keys to type. Done applies, Cancel discards.';
}

/** Parses a numeric entry; empty means "no value". Rejects NaN, negatives and multiple points. */
export function parseNumericEntry(value: string): { ok: true; value: number | null } | { ok: false; reason: string } {
  const trimmed = value.trim();
  if (trimmed === '') return { ok: true, value: null };
  if (!/^\d+(\.\d+)?$/.test(trimmed) && !/^\.\d+$/.test(trimmed) && !/^\d+\.$/.test(trimmed)) return { ok: false, reason: 'Enter a non-negative number such as 120 or 99.50.' };
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1e12) return { ok: false, reason: 'Amount must be between 0 and 1,000,000,000,000.' };
  return { ok: true, value: parsed };
}
