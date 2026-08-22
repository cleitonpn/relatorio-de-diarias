import { useEffect, useMemo, useState } from 'react'
import {
  onSnapshot,
  query,
  type Query,
  type QueryConstraint,
  type CollectionReference,
} from 'firebase/firestore'

interface Estado<T> {
  dados: T[]
  carregando: boolean
  erro: Error | null
}

/**
 * Escuta uma coleção em tempo real.
 *
 * Com o cache persistente ligado no firebase.ts, o primeiro retorno vem do
 * dispositivo (instantâneo, funciona sem sinal) e o servidor atualiza depois.
 */
export function useColecao<T extends { id: string }>(
  referencia: CollectionReference<T> | Query<T> | null,
  restricoes: QueryConstraint[] = [],
  // eslint-disable-next-line react-hooks/exhaustive-deps
  dependencias: unknown[] = [],
): Estado<T> {
  const [estado, setEstado] = useState<Estado<T>>({ dados: [], carregando: true, erro: null })

  useEffect(() => {
    if (!referencia) {
      setEstado({ dados: [], carregando: false, erro: null })
      return
    }
    const consulta = restricoes.length ? query(referencia, ...restricoes) : referencia
    return onSnapshot(
      consulta,
      (snap) => {
        setEstado({
          dados: snap.docs.map((d) => ({ ...d.data(), id: d.id }) as T),
          carregando: false,
          erro: null,
        })
      },
      (erro) => setEstado({ dados: [], carregando: false, erro: erro as Error }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencias)

  return estado
}

/** Índice por id, para achar rápido sem varrer a lista. */
export function useIndice<T extends { id: string }>(itens: T[]): Record<string, T> {
  return useMemo(() => {
    const mapa: Record<string, T> = {}
    for (const item of itens) mapa[item.id] = item
    return mapa
  }, [itens])
}
