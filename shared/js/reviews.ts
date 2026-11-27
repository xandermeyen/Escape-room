import { db } from './firebase-config.ts';
import { ref, push, query, orderByChild, equalTo, get, serverTimestamp } from 'firebase/database';

// Een review zoals een speler ze achterlaat op het eindscherm.
export interface ReviewInzending {
  rating: number; // 1 t/m 5
  tekst: string; // mag leeg zijn: enkel sterren is ook een review
  naam?: string; // optioneel
  verbeter?: string; // optioneel, bij een lage score; enkel voor het host-paneel
  ervaring: string; // bv. 'kamer-14' of 'dua'
}

// Een review zoals ze uit de database komt en op de site getoond wordt.
export interface Review {
  rating: number;
  tekst: string; // '' bij een review met enkel sterren
  naam?: string;
  verbeter?: string;
  ervaring: string;
  tijdstip: number;
  goedgekeurd: boolean;
}

// Schrijft een nieuwe review weg. Staat standaard op goedgekeurd = false,
// zodat ze pas op de site verschijnt nadat een beheerder ze goedkeurt in het
// host-paneel. De databaseregels blokkeren goedgekeurd = true vanuit de
// client, en het publiek kan alleen goedgekeurde reviews lezen.
export async function schrijfReview(inzending: ReviewInzending): Promise<void> {
  // Pas hier de anonieme login laden: de homepage leest enkel reviews en
  // hoeft dus geen anonieme gebruiker aan te maken (en geen auth-bundel).
  const { authReady } = await import('./auth.ts');
  await authReady;
  const data: Record<string, unknown> = {
    rating: Math.round(inzending.rating),
    ervaring: inzending.ervaring,
    // Servertijd: de rules weigeren een tijdstip in de toekomst, en een
    // scheve klok op het toestel van de speler mag daar niet op botsen.
    tijdstip: serverTimestamp(),
    goedgekeurd: false,
  };

  // Lege tekst laten we weg: de rules eisen minstens één teken als ze er is.
  const tekst = inzending.tekst.trim().slice(0, 500);
  if (tekst) data.tekst = tekst;
  const naam = inzending.naam?.trim().slice(0, 40);
  if (naam) data.naam = naam;
  const verbeter = inzending.verbeter?.trim().slice(0, 500);
  if (verbeter) data.verbeter = verbeter;

  await push(ref(db, 'reviews'), data);
}

// Haalt de goedgekeurde reviews op, nieuwste eerst.
export async function leesGoedgekeurdeReviews(max = 12): Promise<Review[]> {
  const goedgekeurd = query(ref(db, 'reviews'), orderByChild('goedgekeurd'), equalTo(true));
  const snapshot = await get(goedgekeurd);
  if (!snapshot.exists()) return [];

  const reviews: Review[] = [];
  snapshot.forEach(kind => {
    const v = kind.val() as Partial<Review> | null;
    if (v && typeof v.rating === 'number') {
      // Reviews met enkel sterren hebben geen tekst: maak er '' van.
      reviews.push({ ...v, tekst: typeof v.tekst === 'string' ? v.tekst : '' } as Review);
    }
  });

  reviews.sort((a, b) => b.tijdstip - a.tijdstip);
  return reviews.slice(0, max);
}
