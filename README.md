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
<a href="https://github.com/xandermeyen/Escape-room/blob/main/LICENSE">
<img src="https://img.shields.io/badge/LICENSE-MIT-black?style=for-the-badge" alt="License" />
</a>
<a href="https://github.com/xandermeyen/Escape-room">
<img src="https://img.shields.io/github/stars/xandermeyen/Escape-room?style=for-the-badge" alt="Stars" />
</a>
</p>

</div>

---

## Overview

Bureau X is an online escape room platform where two players work together to solve a case — each with their own dossier, their own clues, and a shared session.

The first experience, **Kamer 14**, is set in the OPZ Geel, Belgium, and explores the world of the *kostgangers* — people who live with local families as part of a centuries-old care tradition. Players investigate the disappearance of Lena Bogaert through documents, case files, and neighbourhood records.

---

## How It Works

1. A host creates a session and sends a unique session code to both players
2. Each player enters the code and picks a role — **Speler A** (OPZ dossier) or **Speler B** (neighbourhood dossier)
3. Roles are locked in real-time via Firebase — no two players can claim the same role
4. Players explore their own documents, exchange clues, and solve puzzles together
5. Progress is synced live across both screens — solved puzzles unlock new content for both players
6. Once all puzzles are solved, players submit a final report

---

## Features

- Two-player collaborative gameplay with separate roles and dossiers
- Real-time session sync via Firebase Realtime Database
- Atomic role claiming — prevents both players from selecting the same role
- Story-driven puzzle progression with live document unlocking
- Atmospheric UI with period-appropriate design language
- Session timer with warnings
- Host panel for session management
- Navigation protection — players can't accidentally leave the experience mid-game

---

## Tech Stack

<div align="center">

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, JavaScript (ES Modules) |
| Realtime Backend | Firebase Realtime Database |
| Styling | Bootstrap 5, Bootstrap Icons, Google Fonts |
| Hosting | GitHub Pages + Custom Domain |

</div>

---

## Project Structure

```
Escape-room/
│
├── assets/
│   └── img/                   # Logos and favicons
│
├── shared/
│   ├── css/
│   │   └── game.css           # Shared design system
│   └── js/
│       ├── firebase-config.js # Firebase initialisation
│       ├── session.js         # Session logic (create, validate, roles, puzzles)
│       ├── timer.js           # Shared game timer
│       └── utils.js           # Shared helpers
│
├── experiences/
│   └── kamer-14/
│       ├── index.html         # Lobby (code entry + role selection)
│       ├── speler-a.html      # Player A experience
│       ├── speler-b.html      # Player B experience
│       ├── einde.html         # Ending + report submission
│       ├── host-panel.html    # Host session management
│       ├── tijd-voorbij.html  # Time-expired screen
│       └── js/
│           ├── lobby.js
│           ├── speler-a.js
│           ├── speler-b.js
│           ├── einde.js
│           └── audio.js
│
├── index.html                 # Landing page
└── README.md
```

---

## Local Development

```bash
git clone https://github.com/xandermeyen/Escape-room.git
cd Escape-room
```

Open with [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) or any local dev server — direct `file://` won't work due to ES module imports and Firebase.

> Firebase is already configured and connected to the live database. No additional setup required for read access during local testing.

---

## Contributing

This is a personal project. Issues and feedback are welcome, but the codebase is not open for external contributions.

---

## Author

<div align="center">

**Xander Meyen**

<a href="https://bureau-x.be">bureau-x.be</a> · <a href="https://github.com/xandermeyen">GitHub</a>

</div>

---

## License

Distributed under the MIT License.

---

<div align="center">
<sub>Immersion does not require physical walls.</sub>
</div>
