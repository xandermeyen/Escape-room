/**
 * route-kaart.ts: de kaart boven het rapport. Terwijl spelers de route van
 * Lena invullen, tekent de kaart mee. Ze toont wat de spelers typen, niet het
 * juiste antwoord: de controle gebeurt pas bij het indienen (einde.ts).
 */
export interface RouteInvoer {
  vervoer: string;
  tijdstip: string;
  bestemming: string;
  wie: string;
}

export interface RouteStand {
  /** De rit vanaf Geel Markt is ingevuld (vervoer en tijdstip). */
  rit: boolean;
  /** Label bij de bestemming op de kaart ("?" zolang leeg). */
  stad: string;
  /** Label bij het laatste punt ("" zolang leeg). */
  adres: string;
}

const MAX_LABEL = 22;

function kort(tekst: string): string {
  const t = tekst.trim().replace(/\s+/g, ' ');
  return t.length > MAX_LABEL ? `${t.slice(0, MAX_LABEL - 1)}…` : t;
}

/** Wat de kaart moet tonen voor deze invoer. Puur, zodat het te testen valt. */
export function routeStand(invoer: RouteInvoer): RouteStand {
  const stad = kort(invoer.bestemming);
  const wie = kort(invoer.wie);
  return {
    rit: invoer.vervoer.trim() !== '' && invoer.tijdstip.trim() !== '',
    stad: stad || '?',
    adres: wie ? `bij ${wie}` : '',
  };
}

const waarde = (id: string) =>
  (document.getElementById(id) as HTMLInputElement | null)?.value ?? '';

/** Leest de velden en werkt de kaart bij. */
export function werkKaartBij(): void {
  const stand = routeStand({
    vervoer: waarde('r-vervoer'),
    tijdstip: waarde('r-tijdstip'),
    bestemming: waarde('r-bestemming'),
    wie: waarde('r-wie'),
  });
  const zet = (id: string, aan: boolean) =>
    document.getElementById(id)?.classList.toggle('getekend', aan);

  zet('route-rit', stand.rit);
  zet('route-punt-stad', stand.stad !== '?');
  zet('route-laatste', stand.adres !== '');
  zet('route-punt-adres', stand.adres !== '');

  const stadLabel = document.getElementById('route-label-stad');
  if (stadLabel) stadLabel.textContent = stand.stad;
  const adresLabel = document.getElementById('route-label-adres');
  if (adresLabel) adresLabel.textContent = stand.adres;
}

/** Koppelt de kaart aan de vier velden van het rapport. */
export function koppelRouteKaart(): void {
  for (const id of ['r-vervoer', 'r-tijdstip', 'r-bestemming', 'r-wie']) {
    document.getElementById(id)?.addEventListener('input', werkKaartBij);
  }
  werkKaartBij();
}
