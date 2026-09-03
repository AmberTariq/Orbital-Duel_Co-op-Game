# Orbital Duel 🚀

A fast-paced, interactive 2D arcade space shooter built with HTML5 Canvas and pure Web Audio API. Play solo against an adaptive CPU drone or duel head-to-head with a friend in local multiplayer.

**[🎮 Play the Live Game Here](https://orbital-duel-game.vercel.app)**

---

## ✨ Features

* **Multiple Game Modes:**
  * **1 Player (vs Bot):** Challenge a tactical CPU ship with 3 difficulty levels (*Easy*, *Normal*, and *Hard*).
  * **2 Players (Local):** Local co-op/versus on a single shared keyboard.
* **Procedural Sound Engine:** Custom audio synthesis powered entirely by the native Web Audio API (no external sound files required) with ambient background synth tracks and full audio toggles.
* **Dynamic Power-Ups:** In-game spawns featuring Rapid Fire, Deflector Shields, Spread Cannons, EMP Shockwaves, and Health Packs.
* **Full-Screen Arcade HUD:** Clean, responsive full-canvas view with floating player health bars, score tracking, active power-up timers, and smooth pause/settings overlays.
* **Streamlined UI & Fast Restarts:** Simple, welcoming menus and instant round restarts directly from the Game Over screen using mouse or hotkeys (`Space` / `Enter`).

---

## 🎮 Controls

| Action | Player 1 | Player 2 (Local) |
| :--- | :--- | :--- |
| **Thrust / Accelerate** | `W` | `Up Arrow` |
| **Rotate Left / Right** | `A` / `D` | `Left Arrow` / `Right Arrow` |
| **Reverse Brake** | `S` | `Down Arrow` |
| **Fire Laser** | `Space` | `Enter` / `Numpad 0` |

* **Pause / Settings:** Press `ESC` or `Tab`
* **Restart Round:** Press `R`, `Space`, or `Enter` on the Game Over screen

---

## ⚡ Power-Ups

* **⚡ Rapid Fire:** Doubles your laser firing rate with decreased recoil.
* **🛡️ Deflector Shield:** Creates an invincible energy barrier for 8 seconds.
* **💥 Spread Cannon:** Fires a 5-way spread of plasma bolts to clear screen hazards.
* **💣 EMP Shockwave:** Triggers a screen-clearing pulse that destroys nearby threats and stuns foes.
* **💚 Health Pack:** Instantly restores ship health points.

---

## 🛠️ Tech Stack

* **Rendering Engine:** Native HTML5 Canvas API
* **Audio Engine:** Web Audio API (Procedural sound synthesis)
* **Styling & UI:** Modern HTML5 / CSS3 (Glassmorphism & Flexbox/Grid)
* **Language:** Vanilla JavaScript (ES6+)
* **Deployment:** Vercel

---

## 🚀 Local Setup & Development

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/YOUR_USERNAME/Orbital-Duel.git](https://github.com/YOUR_USERNAME/Orbital-Duel.git)
   cd Orbital-Duel
