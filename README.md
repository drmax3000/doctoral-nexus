<div align="center">
  <img src="./assets/images/logo-glow.png" alt="Nexus Logo" width="120" />
  <h1>🌌 DOCTORAL NEXUS</h1>
  <p><em>The ultimate mobile research and synthesis ecosystem for academic minds.</em></p>

  [![Expo](https://img.shields.io/badge/Expo-57.0.0-black?style=for-the-badge&logo=expo)](https://expo.dev)
  [![React Native](https://img.shields.io/badge/React_Native-Cross_Platform-blue?style=for-the-badge&logo=react)](https://reactnative.dev)
  [![SQLite](https://img.shields.io/badge/SQLite-Data_Engine-003B57?style=for-the-badge&logo=sqlite)](https://sqlite.org/)
  [![AI Orchestration](https://img.shields.io/badge/AI_Agents-Antigravity_&_Claude-8A2BE2?style=for-the-badge&logo=openai)](#)
</div>

---

## ✦ The Vision

**Doctoral Nexus** is not just another PDF reader. It is a native, cross-platform ecosystem (**iOS**, **Android**, and **Web**) methodologically designed to transform a doctoral student's passive reading into an interactive constellation of knowledge.

The system extracts, ingests, and correlates raw documents (Markdown), empowering you to capture **Insights** (observations) categorized by their ontological research dimension, all without ever leaving your reading flow.

---

## 📱 Cross-Platform Ecosystem
This unified source code compiles natively thanks to the power of **Expo Router**:
- 🍎 **iOS:** Fluid experience featuring native typography (Georgia) and Spring-based micro-animations.
- 🤖 **Android:** Hardware-accelerated rendering, touch-responsive card scaling, and Material adaptability.
- 🌐 **Web (Responsive):** Split View for screens wider than 920px; transforming your browser into a deep-analysis workstation.

---

## 🧬 Data Architecture (Zero-Friction SQLite Engine)

At the heart of Doctoral Nexus beats a highly-optimized local engine (via Node's builtin `node:sqlite` with zero external dependencies):

- **WAL (Write-Ahead Logging):** Enables concurrent UI reads while the AI ingests millions of tokens in the backend without locking.
- **FTS5 (Full-Text Search):** Lightning-fast, full-text queries across your entire literature library.
- **Idempotent Hashing:** The ingestion engine (`npm run ingest`) calculates SHA-1 hashes to intelligently detect what literature is new and what merely had a typo corrected.
- **Dimensional Taxonomy:** Observations are strictly categorized at the database level into 4 core dimensions:
  - 🟪 `THEORETICAL`
  - 🟦 `METHODOLOGICAL`
  - 🟩 `EMPIRICAL`
  - 🟨 `ANALYTICAL`

---

## 🚀 Getting Started (The Daily Ritual)

Starting your research day shouldn't require memorizing terminal commands. We've created a seamless automation script for Windows.

Simply double-click or run the following in your terminal:

```bat
.\iniciar.bat
```

**What happens behind the scenes:**
1. ☁️ **GitHub Backup:** It automatically stages your latest code, scripts, and notes, creates an automated commit, and pushes them safely to your remote repository.
2. ⚡ **System Deployment:** It instantly boots up the **Expo** server. Scan the QR code from your iPhone/Android or press `w` for the desktop experience.

---

## 🤖 AI Agent Orchestration

The source code, UX heuristics, and architectural directives of this repository are continuously written and audited by artificial intelligence working in absolute synergy:
- **Claude (UX/UI Designer):** Architects the API contracts, user flows, and aesthetic heuristics with atomic precision.
- **Google Antigravity (Software Engineer):** The executor agent that implements C/C++ backed databases, rewrites React routing, integrates the Expo SDK, and manages real-time terminal operations.

> *"The interface is important, but the underlying mechanics are sacred. A doctoral student's draft must never be lost to a network failure." — Doctoral Nexus Design Principles.*

---

<div align="center">
  <sub>Masterfully crafted in the abyss of code. 🌙✨</sub>
</div>
