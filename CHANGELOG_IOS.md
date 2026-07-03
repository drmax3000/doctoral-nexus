# Registro de Cambios - Doctoral Nexus (iOS)

Este documento mantiene el registro de la evolución técnica, builds y decisiones arquitectónicas específicamente para la versión de **iOS** (iPhone/iPad) de Doctoral Nexus.

## [Unreleased] - Fase 3 (Próximamente)
### Planeado
- Integración de sugerencias algorítmicas al momento de leer un nodo.
- Visualización de gráficas de telemetría (Dashboard Explore) optimizadas para pantallas Retina.
- Refinamiento de la UI de búsqueda FTS5 con soporte nativo de iOS.

## [v2.0.0] - Fase 2 (Migración a Local-First)
### Añadido
- Flujo de GitHub Actions completo (`ios-build.yml`) para generación automática de binarios `.ipa` (firmados y sin firmar) mediante `xcodebuild` / Expo Prebuild.
- Motor local SQLite habilitado (sin requerir compilaciones nativas personalizadas gracias a `node:sqlite`).
- UI "Dark Nexus" con barra de navegación difuminada estilo iOS (BlurView/Material).
- Refactor del ruteo a pestañas de Expo Router, manteniendo animaciones fluidas propias de iOS.

### Cambiado
- El backend externo quedó obsoleto; se sirven los datos directamente con API routes integradas de Expo (`+api.ts`) resolviendo el 100% del requerimiento offline-first en dispositivos móviles.

## [v1.0.0] - Fase 1 (Diseño Base)
### Añadido
- Tipografía Serif adaptada al motor de renderizado de texto de Apple.
- Paleta dimensional rígida (`#A78BFA` para THEORETICAL, `#67E8F9` para METHODOLOGICAL, etc.).
- Responsive split-view configurado por si se corre en iPads (>= 920px).
