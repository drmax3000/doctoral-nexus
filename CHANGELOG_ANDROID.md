# Registro de Cambios - Doctoral Nexus (Android)

Este documento mantiene el registro de la evolución técnica, builds y decisiones arquitectónicas específicamente para la versión de **Android** de Doctoral Nexus.

## [Unreleased] - Fase 3 (Próximamente)
### Planeado
- Implementación de sugerencias de IA dinámicas en la lectura.
- Dashboard de telemetría (Explore) con gráficas para Android.
- Refinamiento del motor de búsqueda FTS5 con resaltado de texto nativo.

## [v2.0.0] - Fase 2 (SQLite & Conocimiento Offline)
### Añadido
- Motor SQLite (`node:sqlite`) con modo WAL, optimizado para lecturas y escrituras veloces en Android.
- Motor de búsqueda de texto completo (FTS5) activo en el módulo de búsqueda.
- Navegación nativa por pestañas (Expo Router `Tabs`).
- Modo de lectura expandible con Dock para escribir observaciones dimensionales.
- Script de ingestión de Markdown (idempotente) que precarga 19 nodos/capítulos base.
- Pre-Flight check (`health_check.js`) para garantizar estabilidad antes de arrancar.

### Cambiado
- Se migró el backend en Python a rutas API nativas de Expo (`+api.ts`) para servir el contenido directamente local desde el SQLite del dispositivo.

## [v1.0.0] - Fase 1 (UI Base)
### Añadido
- Arquitectura Dark Nexus (Fondos #05060E).
- Esquema de colores por dimensiones: 
  - THEORETICAL (#A78BFA)
  - METHODOLOGICAL (#67E8F9)
  - EMPIRICAL (#34D399)
  - ANALYTICAL (#FBBF24)
- Tipografía Serif para lectura y Sans-serif de sistema para la UI.
