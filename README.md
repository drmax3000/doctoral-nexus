<div align="center">
  <img src="./assets/images/logo-glow.png" alt="Nexus Logo" width="120" />
  <h1>🌌 DOCTORAL NEXUS</h1>
  <p><em>The ultimate mobile research and synthesis ecosystem for academic minds.</em></p>

  [![Expo](https://img.shields.io/badge/Expo-57.0.0-black?style=for-the-badge&logo=expo)](https://expo.dev)
  [![React Native](https://img.shields.io/badge/React_Native-Cross_Platform-blue?style=for-the-badge&logo=react)](https://reactnative.dev)
  [![SQLite](https://img.shields.io/badge/SQLite-Local_First-003B57?style=for-the-badge&logo=sqlite)](https://sqlite.org/)
  [![GitHub Actions](https://img.shields.io/badge/CI%2FCD-Automated-2088FF?style=for-the-badge&logo=githubactions)](https://github.com/features/actions)
</div>

---

## ✦ The Vision

**Doctoral Nexus** is not just a PDF reader. It is a native, cross-platform ecosystem (**iOS**, **Android**, and **Web**) methodologically designed to transform a researcher's passive reading into a constellation of interactive knowledge.

The system extracts, ingests, and correlates raw documents (Markdown), empowering the doctoral candidate to capture **Observations (Insights)** categorized under their ontological dimensions without breaking the reading flow.

---

## 🏁 Project Status

Development is organized into strategic phases. As of now, Phases 1 and 2 are **100% complete**, delivering a fully autonomous, offline-first environment.

### ✅ Phase 1: Base Architecture & "Dark Nexus" UI
- **Cross-Platform Ecosystem:** Built with **Expo Router** targeting iOS, Android, and Web.
- **Automatic Split-View:** On browsers (width > 920px), the interface splits into a reading pane on the left and a synthesis pane on the right.
- **Immersive Design:** A strict dark theme (`#05060E`), with Serif typography (`Georgia`) optimized for long academic reading sessions, and a native Sans-Serif typeface for controls.
- **Micro-animations:** Expandable docks and spring-based fluid transitions.
- **Dimensional Taxonomy:** Ontological research dimensions carry rigid visual assignments that travel with the data throughout the app:
  - 🟪 `THEORETICAL` (#A78BFA)
  - 🟦 `METHODOLOGICAL` (#67E8F9)
  - 🟩 `EMPIRICAL` (#34D399)
  - 🟨 `ANALYTICAL` (#FBBF24)

### ✅ Phase 2: "Local-First" Data Engine
- **Embedded SQLite Database:** Pure integration via `node:sqlite` using Expo's own server API routes (`+api.ts`), **eliminating the dependency on an external Python backend**.
- **WAL and FTS5:** Write-Ahead Logging mode for lock-free concurrent access, and a Full-Text Search engine for instant searches across the entire literature.
- **Idempotent Ingestion (`npm run ingest`):** An algorithm that computes SHA-1 hashes of Markdown content. Only new or modified chapters are ingested, ensuring the `nexus.db` database never falls out of sync.
- **CI/CD Pipelines (GitHub Actions):** Native cloud workflows automating the build of `.ipa` (iOS), `.apk` (Android), and the static Web export, each with its own history (`CHANGELOG.md`).
- **Relational Deep-linking:** Saved observations track their exact source chapter. Tapping the `◈` symbol in the history automatically opens the source text via a direct fetch by ID.

### 🚀 Phase 3: Intelligence & Telemetry (In Progress)
- **AI Suggestions:** An engine that analyzes topics and approaches while reading to suggest hyper-connections (deep-links) to other nodes in the library.
- **Explore Dashboard:** A telemetry panel measuring research progress (e.g., empirical vs. theoretical volume).
- **Native Highlighting:** Visual refinement for FTS5 search results.

---

## 🛠 Daily Usage

You don't need to memorize commands. An infrastructure automation layer is provided in the scripts folder:

### 1. Auto-Boot and Backup
Just run in your terminal:
```bat
.\iniciar.bat
```
- ☁️ **Backup:** Generates automatic commits and pushes all files (Markdown, scripts) to GitHub.
- ⚡ **Deploy:** Starts the Expo server (port 8081).
- 🔍 **Pre-flight Check:** Runs a `health_check.js` test to ensure `nexus.db` and the APIs are responding 100% (HTTP 200) before touching any code.

### 2. Knowledge Ingestion
If you place a new book or Markdown chapter in the `./conocimientos` folder, update the database with:
```bash
npm run ingest
```

---

## 🤖 AI Agent Orchestration

This repository is continuously built, refactored, and audited by elite AI agents collaborating together:
- **Claude:** Designs API contracts, dissects architectural problems, and validates UX aesthetic guidelines.
- **Google Antigravity:** Execution agent that automates terminals, assembles SQL layers, fixes bugs in real time, manages Git repositories, and implements TypeScript features.

> *"The interface matters, but the underlying mechanics are sacred. A researcher's draft must never be lost to a network failure." — Doctoral Nexus Design Principles.*

---
<div align="center">
  <sub>Masterfully crafted in the abyss of code by AI Agents. 🌙✨</sub>
</div>
