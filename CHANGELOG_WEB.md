# Registro de Cambios - Doctoral Nexus (Web)

Este documento mantiene el registro de la evolución técnica, builds y decisiones arquitectónicas específicamente para la versión **Web** (Desktop/Browser) de Doctoral Nexus.

## [Unreleased] - Fase 3 (Próximamente)
### Planeado
- Implementación de atajos de teclado completos para control y lectura ágil.
- Dashboard de telemetría (Explore) adaptado a pantallas anchas.
- Refinamiento de la búsqueda FTS5 en la columna izquierda, con previsualizaciones expandidas al hacer hover.

## [v2.0.0] - Fase 2 (Split-View y Local-First)
### Añadido
- Flujo de GitHub Actions completo (`web-build.yml`) para compilación automatizada (`npx expo export --platform web`).
- Arquitectura de componentes condicional (Renderizado Split-View con paneles paralelos para navegadores con resolución `> 920px`).
- Soporte para bases de datos SQLite nativas (a través del servidor Expo) y emulación correcta de llamadas a las rutas de la API en el entorno web.

### Cambiado
- Homologación del sistema de ruteo de archivos (`Expo Router`) garantizando que los deep-links en el navegador coincidan exactamente con la estructura `/node/[id]` de la aplicación móvil.

## [v1.0.0] - Fase 1 (Diseño Base)
### Añadido
- Framework base utilizando React DOM.
- Paleta dimensional (`THEORETICAL`, `METHODOLOGICAL`, `EMPIRICAL`, `ANALYTICAL`) portadas a CSS nativo compatible con web y con fondo estándar `#05060E`.
- Tipografía Serif adaptada a navegadores web de escritorio y configuración de breakpoints precisos.
