/**
 * Telemetria de uso — o que o app aprende sobre si mesmo.
 *
 * O produto se sustenta numa aposta: que um empreiteiro com pouca escolaridade
 * consegue usar isso sozinho, no celular, dentro de um pavilhão. Ou a aposta se
 * confirma na tela dele, ou não se confirma em lugar nenhum. Perguntar não
 * resolve — ninguém sabe dizer onde travou, e quem trava some sem reclamar.
 *
 * Então o app mede a si mesmo: quais telas ele abre, quais fluxos ele começa e
 * NÃO termina, onde dá erro, quanto tempo leva do cadastro até o primeiro
 * pagamento fechado.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  O QUE NUNCA ENTRA AQUI
 * ─────────────────────────────────────────────────────────────────────────
 *  · valor em dinheiro — nenhum. Nem diária, nem contrato, nem lucro.
 *  · nome de pessoa, de empresa, de contratante ou de feira.
 *  · chave PIX, CPF, telefone, e-mail, foto.
 *  · texto livre digitado pelo usuário.
 *
 * Isso não é promessa de comentário: é o tipo `Evento` abaixo. Ele é uma união
 * fechada, e cada campo é `number`, `boolean` ou uma string de lista fechada.
 * Não existe assinatura em que caiba um valor ou um nome — o TypeScript recusa
 * antes de compilar. É a única forma de garantia que sobrevive a pressa.
 *
 * O que entra é contagem e estrutura: "escalou 3 pessoas em 3 dias", nunca
 * "escalou o Jorge a R$ 200".
 */

import { doc, increment, serverTimestamp, Timestamp, writeBatch } from 'firebase/firestore'
import { db } from './firebase'
import { hojeISO } from './format'
import { PLATAFORMA } from './platform'
import type { Saude } from './calc'
import type { CategoriaCusto, Papel, Presenca, TipoChavePix } from '@/types'

/* ────────────────────────────── Vocabulário ────────────────────────────── */

/** Telas do app. Lista fechada: nunca um caminho de URL cru. */
export type Tela =
  | 'hoje'
  | 'feiras'
  | 'feira'
  | 'dinheiro'
  | 'equipe'
  | 'pagamentos'
  | 'ajustes'
  | 'contador'
  | 'vale-a-pena'
  | 'admin'
  | 'minha-conta'
  | 'termos'
  | 'onboarding'

/**
 * Fluxos de várias etapas. São eles que revelam a fricção: o app registra
 * quando o fluxo começa e quando termina, e a diferença entre os dois é
 * exatamente a lista de coisas que o empreiteiro tentou fazer e desistiu.
 */
export type Fluxo =
  | 'nova_feira'
  | 'novo_stand'
  | 'escala'
  | 'novo_custo'
  | 'novo_colaborador'
  | 'fechar_pagamento'
  | 'recebimento'
  | 'convite'
  | 'onboarding'

/** Como o stand foi precificado. Estrutura, não valor. */
export type Precificacao = 'M2' | 'FECHADO'

export type Evento =
  /* ── Ciclo de vida ─────────────────────────────────────────────────── */
  | { nome: 'app_aberto'; instalado: boolean; largura: number }
  | { nome: 'tela'; tela: Tela }

  /* ── Fricção: o que ele começou e o que ele terminou ───────────────── */
  | { nome: 'fluxo_iniciado'; fluxo: Fluxo }
  | { nome: 'fluxo_concluido'; fluxo: Fluxo; segundos: number }
  | { nome: 'fluxo_abandonado'; fluxo: Fluxo; segundos: number }
  /**
   * Erro mostrado na cara do usuário. `codigo` vem sempre de `codigoDoErro()`,
   * que devolve o código técnico do Firebase — nunca a mensagem, que é texto
   * livre e pode carregar dado de quem estava usando.
   */
  | { nome: 'erro'; tela: Tela | 'fora'; codigo: string }

  /* ── Marcos do negócio (contagens, jamais valores) ─────────────────── */
  | { nome: 'conta_criada'; temPrecoM2: boolean; porIndicacao: boolean }
  | { nome: 'colaborador_criado' }
  | { nome: 'feira_criada'; pacote: boolean; temCalendario: boolean; dias: number }
  | { nome: 'feira_apagada' }
  | { nome: 'stand_criado'; precificacao: Precificacao }
  | { nome: 'escala_criada'; pessoas: number; dias: number; diarias: number }
  | { nome: 'conflito_detectado'; pessoas: number }
  | { nome: 'conflito_resolvido'; transferiu: boolean }
  | { nome: 'presenca_marcada'; presenca: Presenca }
  | { nome: 'custo_lancado'; categoria: CategoriaCusto }
  | { nome: 'pagamento_fechado'; diarias: number; comVale: boolean }
  | { nome: 'pix_copiado'; tipoChave: TipoChavePix }
  | { nome: 'vale_pedido'; porColaborador: boolean }
  | { nome: 'vale_respondido'; aprovado: boolean }
  | { nome: 'recebimento_registrado'; integral: boolean }
  | { nome: 'contador_exportado'; formato: 'csv' | 'texto' }
  | { nome: 'calculadora_usada'; veredito: Saude; temPrecoM2: boolean }
  | { nome: 'convite_criado'; papel: Papel }
  | { nome: 'convite_aceito'; papel: Papel }

/** Nome de evento — usado pelo painel para montar as contagens. */
export type NomeEvento = Evento['nome']

/* ─────────────────────────────── Contexto ─────────────────────────────── */

interface Contexto {
  empresaId: string
  uid: string
  papel: Papel
  /** Conta da administração da plataforma: medida, mas separada dos números. */
  interno: boolean
  /** O dono desligou a coleta nos Ajustes. */
  desligado: boolean
}

let contexto: Contexto | null = null

/**
 * Liga a coleta. Chamado quando o perfil e a empresa terminam de carregar —
 * antes disso o app não sabe de quem é o uso, e evento sem dono não serve.
 */
export function definirContexto(novo: Contexto | null) {
  const mudouDeConta = contexto?.empresaId !== novo?.empresaId
  contexto = novo
  if (novo?.desligado) {
    esvaziarBuffer()
    return
  }
  if (novo && mudouDeConta) void enviar()
}

/* ──────────────────────────────── Buffer ──────────────────────────────── */

interface Registrado {
  /** Milissegundos desde a época. O painel só usa para ordenar. */
  em: number
  [campo: string]: unknown
}

const CHAVE_BUFFER = 'prumo:uso'
const CHAVE_SESSAO = 'prumo:uso:sessao'
/** Quantos eventos acumular antes de mandar. */
const LOTE = 20
/** Nunca deixar o usuário esperando: manda sozinho depois disso. */
const ESPERA_MS = 15_000
/**
 * Teto do buffer. Um celular pode passar três dias de feira sem sinal; o que
 * não couber é descartado do fim mais antigo, nunca acumulado sem limite.
 */
const TETO = 300

let buffer: Registrado[] = lerBuffer()
let relogio: ReturnType<typeof setTimeout> | null = null
let enviando = false

function lerBuffer(): Registrado[] {
  try {
    const cru = localStorage.getItem(CHAVE_BUFFER)
    const lido: unknown = cru ? JSON.parse(cru) : []
    return Array.isArray(lido) ? (lido as Registrado[]) : []
  } catch {
    return []
  }
}

function gravarBuffer() {
  try {
    localStorage.setItem(CHAVE_BUFFER, JSON.stringify(buffer))
  } catch {
    /* modo anônimo, cota cheia: telemetria nunca pode quebrar o app */
  }
}

function esvaziarBuffer() {
  buffer = []
  try {
    localStorage.removeItem(CHAVE_BUFFER)
  } catch {
    /* idem */
  }
}

/** Identificador da sessão. Vive só enquanto a aba vive — não rastreia ninguém. */
function sessao(): string {
  try {
    let id = sessionStorage.getItem(CHAVE_SESSAO)
    if (!id) {
      id = Math.random().toString(36).slice(2, 10)
      sessionStorage.setItem(CHAVE_SESSAO, id)
    }
    return id
  } catch {
    return 'anon'
  }
}

/* ─────────────────────────────── Registro ─────────────────────────────── */

/**
 * Anota um evento. Barato, síncrono e à prova de falha: se qualquer coisa der
 * errado aqui dentro, o app segue como se nada tivesse acontecido. Medir o
 * produto nunca pode custar o produto.
 */
export function registrar(evento: Evento) {
  try {
    if (contexto?.desligado) return
    buffer.push({ ...evento, em: Date.now() })
    if (buffer.length > TETO) buffer = buffer.slice(-TETO)
    gravarBuffer()

    if (buffer.length >= LOTE) {
      void enviar()
      return
    }
    if (!relogio) {
      relogio = setTimeout(() => {
        relogio = null
        void enviar()
      }, ESPERA_MS)
    }
  } catch {
    /* silêncio proposital */
  }
}

/**
 * Manda o que estiver acumulado.
 *
 * Grava um lote (a sequência, para entender o caminho que ele fez) e, no mesmo
 * batch, incrementa um contador do dia (o agregado barato que o painel lê).
 * Dois documentos por envio, não um por clique.
 *
 * Offline, o Firestore guarda a escrita no aparelho e sincroniza quando o sinal
 * volta — a mesma persistência que faz o app funcionar dentro do pavilhão.
 */
export async function enviar(): Promise<void> {
  if (enviando || !contexto || contexto.desligado || buffer.length === 0) return
  // Sem sinal, o buffer local segura. Enfileirar dezenas de escritas dentro do
  // pavilhão só faria a telemetria disputar a fila de sincronização com o que
  // realmente importa: a diária que ele acabou de lançar.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return
  const ctx = contexto
  const eventos = buffer
  buffer = []
  gravarBuffer()
  enviando = true

  if (relogio) {
    clearTimeout(relogio)
    relogio = null
  }

  try {
    const dia = hojeISO()
    const lote = writeBatch(db)

    // Detalhe: a sequência do que ele fez, com prazo de validade.
    lote.set(doc(db, 'uso_lotes', `${ctx.empresaId}_${Date.now()}_${sessao()}`), {
      empresaId: ctx.empresaId,
      uid: ctx.uid,
      papel: ctx.papel,
      interno: ctx.interno,
      sessao: sessao(),
      plataforma: PLATAFORMA,
      versao: VERSAO_APP,
      dia,
      eventos,
      criadoEm: serverTimestamp(),
      // O Firestore apaga sozinho (política de TTL neste campo). Telemetria
      // velha não responde nenhuma pergunta e só custa armazenamento.
      expiraEm: Timestamp.fromMillis(Date.now() + 90 * 86_400_000),
    })

    // Agregado: uma linha por conta por dia. É o que o painel lê primeiro.
    const contagem: Record<string, unknown> = {}
    for (const e of eventos) {
      for (const chave of chavesDeContagem(e)) {
        contagem[chave] = increment(1)
      }
    }
    lote.set(
      doc(db, 'uso_diario', `${ctx.empresaId}_${dia}`),
      {
        empresaId: ctx.empresaId,
        dia,
        interno: ctx.interno,
        plataforma: PLATAFORMA,
        versao: VERSAO_APP,
        contagem,
        atualizadoEm: serverTimestamp(),
      },
      { merge: true },
    )

    // Não esperamos a confirmação do servidor. O Firestore já gravou o lote no
    // aparelho e sincroniza sozinho; ficar esperando travaria toda a fila
    // seguinte no primeiro momento em que o sinal oscila.
    lote.commit().catch(() => {
      // Recusa das regras, cota, o que for: descarta. Insistir num evento que
      // o servidor não aceita só faz o app tentar para sempre.
    })
  } catch {
    /* telemetria nunca derruba o app */
  } finally {
    enviando = false
  }
}

/** Versão do app, para separar "isso quebrou" de "isso quebrava". */
export const VERSAO_APP = '0.2'

/**
 * Para alguns eventos, o nome sozinho não responde nada: saber que houve 40
 * abandonos não diz onde. Nesses casos o contador guarda também a dimensão que
 * importa — `fluxo_abandonado:nova_feira` — além do total sem dimensão.
 *
 * Só entram aqui campos de lista fechada. Nada que o usuário digite.
 */
const DIMENSAO: Partial<Record<NomeEvento, string>> = {
  tela: 'tela',
  fluxo_iniciado: 'fluxo',
  fluxo_concluido: 'fluxo',
  fluxo_abandonado: 'fluxo',
  erro: 'codigo',
  custo_lancado: 'categoria',
  calculadora_usada: 'veredito',
  convite_criado: 'papel',
  pix_copiado: 'tipoChave',
}

export const SEPARADOR = ':'

/** As chaves de contador que um evento alimenta. */
export function chavesDeContagem(evento: Registrado | Evento): string[] {
  const nome = String((evento as { nome: unknown }).nome)
  const campo = DIMENSAO[nome as NomeEvento]
  if (!campo) return [nome]
  const valor = (evento as Record<string, unknown>)[campo]
  if (typeof valor !== 'string' || !valor) return [nome]
  return [nome, `${nome}${SEPARADOR}${valor}`]
}

/* ────────────────────────── Momentos de descarga ────────────────────────── */

if (typeof document !== 'undefined') {
  // Fechar a aba, trocar de app, bloquear a tela: é aqui que dá para perder o
  // que estava acumulado, então é aqui que se manda.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void enviar()
  })
  window.addEventListener('pagehide', () => {
    void enviar()
  })
  // O sinal voltou: manda o que ficou represado no pavilhão.
  window.addEventListener('online', () => {
    void enviar()
  })
}

/* ──────────────────────────── Onde ele está ──────────────────────────── */

let telaAtual: Tela | 'fora' = 'fora'

/** Troca de tela. O painel usa isso para desenhar o caminho que ele faz. */
export function definirTela(tela: Tela) {
  if (tela === telaAtual) return
  telaAtual = tela
  registrar({ nome: 'tela', tela })
}

/**
 * Um erro apareceu para o usuário.
 *
 * Guarda em que tela aconteceu — que é a pergunta útil ("a tela de escala dá
 * erro para todo mundo?") — e só o código técnico.
 */
export function registrarErro(codigo: string) {
  registrar({ nome: 'erro', tela: telaAtual, codigo })
}

/* ───────────────────────────── Medir fluxos ───────────────────────────── */

const iniciados = new Map<Fluxo, number>()

/** Marca o começo de um fluxo de várias etapas. */
export function iniciarFluxo(fluxo: Fluxo) {
  iniciados.set(fluxo, Date.now())
  registrar({ nome: 'fluxo_iniciado', fluxo })
}

/**
 * Fecha um fluxo. `concluido: false` é o dado mais valioso do arquivo inteiro:
 * é o empreiteiro que abriu "Nova feira", olhou, e fechou sem salvar.
 */
export function fecharFluxo(fluxo: Fluxo, concluido: boolean) {
  const inicio = iniciados.get(fluxo)
  if (inicio === undefined) return
  iniciados.delete(fluxo)
  const segundos = Math.round((Date.now() - inicio) / 1000)
  registrar(
    concluido
      ? { nome: 'fluxo_concluido', fluxo, segundos }
      : { nome: 'fluxo_abandonado', fluxo, segundos },
  )
}

/* ──────────────────────────────── Erros ──────────────────────────────── */

/**
 * Reduz uma exceção a um código curto e sem conteúdo.
 *
 * Mensagem de erro é texto livre, e texto livre pode carregar dado do usuário —
 * por isso ela nunca é registrada. Só o código do Firebase (`permission-denied`,
 * `unavailable`) ou uma etiqueta genérica.
 */
export function codigoDoErro(erro: unknown): string {
  if (typeof erro === 'object' && erro !== null && 'code' in erro) {
    const codigo = (erro as { code: unknown }).code
    if (typeof codigo === 'string') return codigo.slice(0, 40)
  }
  if (erro instanceof TypeError) return 'tipo'
  if (!navigator.onLine) return 'offline'
  return 'desconhecido'
}
