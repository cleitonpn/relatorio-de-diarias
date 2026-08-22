import type { Centavos, PlanoId } from '@/types'

export interface Plano {
  id: PlanoId
  nome: string
  precoMensal: Centavos
  precoAnual: Centavos
  /** Máximo de pessoas cadastradas na equipe. */
  limiteEquipe: number
  /** Máximo de encarregados com acesso de gestão. */
  limiteEncarregados: number
  destaque: string
  recomendado?: boolean
}

/**
 * Âncora de preço: o plano tem que custar menos que meia diária por mês.
 * Uma diária de ajudante gira em torno de R$ 200 — daí a escada abaixo.
 *
 * O acesso do colaborador é liberado em TODOS os planos de propósito: se
 * cobrar por acesso, o empreiteiro corta o acesso para economizar e a parte
 * mais útil da ferramenta morre.
 */
export const PLANOS: Plano[] = [
  {
    id: 'SOLO',
    nome: 'Solo',
    precoMensal: 3990,
    precoAnual: 39900,
    limiteEquipe: 5,
    limiteEncarregados: 0,
    destaque: 'Para quem toca sozinho, com equipe pequena',
  },
  {
    id: 'EQUIPE',
    nome: 'Equipe',
    precoMensal: 7990,
    precoAnual: 79900,
    limiteEquipe: 15,
    limiteEncarregados: 1,
    destaque: 'O mais escolhido — menos de meia diária por mês',
    recomendado: true,
  },
  {
    id: 'EQUIPE_PLUS',
    nome: 'Equipe+',
    precoMensal: 12990,
    precoAnual: 129900,
    limiteEquipe: 30,
    limiteEncarregados: 2,
    destaque: 'Para quem toca mais de uma feira ao mesmo tempo',
  },
  {
    id: 'EMPRESA',
    nome: 'Empresa',
    precoMensal: 19990,
    precoAnual: 199900,
    limiteEquipe: 60,
    limiteEncarregados: 3,
    destaque: 'Equipe grande, vários encarregados',
  },
  {
    id: 'EMPRESAO',
    nome: 'Empresão',
    precoMensal: 29990,
    precoAnual: 299900,
    limiteEquipe: 9999,
    limiteEncarregados: 99,
    destaque: 'Sem limite de equipe',
  },
]

export function plano(id: PlanoId): Plano {
  return PLANOS.find((p) => p.id === id) ?? PLANOS[0]
}

export const DIAS_TESTE = 30
/** Tolerância após falha de pagamento antes de virar somente-leitura. */
export const DIAS_TOLERANCIA = 7

/** Aplica desconto (indicação, beta tester, promoção) sobre o preço cheio. */
export function precoComDesconto(valor: Centavos, descontoPercentual: number | null): Centavos {
  if (!descontoPercentual) return valor
  return Math.round(valor * (1 - descontoPercentual / 100))
}

/* ----------------------------- Indicações ----------------------------- */

/** Desconto que o indicado ganha na primeira mensalidade. */
export const DESCONTO_INDICADO = 50

/** Escada de prêmios do indicador — o crédito só entra quando o indicado PAGA. */
export const PREMIOS_INDICACAO: { aPartirDe: number; premio: string }[] = [
  { aPartirDe: 1, premio: '1 mês grátis' },
  { aPartirDe: 3, premio: 'Upgrade de plano grátis por 2 meses' },
  { aPartirDe: 5, premio: '6 meses grátis' },
  { aPartirDe: 10, premio: '50% de desconto vitalício' },
]

/** Código curto, sem caracteres que se confundem (0/O, 1/I). */
export function gerarCodigoIndicacao(): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let codigo = ''
  const aleatorio = crypto.getRandomValues(new Uint32Array(6))
  for (let i = 0; i < 6; i++) codigo += alfabeto[aleatorio[i] % alfabeto.length]
  return codigo
}
