import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppError } from '@/constants/config';

/* Estado async unico (auditoria Codex EH-02): antes cada pantalla tenia su
   propio trio de useState (loading/error/data) y un catch que dejaba el
   array en [] indistinguible de "de verdad no hay datos" — un fetch fallido
   se veia igual que una lista vacia. `error` y `empty` son ramas separadas. */
export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: AppError }
  | { status: 'empty'; data: T }
  | { status: 'success'; data: T };

type UseAsyncOptions<T> = {
  /** false: no dispara el fetch al montar; hay que llamar retry() a mano. Default true. */
  immediate?: boolean;
  /** Decide si el resultado exitoso cuenta como 'empty'. Default: array vacio. */
  isEmpty?: (data: T) => boolean;
};

const defaultIsEmpty = (data: unknown) => Array.isArray(data) && data.length === 0;

function normalizeError(error: unknown): AppError {
  if (error && typeof error === 'object' && 'kind' in error) return error as AppError;
  return { kind: 'network', message: (error as any)?.message ?? 'Unknown error.' };
}

/**
 * Hook comun de estado async (auditoria Codex, paso 2). `fn` debe ser
 * estable entre renders (el caller lo envuelve en su propio useCallback con
 * sus propias deps, como ya hacen review.tsx/node/[id].tsx/knowledge-graph.tsx
 * para su fallback de varios niveles) — su identidad es lo que dispara un
 * refetch. useAsync no reenvia un array de deps propio: el React Compiler de
 * este proyecto exige arrays de deps literales, asi que no hay forma segura
 * de reenviar un array arbitrario recibido por parametro.
 */
export function useAsync<T>(fn: () => Promise<T>, options: UseAsyncOptions<T> = {}) {
  const { immediate = true, isEmpty = defaultIsEmpty } = options;
  const [state, setState] = useState<AsyncState<T>>(immediate ? { status: 'loading' } : { status: 'idle' });
  const [retrying, setRetrying] = useState(false);

  // fn/isEmpty viajan por ref, actualizada en un efecto (nunca durante el
  // render) para que `run` tenga identidad estable sin violar la regla del
  // Compiler de no mutar refs durante el render.
  const fnRef = useRef(fn);
  const isEmptyRef = useRef(isEmpty);
  useEffect(() => {
    fnRef.current = fn;
    isEmptyRef.current = isEmpty;
  });

  const run = useCallback(async (isRetry = false) => {
    if (isRetry) setRetrying(true);
    else setState({ status: 'loading' });

    try {
      const data = await fnRef.current();
      setState(isEmptyRef.current(data) ? { status: 'empty', data } : { status: 'success', data });
    } catch (error) {
      setState({ status: 'error', error: normalizeError(error) });
    } finally {
      if (isRetry) setRetrying(false);
    }
  }, []);

  useEffect(() => {
    // Sincronizar con un sistema externo (el backend) es el uso previsto de un
    // efecto; el 'loading' sincronico de run() es lo que muestra el skeleton al refetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (immediate) run();
  }, [fn, immediate, run]);

  return { ...state, retrying, retry: () => run(true) };
}
