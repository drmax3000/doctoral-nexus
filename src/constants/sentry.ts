import * as Sentry from '@sentry/react-native';
import type { Breadcrumb, ErrorEvent } from '@sentry/react-native';

/* Reporte de errores de produccion (documentacion_tecnica/PLAN_ERROR_HANDLING_UX.md,
   paso 5 de la auditoria Codex). DSN publico por env var (EXPO_PUBLIC_*, se
   incorpora al bundle por diseno de Expo — mismo patron que EXPO_PUBLIC_API_URL
   en config.ts, un DSN de cliente esta pensado para ser publico). Sin la var,
   initSentry() no hace nada y la app funciona identico a hoy.

   Politica de privacidad acordada (misma que backend/main.py):
   - sendDefaultPii en false: sin IP/user automatico.
   - beforeSend/beforeBreadcrumb descartan cualquier body de request que
     pudiera venir adjunto (el texto de observaciones/relaciones es
     contenido de tesis del usuario, nunca debe salir del dispositivo).
   - sin session replay, sin profiling, sin tracesSampleRate (sin
     performance monitoring) hasta que se revise explicitamente.
   - solo se reporta lo que los ErrorBoundary (route-error-fallback.tsx,
     boundary.tsx) capturan explicitamente via reportError() — los AppError
     normales (backend caido, 404, etc.) ya tienen su propia UI (ErrorCard)
     y NO se mandan a Sentry: son estados esperados, no bugs. */

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';

function stripRequestBody(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    delete event.request.data;
  }
  return event;
}

function stripBreadcrumbBody(breadcrumb: Breadcrumb): Breadcrumb {
  const data = breadcrumb.data as Record<string, unknown> | undefined;
  if (data) {
    delete data.body;
    delete data.data;
  }
  return breadcrumb;
}

export function initSentry() {
  if (!SENTRY_DSN) return;
  Sentry.init({
    dsn: SENTRY_DSN,
    sendDefaultPii: false,
    beforeSend: (event: ErrorEvent) => stripRequestBody(event),
    beforeBreadcrumb: (breadcrumb: Breadcrumb) => stripBreadcrumbBody(breadcrumb),
  });
}

/** Reporta un error ya capturado por un boundary (route-error-fallback.tsx, boundary.tsx).
 *  No-op si no hay DSN configurado. Nunca pasar texto de usuario en `context`. */
export function reportError(error: unknown, context?: Record<string, unknown>) {
  if (!SENTRY_DSN) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
