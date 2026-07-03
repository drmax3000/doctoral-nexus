# PLAN DE INTEGRACIÓN — DOCTORAL NEXUS UI v2 → BACKEND (Antigravity)

**Estado:** La capa UI/UX está terminada y congelada. Este plan define el cableado de datos.
**Regla de oro:** No modificar StyleSheets, tokens `C`, tipografía serif ni el breakpoint 920px. Solo lógica.

---

## 0. Arquitectura del flujo (referencia)

```
[Library index.tsx] --tap--> [node/[id].tsx  LECTURA]
        |                        |
        |                   móvil: Synthesis Dock (expandible)
        |                   web >=920px: Split View (panel derecho)
        |                        |
        |                   handleSave() ---POST---> /api/v1/nexus/observations
        |                                                 |
[observations.tsx  SÍNTESIS] <-----------GET--------------┘
   (historial relacional: badge dimensión + chip de origen ◈)
```

---

## 1. Contratos de API que el backend debe exponer

### 1.1 `POST /api/v1/nexus/observations`
```json
{
  "text": "string (síntesis del doctorante)",
  "dimension": "THEORETICAL | METHODOLOGICAL | EMPIRICAL | ANALYTICAL",
  "source": {
    "nodeId": "string",
    "title": "string",
    "author": "string?",
    "capitulo": "string?"
  }
}
```
- Respuesta `201`: objeto completo con `id` y `createdAt` (ISO-8601).
- **Invariante:** `dimension` la asigna el humano. Los agentes IA jamás escriben este campo.

### 1.2 `GET /api/v1/nexus/observations`
- Lista ordenada por `createdAt` DESC. Mismo shape que 1.1 + `id` + `createdAt`.

### 1.3 `GET /api/v1/nexus/nodes/:id`
- Devuelve un `DocumentNode` individual (mismo shape que la lista actual).
- **Motivo:** hoy `[id].tsx` depende del param `nodeData` (JSON serializado por navegación).
  El deep-link desde el historial solo tendrá `nodeId` → necesita fetch por id.

---

## 2. Tareas frontend (en orden, con ubicación exacta)

### T1 — Persistir observación desde la lectura
- **Archivo:** `src/app/node/[id].tsx` → `handleSave()` (marcado `TODO(Antigravity)`).
- Reemplazar el mock por `fetch POST` (contrato 1.1). Reusar patrón `fetchWithTimeout` de `index.tsx`.
- Mantener intactos: `setSaved(true)` → feedback "✓ Insight committed" → auto-colapso del dock a los 1400ms.
- Error de red: no cerrar el dock, no borrar el texto (el borrador del doctorante es sagrado).

### T2 — Historial real en Síntesis
- **Archivo:** `src/app/observations.tsx`.
- Reemplazar `SEED_HISTORY` por `GET` (contrato 1.2) con `useEffect` + estados `loading`/`error`,
  copiando el patrón exacto de `index.tsx` (mismo `errorCard`, mismo loader violeta→cian).
- `handleSave()` de esta pantalla: POST sin `source` (observación libre, no ligada a nodo).

### T3 — Deep-link del chip de origen ◈
- **Archivo:** `src/app/observations.tsx` (chip `sourceChip`, marcado `TODO(Antigravity)`).
- Envolver en `Pressable` → `router.push({ pathname: '/node/[id]', params: { id: source.nodeId } })`.
- **Prerrequisito:** modificar `[id].tsx` para que si `nodeData` no llega por params,
  haga `GET /nodes/:id` (contrato 1.3) con loader (`ActivityIndicator` color `#A78BFA`).

### T4 — Configuración de red centralizada
- `TUNNEL_URL` está duplicado/hardcodeado. Mover a `src/constants/config.ts` exportando
  `API_BASE` desde `process.env.EXPO_PUBLIC_API_URL` con fallback `''`.

### T5 — (Opcional, no bloqueante) Extraer tokens compartidos
- Los objetos `C`, `SERIF` y `DIMENSIONS` están triplicados adrede (autocontención).
- Si se van a tocar más pantallas: extraer a `src/constants/nexus-theme.ts` y importar.
- No cambiar ningún valor hexadecimal al extraer.

---

## 3. Invariantes de diseño (NO negociables)

- Fondo `#05060E`; glass `rgba(16,21,38,0.72)`; hairline `rgba(148,163,184,0.10)`.
- Dimensiones → color fijo: THEORETICAL `#A78BFA` · METHODOLOGICAL `#67E8F9` ·
  EMPIRICAL `#34D399` · ANALYTICAL `#FBBF24`. El color viaja con la observación.
- Lectura en serif 17/30 (Georgia/serif). UI en sans del sistema.
- Breakpoint Split View: `width >= 920`.
- Botón de guardar: deshabilitado hasta `texto.trim() && dimension` — el estado del label
  guía al usuario ("SELECT A DIMENSION" → "WRITE YOUR INSIGHT" → "COMMIT").

---

## 4. Checklist de aceptación (QA)

- [ ] `npx tsc --noEmit` limpio (nota: el import roto de `react-router-dom` ya fue eliminado).
- [ ] Guardar insight desde el dock móvil: feedback ✓ + dock colapsa + borrador limpio.
- [ ] Guardar con red caída: borrador intacto + error visible.
- [ ] Historial muestra badge de dimensión con el color correcto por cada tipo.
- [ ] Chip ◈ navega al nodo de origen y la pantalla carga por `id` sin `nodeData`.
- [ ] Split view activo en navegador ≥920px; dock activo en móvil.
- [ ] Zero-state: tocar un chip de sugerencia rellena el buscador y produce resultados.
- [ ] Pull-to-refresh en Library conserva tint violeta.

---

# FASE 2 — MOTOR DE DATOS (SQLite real, sin mocks)

**Estado:** Implementado y probado (19 nodos reales ingeridos desde `/conocimientos`).

## Componentes
- `src/server/db.js` — capa de datos: `node:sqlite` (builtin Node ≥22.5, cero node-gyp),
  WAL, schema `nodes`/`observations`, FTS5 con fallback a LIKE. `src/server/db.d.ts` = tipos.
- `scripts/ingest_knowledge.js` — motor de ingestión idempotente (hash título+contenido → version bump).
- Rutas API reescritas contra SQL: `nodes+api.ts` (lista con excerpt, `?q=` para FTS),
  `nodes/[id]+api.ts` (content completo), `observations+api.ts` (GET join + POST validado).
- `index.tsx`: navega solo con `{ id }` — el detalle hace fetch completo (payload de lista liviano).

## Runbook
```
npm run ingest                # ingiere ./conocimientos → data/nexus.db
npm run ingest -- /otra/ruta  # carpeta alternativa
npx expo start                # las rutas API sirven SQL real
```

## Reglas
- `data/nexus.db` NO se versiona → añadir `data/` a `.gitignore`.
- `ExpoRequest/ExpoResponse` quedan prohibidos: usar `Request`/`Response` estándar.
- Frontmatter opcional en los .md: `title, author, capitulo, tema, enfoque, confidence`.
- Los agentes escriben vía `upsertNode()` con `status:'processing'` → `'offline_ready'`,
  siempre con `traceId` y `lastAgentId` propios. La columna `dimension` es intocable para agentes.
