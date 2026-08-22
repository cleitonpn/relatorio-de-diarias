import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { colEmpresas, docEmpresa } from './db'
import { PLANOS } from './planos'
import type { Assinatura, Centavos, Empresa, PlanoId, StatusAssinatura, Usuario } from '@/types'

/** Subcoleções de um inquilino — usadas ao excluir uma conta por inteiro. */
const SUBCOLECOES = [
  'colaboradores',
  'contratantes',
  'feiras',
  'stands',
  'diarias',
  'custos',
  'vales',
  'pagamentos',
] as const

export interface ResumoConta {
  empresa: Empresa
  usuarios: Usuario[]
  diasRestantesTeste: number | null
  /** Preço que ela paga hoje, já com desconto aplicado. */
  precoEfetivo: Centavos
}

/** Carrega todas as contas da plataforma com os usuários de cada uma. */
export async function listarContas(): Promise<ResumoConta[]> {
  const [empresasSnap, usuariosSnap] = await Promise.all([
    getDocs(colEmpresas),
    getDocs(collection(db, 'usuarios')),
  ])

  const usuariosPorEmpresa = new Map<string, Usuario[]>()
  for (const d of usuariosSnap.docs) {
    const u = { ...d.data(), id: d.id } as Usuario
    const lista = usuariosPorEmpresa.get(u.empresaId) ?? []
    lista.push(u)
    usuariosPorEmpresa.set(u.empresaId, lista)
  }

  return empresasSnap.docs
    .map((d) => {
      const empresa = { ...d.data(), id: d.id } as Empresa
      const plano = PLANOS.find((p) => p.id === empresa.assinatura.plano) ?? PLANOS[0]
      const desconto = empresa.assinatura.descontoPercentual ?? 0
      return {
        empresa,
        usuarios: usuariosPorEmpresa.get(empresa.id) ?? [],
        diasRestantesTeste: empresa.assinatura.fimTeste
          ? Math.ceil((empresa.assinatura.fimTeste.toDate().getTime() - Date.now()) / 86_400_000)
          : null,
        precoEfetivo: Math.round(plano.precoMensal * (1 - desconto / 100)),
      }
    })
    .sort((a, b) => {
      const ta = a.empresa.criadaEm?.toMillis?.() ?? 0
      const tb = b.empresa.criadaEm?.toMillis?.() ?? 0
      return tb - ta
    })
}

/* ------------------------------ Métricas ------------------------------ */

export interface Metricas {
  total: number
  emTeste: number
  ativas: number
  inadimplentes: number
  canceladas: number
  /** Receita recorrente mensal das contas pagantes, já com desconto. */
  receitaMensal: Centavos
  /** Contas que entraram por indicação. */
  porIndicacao: number
}

export function calcularMetricas(contas: ResumoConta[]): Metricas {
  const conta = (s: StatusAssinatura) =>
    contas.filter((c) => c.empresa.assinatura.status === s).length

  return {
    total: contas.length,
    emTeste: conta('TESTE'),
    ativas: conta('ATIVA'),
    inadimplentes: conta('PENDENTE') + conta('SOMENTE_LEITURA'),
    canceladas: conta('CANCELADA'),
    receitaMensal: contas
      .filter((c) => c.empresa.assinatura.status === 'ATIVA')
      .reduce((t, c) => t + c.precoEfetivo, 0),
    porIndicacao: contas.filter((c) => !!c.empresa.indicadaPor).length,
  }
}

/* --------------------------- Ajustes de conta --------------------------- */

export interface AjusteAssinatura {
  plano?: PlanoId
  status?: StatusAssinatura
  /** Percentual de desconto (0–100). null limpa o desconto. */
  descontoPercentual?: number | null
  descontoMotivo?: string | null
  /** null = vitalício. */
  descontoAte?: Date | null
  /** Estende (ou encurta) o teste grátis para esta data. */
  fimTeste?: Date | null
}

export async function ajustarAssinatura(empresaId: string, atual: Assinatura, ajuste: AjusteAssinatura) {
  const nova: Assinatura = {
    ...atual,
    ...(ajuste.plano !== undefined && { plano: ajuste.plano }),
    ...(ajuste.status !== undefined && { status: ajuste.status }),
    ...(ajuste.descontoPercentual !== undefined && {
      descontoPercentual: ajuste.descontoPercentual,
    }),
    ...(ajuste.descontoMotivo !== undefined && { descontoMotivo: ajuste.descontoMotivo }),
    ...(ajuste.descontoAte !== undefined && {
      descontoAte: ajuste.descontoAte ? Timestamp.fromDate(ajuste.descontoAte) : null,
    }),
    ...(ajuste.fimTeste !== undefined && {
      fimTeste: ajuste.fimTeste ? Timestamp.fromDate(ajuste.fimTeste) : null,
    }),
  }
  await updateDoc(docEmpresa(empresaId), { assinatura: nova })
}

/** Estende o teste grátis em N dias a partir de hoje. */
export async function estenderTeste(empresaId: string, atual: Assinatura, dias: number) {
  const novaData = new Date()
  novaData.setDate(novaData.getDate() + dias)
  await ajustarAssinatura(empresaId, atual, { fimTeste: novaData, status: 'TESTE' })
}

/* ------------------------------ Exclusão ------------------------------ */

export interface ProgressoExclusao {
  colecao: string
  apagados: number
}

/**
 * Apaga uma conta inteira: subcoleções, perfis de usuário e a empresa.
 *
 * Feito em lotes a partir do app porque o volume aqui é pequeno (dezenas de
 * milhares de documentos, no pior caso). Se a base crescer muito, isso deve
 * virar uma Cloud Function com exclusão recursiva do lado do servidor.
 *
 * Não tem volta. Quem chama precisa confirmar antes.
 */
export async function excluirConta(
  empresaId: string,
  aoProgredir?: (p: ProgressoExclusao) => void,
): Promise<number> {
  let total = 0

  for (const nome of SUBCOLECOES) {
    const snap = await getDocs(collection(db, 'empresas', empresaId, nome))
    for (let i = 0; i < snap.docs.length; i += 450) {
      const fatia = snap.docs.slice(i, i + 450)
      const batch = writeBatch(db)
      for (const d of fatia) batch.delete(d.ref)
      await batch.commit()
    }
    total += snap.size
    aoProgredir?.({ colecao: nome, apagados: snap.size })
  }

  // Perfis de usuário ligados a essa empresa
  const usuarios = await getDocs(
    query(collection(db, 'usuarios'), where('empresaId', '==', empresaId)),
  )
  for (const d of usuarios.docs) await deleteDoc(d.ref)
  total += usuarios.size
  aoProgredir?.({ colecao: 'usuarios', apagados: usuarios.size })

  await deleteDoc(doc(db, 'empresas', empresaId))
  total += 1

  return total
}

/* ---------------------------- Indicações ---------------------------- */

export interface Indicacao {
  indicador: Empresa
  indicado: Empresa
  /** O indicado virou pagante — é a condição para o prêmio sair. */
  indicadoPagou: boolean
  premioLiberado: boolean
}

/**
 * Cruza quem indicou com quem entrou.
 *
 * A regra que evita fraude: o crédito do indicador só é liberado quando o
 * indicado PAGA a primeira mensalidade. Liberar no cadastro faria qualquer um
 * abrir dez contas falsas e ganhar dez meses.
 */
export function montarIndicacoes(contas: ResumoConta[]): Indicacao[] {
  const porCodigo = new Map<string, Empresa>()
  for (const c of contas) porCodigo.set(c.empresa.codigoIndicacao, c.empresa)

  const lista: Indicacao[] = []
  for (const c of contas) {
    const codigo = c.empresa.indicadaPor
    if (!codigo) continue
    const indicador = porCodigo.get(codigo)
    if (!indicador) continue
    lista.push({
      indicador,
      indicado: c.empresa,
      indicadoPagou: c.empresa.assinatura.status === 'ATIVA',
      premioLiberado: c.empresa.premioIndicacaoLiberado === true,
    })
  }
  return lista.sort((a, b) => Number(a.premioLiberado) - Number(b.premioLiberado))
}

/** Quantas indicações pagantes cada conta já trouxe. */
export function contarIndicacoesPagantes(indicacoes: Indicacao[]): Map<string, number> {
  const mapa = new Map<string, number>()
  for (const i of indicacoes) {
    if (!i.indicadoPagou) continue
    mapa.set(i.indicador.id, (mapa.get(i.indicador.id) ?? 0) + 1)
  }
  return mapa
}

/**
 * Credita o prêmio ao indicador e marca a indicação como paga.
 *
 * As duas escritas vão no mesmo lote: ou o crédito entra e a marca é gravada,
 * ou nada acontece. Sem isso, uma falha no meio deixaria a porta aberta para
 * creditar o mesmo prêmio de novo.
 */
export async function liberarPremioIndicacao(indicador: Empresa, indicadoId: string, meses = 1) {
  const lote = writeBatch(db)
  lote.update(docEmpresa(indicador.id), {
    'assinatura.creditoMeses': (indicador.assinatura.creditoMeses ?? 0) + meses,
  })
  lote.update(docEmpresa(indicadoId), { premioIndicacaoLiberado: true })
  await lote.commit()
}

/** Gasta um mês de crédito acumulado (usado quando a cobrança entrar). */
export async function consumirCredito(empresa: Empresa, meses = 1) {
  const restante = Math.max(0, (empresa.assinatura.creditoMeses ?? 0) - meses)
  await updateDoc(docEmpresa(empresa.id), { 'assinatura.creditoMeses': restante })
}
