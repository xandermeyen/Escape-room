/**
 * voicemail.ts: de voicemail van Marie op de oude gsm van Lena (Speler B).
 *
 * Verloop: Marie spreekt (deel 1), de beiaard speelt het deuntje van het uur,
 * een bus rijdt voorbij en overstemt de klokslagen, Marie sluit af (deel 2).
 * Het uur zelf hoor je dus nooit: Speler B herkent het deuntje, Speler A heeft
 * in de folder welk deuntje op welk uur speelt.
 *
 * De tekst verschijnt mee onder de knop, ook als het geluid niet lukt.
 */
import { speelBeiaard, speelBus, speelStem } from './audio.ts';
import { VOICEMAIL_TEKST } from './berichten.ts';

/** Reserve-duur van de opnames (s), als het bestand niet laadt. */
const RESERVE_DUUR = { voor: 13, na: 4 };

function wachtOpEinde(audio: HTMLAudioElement, reserve: number): Promise<void> {
  return new Promise(klaar => {
    let gedaan = false;
    const stop = () => {
      if (gedaan) return;
      gedaan = true;
      klaar();
    };
    audio.addEventListener('ended', stop, { once: true });
    audio.addEventListener('error', () => setTimeout(stop, reserve * 1000), { once: true });
    // Geblokkeerd afspelen geeft geen 'error': veiligheidsnet op de reserveduur.
    setTimeout(stop, (reserve + 8) * 1000);
  });
}

const pauze = (ms: number) => new Promise(r => setTimeout(r, ms));

export function initVoicemail(zorgVoorAudio: () => void): void {
  const knop = document.getElementById('voicemail-speel') as HTMLButtonElement | null;
  const tekst = document.getElementById('voicemail-tekst');
  const golf = document.querySelector<HTMLElement>('.voicemail-golf');
  if (!knop || !tekst) return;

  if (golf && golf.childElementCount === 0) {
    for (let i = 0; i < 28; i++) golf.append(document.createElement('span'));
  }

  const regel = (inhoud: string, klasse = '') => {
    const p = document.createElement('p');
    p.className = klasse;
    p.textContent = inhoud;
    tekst.append(p);
  };

  let bezig = false;
  knop.addEventListener('click', async () => {
    if (bezig) return;
    bezig = true;
    zorgVoorAudio();
    knop.disabled = true;
    knop.textContent = 'Speelt af…';
    golf?.classList.add('speelt');
    tekst.replaceChildren();

    regel(VOICEMAIL_TEKST.voor);
    await wachtOpEinde(speelStem('marie', 'voicemail-1'), RESERVE_DUUR.voor);

    regel(VOICEMAIL_TEKST.beiaard, 'voicemail-geluid');
    const duurBeiaard = speelBeiaard();
    await pauze((duurBeiaard - 1.2) * 1000);
    speelBus(5.5);
    await pauze(4500);

    regel(VOICEMAIL_TEKST.na);
    await wachtOpEinde(speelStem('marie', 'voicemail-2'), RESERVE_DUUR.na);

    golf?.classList.remove('speelt');
    knop.disabled = false;
    knop.textContent = 'Opnieuw afspelen';
    bezig = false;
  });
}
