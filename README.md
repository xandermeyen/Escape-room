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
│   ├── fonts/
│   └── img/                        # Logos, favicons and images
│
├── css/
│   └── style.css                   # Landing page styles
│
├── shared/
│   ├── css/
│   │   └── game.css                # Shared design system
│   └── js/
│       ├── firebase-config.js      # Firebase initialisation
│       ├── session.js              # Session logic (create, validate, roles, puzzles)
│       ├── timer.js                # Shared game timer
│       └── utils.js                # Shared helpers
│
├── experiences/
│   └── kamer-14/
│       ├── audio/
│       │   ├── an-vermeersch/
│       │   │   ├── verhaal-p1.mp3
│       │   │   ├── verhaal-p2.mp3
│       │   │   ├── verhaal-p3.mp3
│       │   │   ├── verhaal-p4.mp3
│       │   │   └── verhaal-p5.mp3
│       │   ├── katrijn/
│       │   │   ├── verhaal-p1.mp3
│       │   │   ├── verhaal-p2.mp3
│       │   │   ├── verhaal-p3.mp3
│       │   │   ├── verhaal-p4.mp3
│       │   │   └── verhaal-p5.mp3
│       │   └── lena/
│       │       └── briefkaart.mp3
│       ├── css/
│       │   └── kamer14.css         # Kamer 14 specific styles
│       ├── index.html              # Lobby (code entry + role selection)
│       ├── speler-a.html           # Player A experience
│       ├── speler-b.html           # Player B experience
│       ├── einde.html              # Ending + report submission
│       ├── host-panel.html         # Host session management
│       ├── tijd-voorbij.html       # Time-expired screen
│       └── js/
│           ├── lobby.js
│           ├── speler-a.js
│           ├── speler-b.js
│           ├── einde.js
│           └── audio.js
│
├── js/
│   └── landing.js                  # Landing page scripts
│
├── index.html                      # Landing page
├── privacy.html                    # Privacy policy
├── sitemap.xml
└── README.md
```

---

## Local Development

```bash
git clone https://github.com/xandermeyen/Escape-room.git
cd Escape-room
```

Open with [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) or any static file server. Direct `file://` access will not work due to ES module imports and Firebase.

> Firebase is already configured and connected to the live database. No additional setup is needed for read access during local testing.

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

## License

Distributed under the MIT License.

---

<div align="center">
<sub>Immersion does not require physical walls.</sub>
</div>
