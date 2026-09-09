/**
 * host-reviews.ts — gedeelde reviewlijst-logica voor de host-panels.
 *
 * Voorheen kon een review enkel goedgekeurd worden door in de Firebase
 * Realtime Database-console het veld `goedgekeurd` manueel op `true` te
 * zetten. Dat vereist een ingelogde host (`auth.provider === 'password'`),
 * zowel voor het bijwerken hier als in firebase/database.rules.json.
 *
 * Let op: de rules-wijziging die dit toelaat moet apart gedeployed worden
 * via de "Firebase rules deployen"-workflow (handmatig, niet automatisch
 * bij een push naar main).
 */
import { db } from './firebase-config.ts';
import { ref, get, update } from 'firebase/database';
import { escHtml } from './utils.ts';
import type { Review } from './reviews.ts';

export interface ReviewRij {
  id: string;
  data: Review;
}

/** Haalt alle reviews (goedgekeurd of niet) op voor `ervaring`, nieuwste eerst. */
export async function haalReviews(ervaring: string): Promise<ReviewRij[]> {
  const snap = await get(ref(db, 'reviews'));
  const rijen: ReviewRij[] = [];
  if (snap.exists()) {
    snap.forEach((kind) => {
      const d = kind.val() as Review | null;
      if (d && d.ervaring === ervaring) {
        rijen.push({ id: kind.key ?? '', data: d });
      }
    });
  }
  rijen.sort((a, b) => (b.data.tijdstip ?? 0) - (a.data.tijdstip ?? 0));
  return rijen;
}

/** Keurt een review goed zodat ze op de website verschijnt. */
export async function keurReviewGoed(id: string): Promise<void> {
  await update(ref(db, `reviews/${id}`), { goedgekeurd: true });
}

/** Sterren als tekst (★★★★☆), geen markup nodig. */
function sterrenTekst(rating: number): string {
  const rond = Math.max(0, Math.min(5, Math.round(rating)));
  return '★'.repeat(rond) + '☆'.repeat(5 - rond);
}

/** Eén review-kaart als HTML. `data.tekst`, `data.naam` gaan door escHtml. */
export function reviewKaartHtml(rij: ReviewRij): string {
  const { id, data } = rij;
  const naam = data.naam ? escHtml(data.naam) : 'Anoniem';
  const datum = data.tijdstip
    ? new Date(data.tijdstip).toLocaleDateString('nl-BE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—';
  const veiligId = escHtml(id);

  const actie = data.goedgekeurd
    ? '<span class="badge-klaar"><i class="bi bi-check2 me-1"></i>Goedgekeurd</span>'
    : `<button class="btn-admin" style="font-size:0.8rem; padding:0.35rem 0.9rem;" onclick="keurGoed('${veiligId}')">
        <i class="bi bi-check2 me-1"></i>Goedkeuren
      </button>`;

  return `<div class="review-kaart">
    <div class="d-flex justify-content-between align-items-start">
      <div>
        <div style="color:#c9a84c; letter-spacing:2px;">${sterrenTekst(data.rating)}</div>
        <div style="color:#888; font-size:0.78rem; margin-top:2px;">${naam} · ${datum}</div>
      </div>
      ${actie}
    </div>
    <p style="margin:0.6rem 0 0; color:#ddd; font-size:0.9rem;">${escHtml(data.tekst)}</p>
  </div>`;
}
