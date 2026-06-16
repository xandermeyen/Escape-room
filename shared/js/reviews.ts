import { db } from './firebase-config.ts';
import { ref, push, query, orderByChild, equalTo, get } from 'firebase/database';
import { authReady } from './auth.ts';

// Een review zoals een speler ze achterlaat op het eindscherm.
export interface ReviewInzending {
  rating: number;        // 1 t/m 5
  tekst: string;
  naam?: string;         // optioneel
  ervaring: string;      // bv. 'kamer-14' of 'dua'
}

// Een review zoals ze uit de database komt en op de site getoond wordt.
export interface Review {
  rating: number;
  tekst: string;
  naam?: string;
  ervaring: string;
  tijdstip: number;
}

// Schrijft een nieuwe review weg. Staat standaard op goedgekeurd = false,
// zodat ze pas op de site verschijnt nadat ze in de Firebase-console
// op true gezet wordt. De databaseregels blokkeren goedgekeurd = true
// vanuit de client.
export async function schrijfReview(inzending: ReviewInzending): Promise<void> {
  await authReady;
  const data: Record<string, unknown> = {
    rating: Math.round(inzending.rating),
    tekst: inzending.tekst.trim().slice(0, 500),
    ervaring: inzending.ervaring,
    tijdstip: Date.now(),
    goedgekeurd: false,
  };

  const naam = inzending.naam?.trim().slice(0, 40);
  if (naam) data.naam = naam;

  await push(ref(db, 'reviews'), data);
}

// Haalt de goedgekeurde reviews op, nieuwste eerst.
export async function leesGoedgekeurdeReviews(max = 12): Promise<Review[]> {
  const goedgekeurd = query(ref(db, 'reviews'), orderByChild('goedgekeurd'), equalTo(true));
  const snapshot = await get(goedgekeurd);
  if (!snapshot.exists()) return [];

  const reviews: Review[] = [];
  snapshot.forEach((kind) => {
    const v = kind.val() as Review;
    if (v && typeof v.tekst === 'string' && typeof v.rating === 'number') {
      reviews.push(v);
    }
  });

  reviews.sort((a, b) => b.tijdstip - a.tijdstip);
  return reviews.slice(0, max);
}
