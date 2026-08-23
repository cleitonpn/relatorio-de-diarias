import type { Timestamp } from 'firebase/firestore'

/* ------------------------------------------------------------------ *
 * Convenções
 * - Todo dinheiro é guardado em CENTAVOS (inteiro). Nunca float.
 * - Toda data "de calendário" (dia de trabalho) é string 'YYYY-MM-DD',
 *   nunca Timestamp, para não sofrer com fuso horário.
 * - Todo documento vive sob /empresas/{empresaId}/... (isolamento multi-tenant).
 * ------------------------------------------------------------------ */

export type Centavos = number
export type DataISO = string // 'YYYY-MM-DD'

export type Papel = 'DONO' | 'ENCARREGADO' | 'COLABORADOR'

export type Fase = 'MONTAGEM' | 'EVENTO' | 'DESMONTAGEM'

export const FASES: { valor: Fase; rotulo: string; emoji: string }[] = [
  { valor: 'MONTAGEM', rotulo: 'Montagem', emoji: '🔨' },
  { valor: 'EVENTO', rotulo: 'Evento', emoji: '🎪' },
  { valor: 'DESMONTAGEM', rotulo: 'Desmontagem', emoji: '📦' },
]

/* ----------------------------- Empresa (tenant) ----------------------------- */

export type PlanoId = 'SOLO' | 'EQUIPE' | 'EQUIPE_PLUS' | 'EMPRESA' | 'EMPRESAO'

export type StatusAssinatura =
  | 'TESTE' // 30 dias grátis
  | 'ATIVA'
  | 'PENDENTE' // pagamento falhou, dentro da tolerância
  | 'SOMENTE_LEITURA' // tolerância esgotada — vê tudo, não lança nada
  | 'PAUSADA' // modo pausa sazonal
  | 'CANCELADA'

export interface Assinatura {
  plano: PlanoId
  status: StatusAssinatura
  /** Fim do teste grátis de 30 dias. */
  fimTeste: Timestamp | null
  /** Fim do período pago corrente. */
  fimPeriodo: Timestamp | null
  /** Desconto vitalício ou temporário (indicação, beta tester, promoção). */
  descontoPercentual: number | null
  descontoMotivo: string | null
  /** null = vitalício; caso contrário, quando o desconto expira. */
  descontoAte: Timestamp | null
  /** Referências do Mercado Pago (preenchidas na fase de cobrança). */
  mpPreapprovalId: string | null
  mpPayerId: string | null
  /** Meses de crédito acumulados por indicação. */
  creditoMeses: number
}

export interface Empresa {
  id: string
  nome: string
  /** Ramo: tapeçaria, marcenaria, elétrica, vidraçaria, limpeza, serralheria... */
  ramo: string | null
  cidade: string | null
  /** Chave PIX padrão do dono, usada como remetente sugerido. */
  documento: string | null
  donoUid: string
  /** Código que ele passa para indicar outros empreiteiros. */
  codigoIndicacao: string
  /** Código de quem indicou esta empresa. */
  indicadaPor: string | null
  /**
   * Se o prêmio desta indicação já foi creditado a quem indicou.
   * Existe para o crédito nunca sair duas vezes pela mesma conta.
   */
  premioIndicacaoLiberado?: boolean | null
  assinatura: Assinatura
  /** Valor padrão de almoço por pessoa/dia, para pré-preencher lançamentos. */
  almocoPadrao: Centavos
  aceiteTermos: { versao: string; em: Timestamp; ip: string | null } | null
  criadaEm: Timestamp
}

/* -------------------------------- Usuários -------------------------------- */

export interface Usuario {
  id: string // uid do Firebase Auth
  empresaId: string
  nome: string
  email: string | null
  telefone: string | null
  papel: Exclude<Papel, 'COLABORADOR'>
  /** Encarregado só vê receita/lucro se o dono liberar. */
  vePainelFinanceiro: boolean
  ativo: boolean
  criadoEm: Timestamp
}

/* ------------------------------ Colaboradores ------------------------------ */

export type TipoChavePix = 'CPF' | 'CNPJ' | 'TELEFONE' | 'EMAIL' | 'ALEATORIA'

export interface Colaborador {
  id: string
  empresaId: string
  nome: string
  /** Como todo mundo chama ele na obra. É o que aparece nas listas. */
  apelido: string | null
  fotoUrl: string | null
  telefone: string | null
  funcao: string | null
  /** Valor padrão da diária — copiado (congelado) em cada dia trabalhado. */
  diariaPadrao: Centavos
  chavePixTipo: TipoChavePix | null
  chavePix: string | null
  /** Nome que aparece no PIX (máx. 25 caracteres, sem acento). */
  nomeRecebedor: string | null
  ativo: boolean
  /** Token do link pessoal enviado por WhatsApp. */
  tokenAcesso: string | null
  criadoEm: Timestamp
}

/* ------------------------------- Contratante ------------------------------- */

export interface Contratante {
  id: string
  empresaId: string
  nome: string
  /** Chave natural para a futura integração com o app de pendências. */
  cnpj: string | null
  contato: string | null
  criadoEm: Timestamp
}

/* ---------------------------------- Feira ---------------------------------- */

export type ModoFeira = 'POR_STAND' | 'PACOTE'

export type PoliticaPagamento =
  | 'DIARIO'
  | 'SEMANAL_SEXTA'
  | 'FIM_MONTAGEM'
  | 'FIM_FEIRA'
  | 'DATA_FIXA'

export const POLITICAS: { valor: PoliticaPagamento; rotulo: string; descricao: string }[] = [
  { valor: 'DIARIO', rotulo: 'Todo dia', descricao: 'Paga no fim de cada dia de trabalho' },
  { valor: 'SEMANAL_SEXTA', rotulo: 'Toda sexta', descricao: 'Acerta uma vez por semana' },
  { valor: 'FIM_MONTAGEM', rotulo: 'Fim da montagem', descricao: 'Paga quando a montagem termina' },
  { valor: 'FIM_FEIRA', rotulo: 'Fim da feira', descricao: 'Acerta tudo depois da desmontagem' },
  { valor: 'DATA_FIXA', rotulo: 'Data marcada', descricao: 'Você escolhe o dia do acerto' },
]

/** Um trecho de calendário: quando uma fase começa e termina. */
export interface PeriodoFase {
  inicio: DataISO
  fim: DataISO
}

/**
 * Calendário da feira por fase.
 *
 * Nulo em cada fase que não acontece: limpeza costuma não ter montagem,
 * marcenaria costuma não ficar durante o evento.
 */
export type CalendarioFases = Record<Fase, PeriodoFase | null>

/** Origem do registro — preparado para a futura importação do app de pendências. */
export interface Origem {
  tipo: 'MANUAL' | 'IMPORTADO'
  appOrigem: string | null
  idExterno: string | null
  importadoEm: Timestamp | null
}

export interface Feira {
  id: string
  empresaId: string
  nome: string
  local: string | null // pavilhão
  cidade: string | null
  contratanteId: string | null
  contratanteNome: string | null // desnormalizado para listar sem join
  /** Primeiro e último dia da feira — derivados das fases, para listar e ordenar. */
  dataInicio: DataISO
  dataFim: DataISO
  /**
   * Quando é cada fase. Nulo nas feiras cadastradas antes deste campo existir:
   * nesse caso o app usa o intervalo inteiro para qualquer fase.
   */
  fases: CalendarioFases | null
  modo: ModoFeira
  /** Só no modo PACOTE. */
  pacoteValor: Centavos | null
  pacoteM2: number | null
  pacoteQtdStands: number | null
  politicaPagamento: PoliticaPagamento
  dataPagamentoFixa: DataISO | null
  /** Valor de almoço por pessoa/dia nesta feira. */
  almocoPorPessoaDia: Centavos
  encerrada: boolean
  origem: Origem
  criadaEm: Timestamp
}

/* ---------------------------------- Stand ---------------------------------- */

export type TipoCobranca = 'POR_M2' | 'VALOR_FECHADO'

export interface Stand {
  id: string
  empresaId: string
  feiraId: string
  nome: string // nome do cliente / do stand
  m2: number
  tipoCobranca: TipoCobranca
  valorM2: Centavos | null
  valorTotal: Centavos | null
  contratanteId: string | null
  origem: Origem
  criadoEm: Timestamp
}

/* ---------------------------- Diária (escala) ------------------------------ */

export type Presenca = 'PREVISTO' | 'PRESENTE' | 'FALTOU'

/** Multiplicador da diária: meia, inteira, uma e meia, dobrada. */
export type Multiplicador = 0.5 | 1 | 1.5 | 2

export const MULTIPLICADORES: { valor: Multiplicador; rotulo: string }[] = [
  { valor: 0.5, rotulo: 'Meia' },
  { valor: 1, rotulo: 'Inteira' },
  { valor: 1.5, rotulo: '1½' },
  { valor: 2, rotulo: 'Dobrada' },
]

export interface Diaria {
  id: string
  empresaId: string
  feiraId: string
  standId: string | null // null quando a feira é pacote fechado
  colaboradorId: string
  colaboradorNome: string // desnormalizado
  data: DataISO
  fase: Fase
  /** CONGELADO no momento do lançamento — nunca reler do cadastro. */
  valorDiaria: Centavos
  multiplicador: Multiplicador
  /** CONGELADO — almoço daquele dia para aquela pessoa. */
  valorAlmoco: Centavos
  presenca: Presenca
  observacao: string | null
  /** Preenchido quando entra num acerto — impede pagar duas vezes. */
  pagamentoId: string | null
  criadaEm: Timestamp
}

/* ---------------------------------- Custos --------------------------------- */

export type CategoriaCusto =
  | 'ALMOCO'
  | 'COMBUSTIVEL'
  | 'ESTACIONAMENTO'
  | 'TRANSPORTE'
  | 'MATERIAL'
  | 'HOSPEDAGEM'
  | 'OUTRO'

export const CATEGORIAS_CUSTO: { valor: CategoriaCusto; rotulo: string; emoji: string }[] = [
  { valor: 'ALMOCO', rotulo: 'Comida', emoji: '🍚' },
  { valor: 'COMBUSTIVEL', rotulo: 'Combustível', emoji: '⛽' },
  { valor: 'ESTACIONAMENTO', rotulo: 'Estacionamento', emoji: '🅿️' },
  { valor: 'TRANSPORTE', rotulo: 'Transporte', emoji: '🚚' },
  { valor: 'MATERIAL', rotulo: 'Material', emoji: '🧰' },
  { valor: 'HOSPEDAGEM', rotulo: 'Hospedagem', emoji: '🛏️' },
  { valor: 'OUTRO', rotulo: 'Outro', emoji: '📌' },
]

export interface Custo {
  id: string
  empresaId: string
  feiraId: string
  standId: string | null
  categoria: CategoriaCusto
  descricao: string | null
  valor: Centavos
  data: DataISO
  comprovanteUrl: string | null
  criadoEm: Timestamp
}

/* ----------------------------------- Vale ---------------------------------- */

export type StatusVale = 'SOLICITADO' | 'APROVADO' | 'NEGADO' | 'DESCONTADO'

export interface Vale {
  id: string
  empresaId: string
  colaboradorId: string
  colaboradorNome: string
  feiraId: string | null
  valor: Centavos
  data: DataISO
  status: StatusVale
  /** 'DONO' quando o próprio empreiteiro lançou; 'COLABORADOR' quando foi pedido. */
  origemPedido: 'DONO' | 'COLABORADOR'
  observacao: string | null
  pagamentoId: string | null
  criadoEm: Timestamp
}

/* --------------------------------- Pagamento -------------------------------- */

export type StatusPagamento = 'PENDENTE' | 'PAGO'

export interface Pagamento {
  id: string
  empresaId: string
  colaboradorId: string
  colaboradorNome: string
  feiraId: string | null
  feiraNome: string | null
  diariaIds: string[]
  valeIds: string[]
  /** Soma das diárias (valor × multiplicador). */
  valorBruto: Centavos
  /** Vales descontados. */
  valorVales: Centavos
  /** O que efetivamente será pago. */
  valorLiquido: Centavos
  status: StatusPagamento
  dataPrevista: DataISO | null
  dataPagamento: DataISO | null
  pixPayload: string | null
  comprovanteUrl: string | null
  criadoEm: Timestamp
}

/* --------------------------- Resultado calculado --------------------------- */

export interface Resultado {
  receita: Centavos
  custoDiarias: Centavos
  custoAlmoco: Centavos
  custoOutros: Centavos
  custoTotal: Centavos
  lucro: Centavos
  margem: number // 0..1
  totalDiarias: number // quantidade de diárias (já multiplicadas)
  m2: number
  receitaPorM2: Centavos
  custoPorM2: Centavos
  lucroPorM2: Centavos
}
