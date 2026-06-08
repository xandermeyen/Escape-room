# System Design — Escape Room Platform

_Evaluated: June 2026 | Stack: Vite + TypeScript, Firebase RTDB, Formspree, Sentry, GitHub Actions_

---

## What the system actually does today

Looking at the code, the full flow for a game session goes like this:

1. A group visits the landing page and fills in the Formspree booking form (date, name, email).
2. Formspree emails you (the host) a notification.
3. You manually create a session in Firebase (using `maakSessie()` from the host panel, which generates a session code and writes the initial game state).
4. You manually email the players their session code.
5. Players visit the lobby URL, enter the code, and claim one of the two roles (speler-a / speler-b) using an atomic Firebase transaction.
6. Each player's page calls `initialiseerTimer()` — the first one to load sets `timerGestart` in Firebase using a server timestamp. Both players count down from that same anchor.
7. As puzzles are solved, `puzzelVoltooid()` writes to Firebase. The other player's page reflects it immediately via `onValue`.
8. Timer hits zero → `tijd-voorbij.html`. Report submitted → `einde.html`.

The game logic itself is well-built. The main design gap is step 3 and 4 — those are manual and won't hold up when you have multiple bookings.

---

## What's working well

**Firebase Realtime Database is the right call.** For this use case — two clients that need to see each other's puzzle state within a second or two — RTDB is better than Firestore. Lower latency, simpler rules for small data.

**Atomic role claiming is correct.** Using `runTransaction` to claim a role prevents the race condition where two players pick the same role at exactly the same time. A lot of people would have missed this.

**Server timestamp for the timer.** Storing `timerGestart` as a Firebase server timestamp means both players count down from the same reference point, regardless of clock differences between their devices. Solid.

**The file structure already scales.** `experiences/kamer-14/` as a path means adding `experiences/kamer-15/` later is straightforward. Vite's multi-page input in `vite.config.ts` supports this cleanly.

**Sentry is already wired in.** Every page imports `sentry.ts`. Good — you'll want this when something breaks mid-session for a real group.

---

## The main problem: the booking flow has a manual gap

Right now the flow looks like this:

```
Player fills form → Formspree → email lands in your inbox → you create session → you email the link
```

For a few bookings a week this is fine. But it has real problems:

- If you're away or asleep, players don't get their link.
- You have to remember to do it. If you forget for one booking, that group shows up with nothing.
- There's no booking overview anywhere — just a pile of emails.

The fix depends on how much time you want to invest:

**Option A — Keep it manual, add a host panel booking log (easiest).**
Add a `/bookings` collection to Firebase (or a simple Google Sheet via Zapier). When Formspree receives a submission, it posts the data somewhere you can see it in a list. You still send the link manually, but at least you have a clear queue.

**Option B — Automate with Make (free, no extra code).**
Make.com (formerly Integromat) has a free tier. You set up a scenario:

```
Formspree webhook → Make → Firebase REST API (create session) → Resend/SendGrid (email player their link)
```

This automates the whole thing. The player gets their session code within a minute of booking, without you doing anything. Resend has a free tier (100 emails/day). This is probably the right move for you before you add a second experience.

**Option C — Firebase Cloud Functions (most robust, eventually).**
When you hit the limits of Make or want full control, you write a Cloud Function triggered by a Formspree webhook. It creates the session, generates the code, and emails the player. This requires the Blaze (pay-as-you-go) plan on Firebase, but costs are negligible at small scale.

For now: Option B is the best trade-off. It's free, requires no backend code, and gets you automated delivery.

---

## Smaller issues worth fixing

**Sessions never expire.** Every time `maakSessie()` runs, it writes a new session to Firebase. Old sessions from completed games sit there with `actief: true` and nothing ever cleans them up. This is fine for now (you're well under the free tier limits), but add a cleanup step: after `einde.html` loads, call a function that sets `actief: false` on the session. Or run a weekly cleanup script.

**Session code only lives in `sessionStorage`.** If a player closes their tab mid-game, the session code is gone. They need to go back to their email to find the link. This is probably acceptable UX for an escape room — you don't want people easily rejoining. But it's worth knowing that a tab close = locked out.

**Session data doesn't record which experience it belongs to.** Right now `sessions/{code}` just has `puzzels`, `rapport`, `timerGestart`, `spelers`. When you add a second experience, you'll have no way to know which game a session is for. Add an `ervaringsId: 'kamer-14'` field when creating the session — it costs nothing now and saves you pain later.

**The session code is in the URL** (`speler-a.html?sessie=CODE`). Anyone with the URL can visit the page. For this type of experience that's probably fine (it's a co-op game, not a high-security system), but be aware that someone who shares their screen could expose the code.

---

## How the system grows with multiple experiences

Your `vite.config.ts` is already set up for this. To add experience "kamer-15":

```
experiences/kamer-15/
  index.html        (lobby)
  speler-a.html
  speler-b.html
  einde.html
  ...
  js/
    lobby.ts
    speler-a.ts
    ...
```

Add the new entries to `vite.config.ts`'s `rollupOptions.input`. Firebase handles the sessions for all experiences in the same DB — no changes needed there, as long as you add `ervaringsId` to distinguish them.

The landing page booking form would need a field for "which experience do you want to book" once you have more than one.

---

## Architecture diagram

```
BOOKING FLOW

Landing page
   │
   └─► Formspree (form submit)
           │
           └─► [today: you manually]  OR  [recommended: Make.com]
                       │
                       ├─► Firebase RTDB → create session (maakSessie)
                       │
                       └─► Email to player → link with session code

GAME SESSION

Player A browser             Player B browser
      │                            │
      └─────── Firebase RTDB ──────┘
                    │
                    ├── sessions/{code}/puzzels/p1..p5  (real-time sync)
                    ├── sessions/{code}/spelers/a,b     (role claiming)
                    ├── sessions/{code}/timerGestart    (server timestamp)
                    └── sessions/{code}/rapport         (final report)

Host panel
      │
      └─► reads same session → sees puzzle progress in real time
```

---

## Trade-off summary

| Decision | Why it's fine | Watch out for |
|---|---|---|
| Firebase RTDB over Firestore | Low latency, simpler for this data shape | RTDB has weaker querying — fine since you only ever look up by session code |
| Formspree (free form) | Zero backend, just works | No webhook on free plan — Make.com polls or you upgrade |
| Manual session creation | Simple, you control it | Breaks if you scale past ~5 bookings/week |
| No auth / code-based access | Lower friction for players | Anyone with the code can access — fine for an escape room |
| Single repo for landing + experiences | Easy deployment, one CI job | Gets messy with 5+ experiences; consider splitting later |

---

## What to do next

1. Add `ervaringsId` to the session data created by `maakSessie()` — 5-minute change, pays off later.
2. Set `actief: false` in `einde.ts` when the game completes, so old sessions don't pile up.
3. Set up Make.com to automate booking → session creation → player email. Gets you out of the manual loop.
4. Keep the rest as-is. The game logic is solid for the current scale.
