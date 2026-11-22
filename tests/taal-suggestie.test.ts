import { afterEach, describe, expect, it, vi } from 'vitest';
import { SUGGESTIE_WACHTTIJD, wachtOpRust } from '../shared/js/taal-suggestie.ts';

describe('taalsuggestie: niet over de hero en niet over de cookiebanner', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('verschijnt pas na de wachttijd', () => {
    vi.useFakeTimers();
    const toon = vi.fn();
    wachtOpRust(toon);
    vi.advanceTimersByTime(SUGGESTIE_WACHTTIJD - 1);
    expect(toon).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(toon).toHaveBeenCalledOnce();
  });

  it('wacht tot de cookiebanner weg is', async () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="cookie-banner"></div>';
    const toon = vi.fn();
    wachtOpRust(toon);
    vi.advanceTimersByTime(SUGGESTIE_WACHTTIJD);
    expect(toon).not.toHaveBeenCalled();
    document.getElementById('cookie-banner')!.remove();
    await vi.waitFor(() => expect(toon).toHaveBeenCalledOnce());
  });
});
