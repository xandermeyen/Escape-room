<div align="center">
<br />

<img src="./assets/img/bureau_x_logo.svg" alt="Bureau X" height="48" />

<br />
<br />

<p>
Browser-based escape room experiences built around storytelling, atmosphere, and collaborative puzzle-solving.
</p>

<p>
<a href="https://bureau-x.be">
<img src="https://img.shields.io/badge/LIVE-bureau--x.be-black?style=for-the-badge" alt="Live" />
</a>
</p>

</div>

---

## About

Bureau X is a browser-based escape room platform. Each player receives a different dossier, follows a different trail, and sees a different side of the story. The only way to crack the case is to work together.

No app. No downloads. Just a link and a story.

There are two experiences, sharing the same engine but with their own story, roles, and puzzles.

### Kamer 14

Set inside the OPZ Geel psychiatric institution in Belgium, drawing from the real history of the *kostgangers*: people living with local families as part of a centuries-old community care tradition.

One player reviews clinical records as an OPZ staff member (**Speler A**). The other steps into the neighbourhood, piecing together what the institution never wrote down (**Speler B**). Together they investigate the disappearance of Lena Bogaert. Two players.

### D.U.A.

A mystery that spans a century. One team works in **1934** (roles *Schrijver* and *Loper*) and leaves a trail through coded letters, a station locker, and a hidden workroom. The other team works in **2034** as Bureau X archivists (roles *Archivaris* and *Restaurateur*) and uncovers that same trail a hundred years later. Inspired by a real interbellum art theft, the two teams collaborate across time while the 1934 side works under rising police suspicion and time penalties. Two to four players.

---

## How the game works

1. Players open the session link from their email (or a link shared by the host)
2. Each player claims a role. Roles are claimed **atomically via Firebase transactions**, so two players can never grab the same role
3. Players work through their documents, share discoveries, and solve puzzles together
4. Puzzle progress syncs **live** across all screens
5. Once all puzzles are solved, players submit a joint final report
6. The session is automatically deactivated (`actief: false`) after the report is submitted or time runs out

Puzzle answers are never stored in plain text: the source only contains SHA-256 hashes, so opening DevTools gives nothing away.

---

## Booking & hosting

Public bookings go through a Formspree form on the landing page. A Make.com scenario handles everything after submission:

```
Formspree form → Gmail (noreply@formspree.io) → Make.com watches Gmail
  → HTTP PUT to Firebase REST API (creates session with unique code)
  → Email (Combell SMTP) to all players with session link
```

The session link contains `?sessie=CODE` so players land directly on the role selection screen. The Make.com scenario runs every hour, so email confirmation arrives within ~60 minutes of booking.

Hosts can also create and manage sessions directly from the **host panel** of each experience (email/password login), which lists live sessions, their progress, and lobby links.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, TypeScript (ES modules, `strict` mode) |
| Build tool | Vite |
| Realtime backend | Firebase Realtime Database |
| Auth | Firebase Anonymous (players) + Email/Password (hosts) |
| Styling | Bootstrap 5, Bootstrap Icons, Google Fonts |
| Package manager | pnpm |
| Hosting | GitHub Pages + custom domain |
| CI/CD | GitHub Actions |
| Linting / formatting | ESLint (typescript-eslint) + Prettier |
| Error monitoring | Sentry |
| Testing | Vitest + jsdom |
| Booking forms | Formspree (free plan) |
| Automation | Make.com (free plan) |
| Transactional email | Combell SMTP (`smtp-auth.mailprotect.be`, port 587) |

---

## Project structure

```
escape-room/
├── assets/img/                     # Logos, favicons, images
├── css/                            # Landing page styles
├── public/
│   ├── icons.svg
│   └── experiences/kamer-14/audio/ # Recorded voice lines (mp3)
├── shared/
│   ├── css/game.css                # Shared game design system
│   └── js/
│       ├── firebase-config.ts      # Firebase init (reads from .env)
│       ├── auth.ts                 # Anonymous player login (reports failures to Sentry)
│       ├── session.ts              # Session CRUD, role claiming, puzzle sync
│       ├── game.ts                 # Shared player-page logic (progress, nav guard, answer hashes)
│       ├── timer.ts                # 60-min countdown + warnings
│       ├── utils.ts                # requireEl helper, answer hashing, hint helpers
│       ├── verbinding.ts           # Visible "connection failed" banner + Sentry on write errors
│       ├── reviews.ts              # Approved reviews (landing page)
│       ├── lobby-ui.ts             # Shared lobby helpers (screen switch, back-button guard, code input)
│       ├── tijd-voorbij.ts         # Shared "time-expired" logic
│       ├── host-auth.ts            # Shared host email/password login
│       ├── host-ui.ts              # Shared host UI helpers (status, copy, escaping)
│       └── sentry.ts               # Sentry init (imported per page)
├── experiences/
│   ├── kamer-14/                   # OPZ Geel — 2 players (Speler A / B)
│   │   ├── css/
│   │   ├── index.html              # Lobby
│   │   ├── speler-a.html / speler-b.html
│   │   ├── einde.html              # Ending + report submission
│   │   ├── host-panel.html         # Host session management
│   │   ├── tijd-voorbij.html       # Time-expired screen
│   │   └── js/                     # lobby, speler-a, speler-b, einde, tijd-voorbij, audio, host-panel
│   └── dua/                        # D.U.A. — 2–4 players across 1934 / 2034
│       ├── css/dua.css
│       ├── index.html              # Lobby (4 roles)
│       ├── speler-1934.html / speler-2034.html
│       ├── einde.html
│       ├── host-panel.html
│       ├── tijd-voorbij.html
│       └── js/                     # lobby, speler-1934, speler-2034, einde, dua-session, dua-ui, dua-audio, tijd-voorbij, host-panel
├── js/landing-new.ts               # Landing page scripts
├── kamer-14/index.html             # Kamer 14 info/booking page
├── dua/index.html                  # D.U.A. info page
├── tests/                          # Vitest unit tests (session, timer, utils, game, dua-session, shared-ui)
├── firebase/database.rules.json    # Realtime Database security rules
├── firebase.json                   # Firebase CLI config (points to the rules)
├── docs/                           # make-scenario.md (booking automation), TECH-DEBT.md (audit)
├── index.html                      # Homepage
├── privacy.html
├── eslint.config.js                # ESLint flat config
├── .prettierrc.json                # Prettier config
├── .gitattributes                  # Enforce LF line endings
├── tsconfig.json
├── vite.config.ts
└── .github/workflows/
    ├── ci.yml                      # Lint + typecheck + tests on every push and PR
    ├── deploy.yml                  # Lint + tests + build, then deploy to GitHub Pages on push to main
    └── deploy-rules.yml            # Manual deploy of Firebase rules (workflow_dispatch)
```

---

## Local development

```bash
git clone https://github.com/xandermeyen/Escape-room.git
cd Escape-room
pnpm install
```

Create `.env.development` with a Firebase dev project:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_SENTRY_DSN=...
```

### Scripts

```bash
pnpm dev          # dev server at localhost:5173
pnpm lint         # ESLint
pnpm format       # Prettier (write)
pnpm typecheck    # tsc --noEmit
pnpm test         # run unit tests (Vitest)
pnpm build        # type-check + production build
```

---

## Code quality

- **TypeScript `strict` mode** is on; missing DOM elements are caught early via a `requireEl()` helper instead of silent null-dereferences.
- **ESLint + Prettier** enforce a consistent style. A `no-unsanitized` rule blocks unsafe `innerHTML` assignments to prevent XSS regressions in this multiplayer app.
- **CI** (`ci.yml`) runs lint, type-check, and tests on every push and pull request. Deploys are gated on lint + tests passing.
- **Resilient writes**: failed Firebase writes surface a visible "connection failed, reload" banner and are reported to Sentry, instead of failing silently.

---

## Deployment

Every push to `main` triggers a GitHub Actions build. Production Firebase credentials and the Sentry DSN are stored as repository secrets and injected into `.env` at build time. The build output is deployed to GitHub Pages automatically (after lint and tests pass).

---

## Firebase security rules

Sessions are write-protected. The rules enforce required fields on create, typed values (puzzle flags must be booleans, `timerGestart` a number or null, role values constrained), and `auth != null` for writes.

The rules are version-controlled in `firebase/database.rules.json` (with `firebase.json` pointing the Firebase CLI to them). They are deployed manually via the `deploy-rules.yml` workflow: open the Actions tab, pick "Firebase rules deployen" and run it. This needs a `FIREBASE_TOKEN` repository secret (from `npx firebase-tools login:ci`). A normal push to `main` never touches the live rules.

---

## Author

Built by Xander Meyen - [bureau-x.be](https://bureau-x.be)
