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
<a href="https://github.com/xandermeyen/Escape-room">
<img src="https://img.shields.io/github/stars/xandermeyen/Escape-room?style=for-the-badge" alt="Stars" />
</a>
</p>

</div>

---

## About

Bureau X is a browser-based escape room platform built for two. Each player receives a different dossier, follows a different trail, and sees a different side of the story. The only way to crack the case is to work together.

No app. No downloads. Just a link, a session code, and a story.

### Kamer 14

The first experience is set inside the OPZ Geel psychiatric institution in Belgium, and draws from the real history of the *kostgangers*: people living with local families as part of a centuries-old community care tradition.

One player takes the role of an OPZ staff member reviewing clinical records. The other steps into the neighbourhood, piecing together what the institution never wrote down. Together, they investigate the disappearance of Lena Bogaert.

---

## How It Works

1. A host creates a session and shares a unique code with both players
2. Each player enters the code and selects a role: **Speler A** (OPZ dossier) or **Speler B** (neighbourhood dossier)
3. Roles are locked in real time via Firebase. No two players can claim the same role
4. Players work through their own documents, share discoveries, and solve puzzles together
5. Progress syncs live across both screens. Solved puzzles unlock new content for both players simultaneously
6. Once all puzzles are solved, players submit a joint final report

---

## Features

- Two-player collaborative gameplay with asymmetric roles and dossiers
- Real-time session sync via Firebase Realtime Database
- Firebase Authentication for host access
- Atomic role claiming to prevent duplicate selections
- Story-driven puzzle progression with live document unlocking
- Atmospheric UI designed around the period and setting
- Session timer with warnings
- Host panel for session management
- Navigation protection to prevent players from accidentally leaving mid-game

---

## Tech Stack

<div align="center">

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, TypeScript (ES Modules) |
| Build tool | Vite |
| Realtime Backend | Firebase Realtime Database |
| Authentication | Firebase Authentication |
| Styling | Bootstrap 5, Bootstrap Icons, Google Fonts |
| Package manager | pnpm |
| Hosting | GitHub Pages + Custom Domain |
| CI/CD | GitHub Actions |
| Error monitoring | Sentry |
| Testing | Vitest + jsdom |

</div>

---

## Project Structure

```
Escape-room/
│
├── assets/
│   └── img/                        # Logos, favicons and images
│
├── css/
│   └── style.css                   # Landing page styles
│
├── src/
│   └── bootstrap.ts                # Bootstrap + Bootstrap Icons entry
│
├── shared/
│   ├── css/
│   │   └── game.css                # Shared design system
│   └── js/
│       ├── firebase-config.ts      # Firebase initialisation (reads from env)
│       ├── session.ts              # Session logic (create, validate, roles, puzzles)
│       ├── timer.ts                # Shared game timer
│       └── utils.ts                # Shared helpers
│
├── experiences/
│   └── kamer-14/
│       ├── audio/                  # Voice and atmosphere audio files
│       ├── index.html              # Lobby (code entry + role selection)
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
│           └── audio.ts
│
├── js/
│   └── landing.ts                  # Landing page scripts
│
├── kamer-14/
│   └── index.html                  # Kamer 14 sales / info page
│
├── public/
│   └── CNAME                       # Custom domain (bureau-x.be)
│
├── index.html                      # Landing page (homepage)
├── privacy.html                    # Privacy policy
├── vite.config.ts                  # Vite multi-page config
├── tsconfig.json                   # TypeScript config
├── sitemap.xml
└── README.md
```

---

## Local Development

```bash
git clone https://github.com/xandermeyen/Escape-room.git
cd Escape-room
pnpm install
```

Create a `.env.development` file with your dev Firebase project config:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Then start the dev server:

```bash
pnpm dev
```

The dev server runs at `http://localhost:5173` and uses the dev Firebase project automatically. Production credentials are never needed locally.

To run the unit tests:

```bash
pnpm test
```

---

## Deployment

Deployments are fully automated via GitHub Actions. Every push to `main` triggers a build and deploys to the `gh-pages` branch. Production Firebase credentials are stored as GitHub repository secrets and injected at build time.

---

## Contributing

This is a personal project. Issues and feedback are welcome, but the codebase is not open for external contributions at this time.

---

## Author

<div align="center">

**Xander Meyen**

<a href="https://bureau-x.be">bureau-x.be</a> · <a href="https://github.com/xandermeyen">GitHub</a>

</div>

---

<div align="center">
<sub>Immersion does not require physical walls.</sub>
</div>
