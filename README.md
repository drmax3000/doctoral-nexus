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

## ✦ La Visión (The Vision)

**Doctoral Nexus** no es simplemente un lector de PDFs. Es un ecosistema nativo y multiplataforma (**iOS**, **Android** y **Web**) diseñado metodológicamente para transformar la lectura pasiva del investigador en una constelación de conocimiento interactivo.

El sistema extrae, ingiere y correlaciona documentos en bruto (Markdown), empoderando al doctorante para capturar **Observaciones (Insights)** categorizadas bajo sus dimensiones ontológicas sin perder el flujo de lectura.

---

## 🏁 Estado del Proyecto

El desarrollo del proyecto está seccionado en fases estratégicas. Al momento, las Fases 1 y 2 están **100% completadas**, logrando un entorno autónomo y fuera de línea (Offline-first).

### ✅ Fase 1: Arquitectura Base y UI "Dark Nexus"
- **Ecosistema Multiplataforma:** Compilación con **Expo Router** hacia iOS, Android y Web.
- **Split-View Automático:** En navegadores (ancho > 920px), la interfaz se divide para permitir la lectura en el panel izquierdo y la síntesis en el panel derecho.
- **Diseño Inmersivo:** Tema oscuro estricto (`#05060E`), con tipografía Serif (`Georgia`) optimizada para largas jornadas de lectura académica, y tipografía Sans-Serif nativa para controles.
- **Micro-animaciones:** Docks expandibles y transiciones fluidas basadas en físicas de resorte (Spring-based).
- **Taxonomía Dimensional:** Las dimensiones ontológicas de investigación tienen asignaciones visuales rígidas que viajan con el dato a lo largo de la app:
  - 🟪 `THEORETICAL` (#A78BFA)
  - 🟦 `METHODOLOGICAL` (#67E8F9)
  - 🟩 `EMPIRICAL` (#34D399)
  - 🟨 `ANALYTICAL` (#FBBF24)

### ✅ Fase 2: Motor de Datos "Local-First"
- **Base de Datos SQLite Integrada:** Integración pura mediante `node:sqlite` usando rutas API (`+api.ts`) del propio servidor de Expo, **eliminando la dependencia de un backend Python externo**.
- **WAL y FTS5:** Modo *Write-Ahead Logging* para concurrencia masiva sin bloqueos, y motor *Full-Text Search* para búsquedas instantáneas en toda la literatura.
- **Ingestión Idempotente (`npm run ingest`):** Algoritmo que calcula hashes SHA-1 para el contenido Markdown. Solo ingiere capítulos nuevos o modificados, asegurando que la base de datos `nexus.db` jamás pierda sincronía.
- **Pipelines CI/CD (GitHub Actions):** Flujos de trabajo nativos en la nube para automatizar la construcción de versiones en `.ipa` (iOS), `.apk` (Android) y la página estática Web, cada uno con su respectivo historial (`CHANGELOG.md`).
- **Deep-linking Relacional:** Las observaciones guardadas rastrean exactamente el capítulo de origen. Tocar el símbolo `◈` en el historial abre automáticamente el texto raíz usando un fetch directo por ID.

### 🚀 Fase 3: Inteligencia y Telemetría (En Desarrollo)
- **Sugerencias de IA:** Motor que analiza temas y enfoques mientras lees para sugerir hiper-conexiones (Deep-links) a otros nodos de tu librería.
- **Dashboard Explore:** Panel de telemetría para medir el progreso de la investigación (ej. volumen empírico vs teórico).
- **Highlight Nativo:** Refinamiento visual para búsquedas FTS5.

---

## 🛠 Modo de Empleo (The Daily Ritual)

No necesitas memorizar comandos. Hemos provisto una capa de automatización de infraestructura en la carpeta de scripts:

### 1. El Auto-Boot y Respaldo
Solo ejecuta en tu terminal:
```bat
.\iniciar.bat
```
- ☁️ **Respaldo:** Genera commits automáticos y envía (*push*) todos los archivos (Markdown, Scripts) a GitHub.
- ⚡ **Despliegue:** Inicia el servidor de Expo (puerto 8081).
- 🔍 **Verificación (Pre-flight):** Corre un test `health_check.js` para asegurar que `nexus.db` y las APIs estén al 100% respondiendo (Código HTTP 200) antes de tocar el código.

### 2. La Ingestión de Conocimiento
Si colocas un nuevo libro o capítulo Markdown en la carpeta `./conocimientos`, actualiza la base de datos con:
```bash
npm run ingest
```

---

## 🤖 Orquestación de Agentes de IA

Este repositorio es construido, refactorizado y auditado continuamente por Inteligencias Artificiales de élite colaborando:
- **Claude:** Diseña contratos de API, disecciona problemas arquitectónicos y valida las guías estéticas de UX.
- **Google Antigravity:** Agente ejecutor que automatiza las terminales, ensambla las capas de SQL, corrige bugs en tiempo real, manipula los repositorios de Git e implementa las funciones en TypeScript.

> *"La interfaz es importante, pero la mecánica subyacente es sagrada. El borrador de un investigador jamás debe perderse por un fallo de red." — Principios de Diseño de Doctoral Nexus.*

---
<div align="center">
  <sub>Masterfully crafted in the abyss of code by AI Agents. 🌙✨</sub>
</div>
