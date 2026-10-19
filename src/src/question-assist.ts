import { inputDefinitions } from './decision.js';
import type { ChoiceKey } from './decision.js';

export interface QualifiedAnswer { value?: string; quote?: string; question?: string }
/** AI output is a proposal; only a valid value backed by the captured words qualifies. */
export function qualifyProposal(key: ChoiceKey, text: string, raw: unknown): QualifiedAnswer {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid AI response.');
  const result = raw as { suggestions?: { field: string; value: string; quote: string }[]; questions?: string[] };
  const suggestions = result.suggestions ?? [];
  if (!Array.isArray(suggestions) || suggestions.some(item => item.field !== key) || suggestions.length > 1) throw new Error('AI proposed an unrelated or conflicting answer.');
  const proposal = suggestions[0];
  if (!proposal || proposal.value === 'unknown') {
    const question = Array.isArray(result.questions) && typeof result.questions[0] === 'string' ? result.questions[0] : '';
    const fallback = inputDefinitions[key].values.some(choice => choice.value === 'unknown') ? 'Could you clarify this requirement? You can also choose Unknown.' : 'Could you clarify this requirement, or choose one of the listed answers?';
    return { question: question || fallback };
  }
  if (!inputDefinitions[key].values.some(choice => choice.value === proposal.value) || typeof proposal.quote !== 'string' || !proposal.quote.trim() || !text.includes(proposal.quote)) throw new Error('AI answer lacks valid supporting words.');
  return { value: proposal.value, quote: proposal.quote };
}
