/** Optional browser speech recognition. It may use an external browser/vendor service. */
type Recognition = { lang: string; interimResults: boolean; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start(): void; stop(): void };
export function dictationSupport() {
  const browser = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  const Constructor = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
  return Constructor ? (onText: (text: string) => void, done: () => void) => {
    const recognition = new Constructor(); recognition.lang = 'en-US'; recognition.interimResults = false;
    recognition.onresult = event => { const text = event.results[0]?.[0]?.transcript; if (text) onText(text); };
    recognition.onerror = done; recognition.onend = done;
    try { recognition.start(); } catch { done(); }
    return () => { recognition.onresult = null; try { recognition.stop(); } catch { /* Already stopped or permission denied. */ } };
  } : null;
}
