/**
 * Leitura da telemetria — o lado do painel.
 *
 * `telemetria.ts` escreve; este arquivo lê e transforma contagem crua em
 * pergunta respondida. As perguntas que ele responde são estas, nesta ordem
 * de importância:
 *
 *  1. Quantas contas usaram o app de verdade esta semana?
 *  2. Onde elas param? (funil: entrou → cadastrou equipe → cadastrou feira →
 *     escalou → pagou)
 *  3. Que fluxo elas abrem e não terminam?
 *  4. Que erro elas veem?
 *
 * Nada aqui envolve dinheiro. O painel financeiro é outra tela, com outra
 * fonte de dados.
 */

import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore'
import { db } from './firebase'
import { hojeISO, somarDias } from './format'
import { SEPARADOR, type Fluxo, type NomeEvento } from './telemetria'
import type { DataISO, Papel } from '@/types'

export interface LinhaDia {
  empresaId: string
  dia: DataISO
  interno: boolean
  plataforma: string
  versao: string
  /** Chave de contador → quantas vezes. Ver `chavesDeContagem`. */
  contagem: Record<string, number>
}

export interface LoteEventos {
  id: string
  empresaId: string
  papel: Papel
  plataforma: string
  dia: DataISO
  sessao: string
  eventos: { nome: string; em: number; [campo: string]: unknown }[]
}

/**
 * Carrega os dias de uso a partir de uma data.
 *
 * Uma linha por conta por dia — com dez contas e trinta dias são trezentos
 * documentos, o que mantém o painel barato mesmo abrindo várias vezes ao dia.
 */
export async function carregarUso(dias = 30): Promise<LinhaDia[]> {
  const desde = somarDias(hojeISO(), -dias)
  const snap = await getDocs(
    query(collection(db, 'uso_diario'), where('dia', '>=', desde), orderBy('dia', 'desc')),
  )
  return snap.docs.map((d) => {
    const dado = d.data() as Partial<LinhaDia>
    return {
      empresaId: dado.empresaId ?? '',
      dia: dado.dia ?? '',
      interno: dado.interno === true,
      plataforma: dado.plataforma ?? 'web',
      versao: dado.versao ?? '?',
      contagem: (dado.contagem ?? {}) as Record<string, number>,
    }
  })
}

/** Detalhe de uma conta: a sequência real de telas e ações, para investigar. */
export async function carregarLotes(empresaId: string, quantos = 25): Promise<LoteEventos[]> {
  const snap = await getDocs(
    query(
      collection(db, 'uso_lotes'),
      where('empresaId', '==', empresaId),
      orderBy('criadoEm', 'desc'),
      limit(quantos),
    ),
  )
  return snap.docs.map((d) => {
    const dado = d.data() as Partial<LoteEventos>
    return {
      id: d.id,
      empresaId: dado.empresaId ?? empresaId,
      papel: dado.papel ?? 'DONO',
      plataforma: dado.plataforma ?? 'web',
      dia: dado.dia ?? '',
      sessao: dado.sessao ?? '',
      eventos: dado.eventos ?? [],
    }
  })
}

/* ─────────────────────────────── Agregação ─────────────────────────────── */

/**
 * O funil de ativação.
 *
 * É o caminho do dinheiro: a conta que chega até o último degrau usou o app
 * para pagar alguém de verdade — e essa é a única prova de que o produto
 * funciona na mão de quem não foi treinado por ninguém.
 */
export const DEGRAUS: { evento: NomeEvento | 'qualquer'; rotulo: string }[] = [
  { evento: 'qualquer', rotulo: 'Abriu o app' },
  { evento: 'colaborador_criado', rotulo: 'Cadastrou a equipe' },
  { evento: 'feira_criada', rotulo: 'Cadastrou uma feira' },
  { evento: 'escala_criada', rotulo: 'Escalou alguém' },
  { evento: 'pagamento_fechado', rotulo: 'Fechou um pagamento' },
]

export const ROTULO_FLUXO: Record<Fluxo, string> = {
  nova_feira: 'Nova feira',
  novo_stand: 'Novo stand',
  escala: 'Escalar equipe',
  novo_custo: 'Lançar gasto',
  novo_colaborador: 'Cadastrar pessoa',
  fechar_pagamento: 'Fechar pagamento',
  recebimento: 'Registrar recebimento',
  convite: 'Convidar para o app',
  onboarding: 'Criar a conta',
}

export interface Contagem {
  chave: string
  vezes: number
  /** Em quantas contas diferentes aconteceu. Separa uso real de um usuário só. */
  contas: number
}

export interface UsoDeFluxo {
  fluxo: Fluxo
  iniciados: number
  concluidos: number
  abandonados: number
  /** Fração de 0 a 1. `null` quando ninguém abriu esse fluxo ainda. */
  conclusao: number | null
}

export interface ResumoUso {
  /** Contas com pelo menos um evento no período. */
  contas: number
  contasNaSemana: number
  eventos: number
  funil: { rotulo: string; contas: number; fracao: number }[]
  fluxos: UsoDeFluxo[]
  telas: Contagem[]
  erros: Contagem[]
  /** Uma barra por dia: quantas contas mexeram no app. */
  porDia: { dia: DataISO; contas: number; eventos: number }[]
  plataformas: Contagem[]
}

/**
 * Junta as linhas diárias num retrato do período.
 *
 * As contas internas (a administração testando) ficam de fora por padrão: são
 * as que mais clicam e as que menos representam o cliente.
 */
export function resumirUso(linhas: LinhaDia[], incluirInternas = false): ResumoUso {
  const uteis = incluirInternas ? linhas : linhas.filter((l) => !l.interno)
  const inicioSemana = somarDias(hojeISO(), -7)

  const contas = new Set<string>()
  const contasNaSemana = new Set<string>()
  const porDia = new Map<DataISO, { contas: Set<string>; eventos: number }>()
  /** chave de contador → { vezes, contas } */
  const total = new Map<string, { vezes: number; contas: Set<string> }>()
  let eventos = 0

  for (const linha of uteis) {
    contas.add(linha.empresaId)
    if (linha.dia >= inicioSemana) contasNaSemana.add(linha.empresaId)

    const dia = porDia.get(linha.dia) ?? { contas: new Set<string>(), eventos: 0 }
    dia.contas.add(linha.empresaId)

    for (const [chave, vezes] of Object.entries(linha.contagem)) {
      if (typeof vezes !== 'number') continue
      const acc = total.get(chave) ?? { vezes: 0, contas: new Set<string>() }
      acc.vezes += vezes
      acc.contas.add(linha.empresaId)
      total.set(chave, acc)
      // Só as chaves sem dimensão entram no total, senão cada evento conta duas vezes.
      if (!chave.includes(SEPARADOR)) {
        eventos += vezes
        dia.eventos += vezes
      }
    }

    porDia.set(linha.dia, dia)
  }

  const contasDe = (chave: string) => total.get(chave)?.contas.size ?? 0
  const vezesDe = (chave: string) => total.get(chave)?.vezes ?? 0

  const base = contas.size || 1
  const funil = DEGRAUS.map((d) => {
    const quantas = d.evento === 'qualquer' ? contas.size : contasDe(d.evento)
    return { rotulo: d.rotulo, contas: quantas, fracao: quantas / base }
  })

  const fluxos = (Object.keys(ROTULO_FLUXO) as Fluxo[])
    .map<UsoDeFluxo>((fluxo) => {
      const iniciados = vezesDe(`fluxo_iniciado${SEPARADOR}${fluxo}`)
      const concluidos = vezesDe(`fluxo_concluido${SEPARADOR}${fluxo}`)
      const abandonados = vezesDe(`fluxo_abandonado${SEPARADOR}${fluxo}`)
      const fechados = concluidos + abandonados
      return {
        fluxo,
        iniciados,
        concluidos,
        abandonados,
        conclusao: fechados > 0 ? concluidos / fechados : null,
      }
    })
    .sort((a, b) => b.abandonados - a.abandonados || b.iniciados - a.iniciados)

  const comPrefixo = (prefixo: string): Contagem[] =>
    [...total.entries()]
      .filter(([chave]) => chave.startsWith(prefixo + SEPARADOR))
      .map(([chave, acc]) => ({
        chave: chave.slice(prefixo.length + SEPARADOR.length),
        vezes: acc.vezes,
        contas: acc.contas.size,
      }))
      .sort((a, b) => b.vezes - a.vezes)

  const plataformas = [...uteis.reduce((mapa, l) => {
    const acc = mapa.get(l.plataforma) ?? new Set<string>()
    acc.add(l.empresaId)
    mapa.set(l.plataforma, acc)
    return mapa
  }, new Map<string, Set<string>>())]
    .map(([chave, contas]) => ({ chave, vezes: contas.size, contas: contas.size }))
    .sort((a, b) => b.vezes - a.vezes)

  return {
    contas: contas.size,
    contasNaSemana: contasNaSemana.size,
    eventos,
    funil,
    fluxos,
    telas: comPrefixo('tela'),
    erros: comPrefixo('erro'),
    porDia: [...porDia.entries()]
      .map(([dia, d]) => ({ dia, contas: d.contas.size, eventos: d.eventos }))
      .sort((a, b) => a.dia.localeCompare(b.dia)),
    plataformas,
  }
}

/**
 * Contas que abriram o app e nunca chegaram a escalar ninguém.
 *
 * É a lista de quem ligar. Empreiteiro que cadastrou a feira e parou ali não
 * desistiu do produto — ele travou em alguma coisa, e ninguém vai escrever
 * para contar o quê.
 */
export function contasTravadas(linhas: LinhaDia[]): { empresaId: string; ultimoDia: DataISO; chegouEm: string }[] {
  const porConta = new Map<string, { ultimoDia: DataISO; chaves: Set<string> }>()

  for (const linha of linhas) {
    if (linha.interno) continue
    const acc = porConta.get(linha.empresaId) ?? { ultimoDia: linha.dia, chaves: new Set<string>() }
    if (linha.dia > acc.ultimoDia) acc.ultimoDia = linha.dia
    for (const chave of Object.keys(linha.contagem)) acc.chaves.add(chave)
    porConta.set(linha.empresaId, acc)
  }

  const travadas: { empresaId: string; ultimoDia: DataISO; chegouEm: string }[] = []
  for (const [empresaId, acc] of porConta) {
    if (acc.chaves.has('pagamento_fechado')) continue
    // O degrau mais alto que ela alcançou.
    let chegouEm = DEGRAUS[0].rotulo
    for (const d of DEGRAUS) {
      if (d.evento !== 'qualquer' && acc.chaves.has(d.evento)) chegouEm = d.rotulo
    }
    travadas.push({ empresaId, ultimoDia: acc.ultimoDia, chegouEm })
  }
  return travadas.sort((a, b) => b.ultimoDia.localeCompare(a.ultimoDia))
}
