import { orderBy, where } from 'firebase/firestore'
import { useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  colColaboradores,
  colContratantes,
  colCustos,
  colDiarias,
  colFeiras,
  colPagamentos,
  colStands,
  colVales,
} from '@/lib/db'
import { useColecao } from './useColecao'
import type { Colaborador, Contratante, Custo, Diaria, Feira, Pagamento, Stand, Vale } from '@/types'

function useEmpresaIdOpcional(): string | null {
  const { perfil } = useAuth()
  return perfil?.empresaId ?? null
}

export function useColaboradores(apenasAtivos = true) {
  const empresaId = useEmpresaIdOpcional()
  const estado = useColecao<Colaborador>(
    empresaId ? colColaboradores(empresaId) : null,
    [orderBy('nome')],
    [empresaId],
  )
  const dados = useMemo(
    () => (apenasAtivos ? estado.dados.filter((c) => c.ativo) : estado.dados),
    [estado.dados, apenasAtivos],
  )
  return { ...estado, dados }
}

export function useContratantes() {
  const empresaId = useEmpresaIdOpcional()
  return useColecao<Contratante>(
    empresaId ? colContratantes(empresaId) : null,
    [orderBy('nome')],
    [empresaId],
  )
}

export function useFeiras() {
  const empresaId = useEmpresaIdOpcional()
  return useColecao<Feira>(
    empresaId ? colFeiras(empresaId) : null,
    [orderBy('dataInicio', 'desc')],
    [empresaId],
  )
}

export function useStands(feiraId: string | null) {
  const empresaId = useEmpresaIdOpcional()
  return useColecao<Stand>(
    empresaId && feiraId ? colStands(empresaId) : null,
    feiraId ? [where('feiraId', '==', feiraId)] : [],
    [empresaId, feiraId],
  )
}

export function useDiarias(feiraId: string | null) {
  const empresaId = useEmpresaIdOpcional()
  return useColecao<Diaria>(
    empresaId && feiraId ? colDiarias(empresaId) : null,
    feiraId ? [where('feiraId', '==', feiraId)] : [],
    [empresaId, feiraId],
  )
}

export function useDiariasDoDia(data: string) {
  const empresaId = useEmpresaIdOpcional()
  return useColecao<Diaria>(
    empresaId ? colDiarias(empresaId) : null,
    [where('data', '==', data)],
    [empresaId, data],
  )
}

export function useCustos(feiraId: string | null) {
  const empresaId = useEmpresaIdOpcional()
  return useColecao<Custo>(
    empresaId && feiraId ? colCustos(empresaId) : null,
    feiraId ? [where('feiraId', '==', feiraId)] : [],
    [empresaId, feiraId],
  )
}

export function useVales(status?: Vale['status']) {
  const empresaId = useEmpresaIdOpcional()
  const estado = useColecao<Vale>(empresaId ? colVales(empresaId) : null, [], [empresaId])
  const dados = useMemo(
    () => (status ? estado.dados.filter((v) => v.status === status) : estado.dados),
    [estado.dados, status],
  )
  return { ...estado, dados }
}

export function usePagamentos() {
  const empresaId = useEmpresaIdOpcional()
  return useColecao<Pagamento>(empresaId ? colPagamentos(empresaId) : null, [], [empresaId])
}

/* ------------- Leituras amplas, para o consolidado por período ------------- */

export function useTodasDiarias() {
  const empresaId = useEmpresaIdOpcional()
  return useColecao<Diaria>(empresaId ? colDiarias(empresaId) : null, [], [empresaId])
}

export function useTodosCustos() {
  const empresaId = useEmpresaIdOpcional()
  return useColecao<Custo>(empresaId ? colCustos(empresaId) : null, [], [empresaId])
}

export function useTodosStands() {
  const empresaId = useEmpresaIdOpcional()
  return useColecao<Stand>(empresaId ? colStands(empresaId) : null, [], [empresaId])
}

/**
 * Diárias de TODAS as feiras dentro de um intervalo de datas.
 *
 * Usado para detectar conflito: a mesma pessoa escalada no mesmo dia em duas
 * feiras diferentes. Sem isso, um toque errado duplica alguém e a conta do
 * pagamento sai errada nas duas pontas.
 */
export function useDiariasNoPeriodo(de: string, ate: string) {
  const empresaId = useEmpresaIdOpcional()
  return useColecao<Diaria>(
    empresaId ? colDiarias(empresaId) : null,
    [where('data', '>=', de), where('data', '<=', ate)],
    [empresaId, de, ate],
  )
}
