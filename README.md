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

### Kamer 14

The first experience is set inside the OPZ Geel psychiatric institution in Belgium, and draws from the real history of the *kostgangers*: people living with local families as part of a centuries-old community care tradition.

One player reviews clinical records as an OPZ staff member. The other steps into the neighbourhood, piecing together what the institution never wrote down. Together they investigate the disappearance of Lena Bogaert.

---

## Booking flow

Bookings go through a Formspree form on the landing page. A Make.com scenario handles everything after submission:

```
Formspree form → Gmail (noreply@formspree.io) → Make.com watches Gmail
  → HTTP PUT to Firebase REST API (creates session with unique code)
  → Email (Combell SMTP) to all players with session link
```

The session link contains `?sessie=CODE` so players land directly on the role selection screen without needing to enter a code manually.

The Make.com scenario runs every hour. Email confirmation arrives within ~60 minutes of booking.

---

## How the game works

1. Players open the session link from their email
2. Each player selects a role: **Speler A** (OPZ dossier) or **Speler B** (neighbourhood dossier). Roles are claimed atomically via Firebase transactions
3. Players work through their documents, share discoveries, and solve puzzles together
4. Puzzle progress syncs live across both screens
5. Once all puzzles are solved, players submit a joint final report
6. The session is automatically deactivated (`actief: false`) after the report is submitted or time runs out

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, TypeScript (ES modules) |
| Build tool | Vite |
| Realtime backend | Firebase Realtime Database |
| Styling | Bootstrap 5, Bootstrap Icons, Google Fonts |
| Package manager | pnpm |
| Hosting | GitHub Pages + custom domain |
| CI/CD | GitHub Actions |
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
├── css/style.css                   # Landing page styles
├── shared/
│   ├── css/game.css                # Shared game design system
│   └── js/
│       ├── firebase-config.ts      # Firebase init (reads from .env)
│       ├── session.ts              # Session CRUD, role claiming, puzzle sync
│       └── sentry.ts               # Sentry init (imported per page)
├── experiences/
│   └── kamer-14/
│       ├── audio/                  # Voice and atmosphere audio files
│       ├── css/kamer14.css         # Experience-specific styles
│       ├── index.html              # Lobby (URL code auto-fill + role selection)
│       ├── speler-a.html           # Player A experience
│       ├── speler-b.html           # Player B experience
│       ├── einde.html              # Ending + report submission
│       ├── host-panel.html         # Host session management
│       ├── tijd-voorbij.html       # Time-expired screen
│       └── js/
│           ├── lobby.ts
│           ├── speler-a.ts
│           ├── speler-b.ts
│           ├── einde.ts
│           ├── tijd-voorbij.ts
│           └── audio.ts
├── js/landing.ts                   # Landing page scripts
├── kamer-14/index.html             # Kamer 14 info/booking page
├── email-template-kamer14.html     # HTML email template (used in Make.com)
├── index.html                      # Homepage
├── privacy.html
├── vite.config.ts
└── .github/workflows/deploy.yml   # Auto-deploy to GitHub Pages on push to main
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

```bash
pnpm dev        # dev server at localhost:5173
pnpm test       # run unit tests
pnpm build      # production build
```

---

## Deployment

Every push to `main` triggers a GitHub Actions build. Production Firebase credentials and the Sentry DSN are stored as repository secrets and injected into `.env` at build time. The build output is deployed to the `gh-pages` branch automatically.

---

## Firebase security rules

Sessions are write-protected. The rules enforce:

- Required fields on create (`actief`, `aangemaakt`, `ervaringsId`, `puzzels`, `rapport`, `timerGestart`)
- `ervaringsId` must be a string
- `timerGestart` must be a number or null
- Puzzle values must be booleans
- Role values must be `"bezet"` or `"vrij"`

---

## Author

Built by Xander Meyen - [bureau-x.be](https://bureau-x.be)
