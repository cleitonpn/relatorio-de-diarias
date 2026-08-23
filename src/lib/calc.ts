import {
  CATEGORIAS_CUSTO,
  FASES,
  type Centavos,
  type Custo,
  type DataISO,
  type Diaria,
  type Fase,
  type Feira,
  type Pagamento,
  type Recebimento,
  type Resultado,
  type Stand,
} from '@/types'
import { dataCurta, diasEntre, isoParaData, periodo as periodo_, somarDias } from './format'

/** Quanto uma diária custa de fato (valor congelado × multiplicador). */
export function valorDaDiaria(d: Diaria): Centavos {
  return Math.round(d.valorDiaria * d.multiplicador)
}

/** Só conta quem realmente trabalhou. Previsto não é custo; falta não é custo. */
export function diariaContaComoCusto(d: Diaria): boolean {
  return d.presenca === 'PRESENTE'
}

/** Receita de um stand: por m² ou valor fechado. */
export function receitaDoStand(s: Stand): Centavos {
  if (s.tipoCobranca === 'VALOR_FECHADO') return s.valorTotal ?? 0
  return Math.round((s.valorM2 ?? 0) * s.m2)
}

/** Receita da feira inteira: soma dos stands, ou o valor do pacote fechado. */
export function receitaDaFeira(feira: Feira, stands: Stand[]): Centavos {
  if (feira.modo === 'PACOTE') return feira.pacoteValor ?? 0
  return stands.reduce((total, s) => total + receitaDoStand(s), 0)
}

export function m2DaFeira(feira: Feira, stands: Stand[]): number {
  if (feira.modo === 'PACOTE') return feira.pacoteM2 ?? 0
  return stands.reduce((total, s) => total + (s.m2 || 0), 0)
}

/**
 * O cálculo central da ferramenta: receita − custos = o que sobra pra ele.
 *
 * O almoço vive em dois lugares por um motivo prático: ele é lançado junto
 * com a presença (automático, por pessoa/dia) e também pode ser lançado como
 * despesa avulsa ("paguei R$ 300 de marmita hoje"). Os dois entram.
 */
export function calcularResultado(
  receita: Centavos,
  diarias: Diaria[],
  custos: Custo[],
  m2: number,
): Resultado {
  const trabalhadas = diarias.filter(diariaContaComoCusto)

  const custoDiarias = trabalhadas.reduce((t, d) => t + valorDaDiaria(d), 0)
  const almocoDaEscala = trabalhadas.reduce((t, d) => t + (d.valorAlmoco || 0), 0)
  const almocoAvulso = custos
    .filter((c) => c.categoria === 'ALMOCO')
    .reduce((t, c) => t + c.valor, 0)
  const custoAlmoco = almocoDaEscala + almocoAvulso
  const custoOutros = custos
    .filter((c) => c.categoria !== 'ALMOCO')
    .reduce((t, c) => t + c.valor, 0)

  const custoTotal = custoDiarias + custoAlmoco + custoOutros
  const lucro = receita - custoTotal
  const totalDiarias = trabalhadas.reduce((t, d) => t + d.multiplicador, 0)

  return {
    receita,
    custoDiarias,
    custoAlmoco,
    custoOutros,
    custoTotal,
    lucro,
    margem: receita > 0 ? lucro / receita : 0,
    totalDiarias,
    m2,
    receitaPorM2: m2 > 0 ? Math.round(receita / m2) : 0,
    custoPorM2: m2 > 0 ? Math.round(custoTotal / m2) : 0,
    lucroPorM2: m2 > 0 ? Math.round(lucro / m2) : 0,
  }
}

/* ------------------------- Leitura para leigos ------------------------- */

export type Saude = 'OTIMO' | 'BOM' | 'APERTADO' | 'PREJUIZO'

/** Traduz a margem em algo que qualquer pessoa entende sem saber o que é margem. */
export function saudeDoResultado(margem: number, receita: Centavos): Saude {
  if (receita <= 0) return 'APERTADO'
  if (margem < 0) return 'PREJUIZO'
  if (margem < 0.15) return 'APERTADO'
  if (margem < 0.3) return 'BOM'
  return 'OTIMO'
}

export const TEXTO_SAUDE: Record<Saude, { titulo: string; frase: string; emoji: string }> = {
  OTIMO: { titulo: 'Muito bom', frase: 'Esse trabalho está rendendo bem.', emoji: '🎉' },
  BOM: { titulo: 'Está bom', frase: 'O lucro está dentro do normal.', emoji: '👍' },
  APERTADO: { titulo: 'Apertado', frase: 'Sobrou pouco. Cuidado com gasto a mais.', emoji: '⚠️' },
  PREJUIZO: { titulo: 'No prejuízo', frase: 'Você está gastando mais do que vai receber.', emoji: '🚨' },
}

/**
 * Quantas diárias ainda cabem antes do lucro sumir.
 * É a pergunta que o empreiteiro faz antes de mandar mais gente.
 */
export function diariasQueAindaCabem(
  resultado: Resultado,
  custoMedioDeUmaDiaria: Centavos,
): number {
  if (custoMedioDeUmaDiaria <= 0) return 0
  return Math.max(0, Math.floor(resultado.lucro / custoMedioDeUmaDiaria))
}

/** Custo médio de um dia de uma pessoa (diária + almoço) — base do alerta. */
export function custoMedioDiaria(diarias: Diaria[], almocoPadrao: Centavos): Centavos {
  const trabalhadas = diarias.filter(diariaContaComoCusto)
  if (trabalhadas.length === 0) return almocoPadrao
  const soma = trabalhadas.reduce((t, d) => t + valorDaDiaria(d) + (d.valorAlmoco || 0), 0)
  return Math.round(soma / trabalhadas.length)
}

/* --------------------------- Acerto de pagamento --------------------------- */

export interface AcertoColaborador {
  colaboradorId: string
  colaboradorNome: string
  diarias: Diaria[]
  quantidadeDiarias: number
  valorBruto: Centavos
  valorVales: Centavos
  valorLiquido: Centavos
}

/**
 * Agrupa por pessoa o que está trabalhado e ainda não foi pago.
 * `pagamentoId === null` é a trava contra pagar duas vezes.
 */
export function montarAcerto(
  diarias: Diaria[],
  valesPorColaborador: Record<string, Centavos>,
): AcertoColaborador[] {
  const porPessoa = new Map<string, AcertoColaborador>()

  for (const d of diarias) {
    if (!diariaContaComoCusto(d) || d.pagamentoId) continue
    const atual = porPessoa.get(d.colaboradorId) ?? {
      colaboradorId: d.colaboradorId,
      colaboradorNome: d.colaboradorNome,
      diarias: [],
      quantidadeDiarias: 0,
      valorBruto: 0,
      valorVales: 0,
      valorLiquido: 0,
    }
    atual.diarias.push(d)
    atual.quantidadeDiarias += d.multiplicador
    atual.valorBruto += valorDaDiaria(d)
    porPessoa.set(d.colaboradorId, atual)
  }

  for (const acerto of porPessoa.values()) {
    acerto.valorVales = valesPorColaborador[acerto.colaboradorId] ?? 0
    // Nunca gerar pagamento negativo: o vale que sobrar fica para o próximo acerto.
    acerto.valorLiquido = Math.max(0, acerto.valorBruto - acerto.valorVales)
  }

  return [...porPessoa.values()].sort((a, b) =>
    a.colaboradorNome.localeCompare(b.colaboradorNome, 'pt-BR'),
  )
}

/* ------------------------- Consolidado por período ------------------------- */

export interface ResultadoDaFeira {
  feira: Feira
  resultado: Resultado
}

export interface Consolidado extends Resultado {
  feiras: ResultadoDaFeira[]
  quantidadeFeiras: number
  /** Feira que mais rendeu no período. */
  melhor: ResultadoDaFeira | null
  /** Feira que menos rendeu (ou deu prejuízo). */
  pior: ResultadoDaFeira | null
  /** Quantas pessoas diferentes trabalharam. */
  pessoasEnvolvidas: number
  /** Quanto sobra, em média, por dia de trabalho de uma pessoa. */
  lucroPorDiaria: Centavos
}

/**
 * Junta várias feiras num resultado só.
 *
 * Regra de atribuição: a feira inteira conta no período em que ela COMEÇOU.
 * É como o empreiteiro pensa ("a feira de março"), e evita partir o resultado
 * de uma feira que atravessa a virada do mês.
 */
export function consolidar(
  feiras: Feira[],
  standsPorFeira: Record<string, Stand[]>,
  diariasPorFeira: Record<string, Diaria[]>,
  custosPorFeira: Record<string, Custo[]>,
): Consolidado {
  const porFeira: ResultadoDaFeira[] = feiras.map((feira) => {
    const stands = standsPorFeira[feira.id] ?? []
    const diarias = diariasPorFeira[feira.id] ?? []
    const custos = custosPorFeira[feira.id] ?? []
    return {
      feira,
      resultado: calcularResultado(
        receitaDaFeira(feira, stands),
        diarias,
        custos,
        m2DaFeira(feira, stands),
      ),
    }
  })

  const soma = (pegar: (r: Resultado) => number) =>
    porFeira.reduce((t, f) => t + pegar(f.resultado), 0)

  const receita = soma((r) => r.receita)
  const custoTotal = soma((r) => r.custoTotal)
  const lucro = receita - custoTotal
  const totalDiarias = soma((r) => r.totalDiarias)
  const m2 = soma((r) => r.m2)

  const pessoas = new Set<string>()
  for (const lista of Object.values(diariasPorFeira)) {
    for (const d of lista) if (diariaContaComoCusto(d)) pessoas.add(d.colaboradorId)
  }

  const ordenadas = [...porFeira].sort((a, b) => b.resultado.lucro - a.resultado.lucro)

  return {
    receita,
    custoDiarias: soma((r) => r.custoDiarias),
    custoAlmoco: soma((r) => r.custoAlmoco),
    custoOutros: soma((r) => r.custoOutros),
    custoTotal,
    lucro,
    margem: receita > 0 ? lucro / receita : 0,
    totalDiarias,
    m2,
    receitaPorM2: m2 > 0 ? Math.round(receita / m2) : 0,
    custoPorM2: m2 > 0 ? Math.round(custoTotal / m2) : 0,
    lucroPorM2: m2 > 0 ? Math.round(lucro / m2) : 0,
    feiras: ordenadas,
    quantidadeFeiras: porFeira.length,
    melhor: ordenadas[0] ?? null,
    pior: ordenadas.length > 1 ? ordenadas[ordenadas.length - 1] : null,
    pessoasEnvolvidas: pessoas.size,
    lucroPorDiaria: totalDiarias > 0 ? Math.round(lucro / totalDiarias) : 0,
  }
}

/** Agrupa uma lista por feira, para alimentar o consolidado. */
export function agruparPorFeira<T extends { feiraId: string }>(itens: T[]): Record<string, T[]> {
  const mapa: Record<string, T[]> = {}
  for (const item of itens) {
    ;(mapa[item.feiraId] ??= []).push(item)
  }
  return mapa
}

/* --------------------------- Fases da feira --------------------------- */

/**
 * Quais fases essa feira tem.
 *
 * Feira cadastrada antes do calendário por fase existir devolve as três, com
 * o intervalo inteiro — o comportamento antigo, para nada quebrar.
 */
export function fasesDaFeira(feira: Feira): Fase[] {
  if (!feira.fases) return FASES.map((f) => f.valor)
  return FASES.map((f) => f.valor).filter((f) => !!feira.fases?.[f])
}

/** Os dias em que uma fase acontece. */
export function diasDaFase(feira: Feira, fase: Fase): DataISO[] {
  const periodo = feira.fases?.[fase]
  if (!periodo) {
    // Sem calendário por fase: vale o intervalo inteiro da feira.
    return feira.fases ? [] : diasEntre(feira.dataInicio, feira.dataFim)
  }
  return diasEntre(periodo.inicio, periodo.fim)
}

/** "10 a 12 de mar" — o rótulo que aparece no botão da fase. */
export function periodoDaFase(feira: Feira, fase: Fase): string | null {
  const periodo = feira.fases?.[fase]
  if (!periodo) return null
  return periodo.inicio === periodo.fim
    ? dataCurta(periodo.inicio)
    : periodo_(periodo.inicio, periodo.fim)
}

/* --------------------- Data prevista de pagamento --------------------- */

/**
 * Quando o acerto daquela feira cai, segundo a política que o empreiteiro
 * escolheu no cadastro. É o que o funcionário mais quer saber.
 */
export function dataPrevistaPagamento(feira: Feira, referencia: DataISO): DataISO | null {
  switch (feira.politicaPagamento) {
    case 'DIARIO':
      return referencia
    case 'SEMANAL_SEXTA': {
      // Próxima sexta a partir do dia trabalhado (sexta paga no mesmo dia).
      const d = isoParaData(referencia)
      const faltam = (5 - d.getDay() + 7) % 7
      return somarDias(referencia, faltam)
    }
    case 'FIM_MONTAGEM':
      return feira.fases?.MONTAGEM?.fim ?? feira.dataFim
    case 'FIM_FEIRA':
      return feira.dataFim
    case 'DATA_FIXA':
      return feira.dataPagamentoFixa
    default:
      return null
  }
}

/* ------------------------ Vale a pena pegar? ------------------------ */

export interface Proposta {
  /** O que o contratante ofereceu, no total. */
  valorProposto: Centavos
  m2: number
  /** Quantos dias de trabalho a obra leva. */
  dias: number
  /** Quantas pessoas por dia. */
  pessoas: number
  /** Diária média da equipe dele. */
  diariaMedia: Centavos
  almocoPorPessoaDia: Centavos
  /** Combustível, material, estacionamento — o que ele já prevê. */
  outrosCustos: Centavos
}

export interface Veredito {
  totalDiarias: number
  custoMaoDeObra: Centavos
  custoAlmoco: Centavos
  custoTotal: Centavos
  sobra: Centavos
  margem: number
  saude: Saude
  valorPorM2: Centavos
  /** Quanto ele precisaria receber para a margem ficar boa. */
  contraproposta: Centavos
  contrapropostaPorM2: Centavos
  /** Abaixo disso ele trabalha de graça. */
  pontoDeEquilibrio: Centavos
  /** Teto de gasto com mão de obra mantendo a margem-alvo. */
  tetoMaoDeObra: Centavos
}

/** Margem que o app considera saudável ao sugerir uma contraproposta. */
export const MARGEM_ALVO = 0.3

/**
 * A conta que ele faz de cabeça no telefone, e erra.
 *
 * O gerente liga oferecendo um valor; em trinta segundos ele precisa saber se
 * dá para trabalhar. Aqui a resposta sai com o número da contraproposta junto,
 * porque saber que está ruim sem saber quanto pedir não resolve nada.
 */
export function avaliarProposta(p: Proposta): Veredito {
  const totalDiarias = Math.max(0, p.dias) * Math.max(0, p.pessoas)
  const custoMaoDeObra = totalDiarias * p.diariaMedia
  const custoAlmoco = totalDiarias * p.almocoPorPessoaDia
  const custoTotal = custoMaoDeObra + custoAlmoco + p.outrosCustos

  const sobra = p.valorProposto - custoTotal
  const margem = p.valorProposto > 0 ? sobra / p.valorProposto : 0

  // Para sobrar a margem-alvo, a receita precisa ser custo / (1 - margem).
  const contraproposta = Math.round(custoTotal / (1 - MARGEM_ALVO))

  return {
    totalDiarias,
    custoMaoDeObra,
    custoAlmoco,
    custoTotal,
    sobra,
    margem,
    saude: saudeDoResultado(margem, p.valorProposto),
    valorPorM2: p.m2 > 0 ? Math.round(p.valorProposto / p.m2) : 0,
    contraproposta,
    contrapropostaPorM2: p.m2 > 0 ? Math.round(contraproposta / p.m2) : 0,
    pontoDeEquilibrio: custoTotal,
    tetoMaoDeObra: Math.max(
      0,
      Math.round(p.valorProposto * (1 - MARGEM_ALVO)) - p.almocoPorPessoaDia * totalDiarias - p.outrosCustos,
    ),
  }
}

/**
 * O quanto ele costuma receber por m², olhando o histórico dele.
 *
 * É a comparação que só este app consegue fazer: a proposta é boa ou ruim
 * comparada ao que ELE cobra, não a uma média de mercado inventada.
 */
export function precoHabitualPorM2(feiras: Feira[], standsPorFeira: Record<string, Stand[]>): Centavos | null {
  let receita = 0
  let metros = 0
  for (const feira of feiras) {
    const stands = standsPorFeira[feira.id] ?? []
    const m2 = m2DaFeira(feira, stands)
    if (m2 <= 0) continue
    receita += receitaDaFeira(feira, stands)
    metros += m2
  }
  return metros > 0 ? Math.round(receita / metros) : null
}

/* ------------------------------ Agenda do caixa ------------------------------ */

export type TipoMovimento = 'ENTRADA' | 'SAIDA'

export interface Movimento {
  id: string
  tipo: TipoMovimento
  data: DataISO
  titulo: string
  detalhe: string
  valor: Centavos
  /** Já aconteceu (recebido/pago) ou ainda é previsão. */
  realizado: boolean
  /** Venceu e não aconteceu. */
  atrasado: boolean
  feiraId: string | null
  refId: string
}

/**
 * A linha do tempo do dinheiro: o que entra, o que sai, e quando.
 *
 * O empreiteiro sabe quanto tem a pagar, mas não sabia quando cada coisa cai.
 * É a diferença entre "tenho R$ 8.000 a pagar" e "tenho R$ 8.000 a pagar na
 * sexta e só recebo na terça seguinte" — a segunda frase é a que evita aperto.
 */
export function montarAgenda(entrada: {
  recebimentos: Recebimento[]
  pagamentos: Pagamento[]
  /** Diárias trabalhadas ainda sem acerto, agrupadas pela data prevista. */
  diariasAbertas: Diaria[]
  /** Combustível, material, estacionamento: dinheiro que já saiu do bolso. */
  custos: Custo[]
  feiras: Feira[]
  hoje: DataISO
}): Movimento[] {
  const { recebimentos, pagamentos, diariasAbertas, custos, feiras, hoje } = entrada
  const movimentos: Movimento[] = []
  const feiraPorId = new Map(feiras.map((f) => [f.id, f]))

  for (const r of recebimentos) {
    const realizado = r.status === 'RECEBIDO'
    movimentos.push({
      id: `r_${r.id}`,
      tipo: 'ENTRADA',
      data: realizado ? (r.dataRecebimento ?? r.dataPrevista) : r.dataPrevista,
      titulo: r.feiraNome,
      detalhe: r.contratanteNome ? `${r.descricao} · ${r.contratanteNome}` : r.descricao,
      valor: realizado ? r.valorRecebido : r.valorPrevisto,
      realizado,
      atrasado: !realizado && r.dataPrevista < hoje,
      feiraId: r.feiraId,
      refId: r.id,
    })
  }

  for (const p of pagamentos) {
    const realizado = p.status === 'PAGO'
    movimentos.push({
      id: `p_${p.id}`,
      tipo: 'SAIDA',
      data: p.dataPagamento ?? p.dataPrevista ?? hoje,
      titulo: p.colaboradorNome,
      detalhe: p.feiraNome ? `Acerto · ${p.feiraNome}` : 'Acerto',
      valor: p.valorLiquido,
      realizado,
      atrasado: !realizado && (p.dataPrevista ?? hoje) < hoje,
      feiraId: p.feiraId,
      refId: p.id,
    })
  }

  // Gasto lançado é dinheiro que já saiu — entra no caixa como realizado.
  for (const c of custos) {
    const categoria = CATEGORIAS_CUSTO.find((x) => x.valor === c.categoria)
    movimentos.push({
      id: `c_${c.id}`,
      tipo: 'SAIDA',
      data: c.data,
      titulo: categoria?.rotulo ?? 'Gasto',
      detalhe: c.descricao ?? feiraPorId.get(c.feiraId)?.nome ?? 'Gasto da feira',
      valor: c.valor,
      realizado: true,
      atrasado: false,
      feiraId: c.feiraId,
      refId: c.id,
    })
  }

  // Diárias trabalhadas e ainda não pagas viram uma saída prevista, agrupada
  // pela data em que o acerto daquela feira deve acontecer.
  const previstos = new Map<string, { valor: Centavos; pessoas: Set<string>; feiraId: string }>()
  for (const d of diariasAbertas) {
    if (d.presenca !== 'PRESENTE' || d.pagamentoId) continue
    const feira = feiraPorId.get(d.feiraId)
    if (!feira) continue
    const data = dataPrevistaPagamento(feira, d.data) ?? feira.dataFim
    const chave = `${d.feiraId}|${data}`
    const atual = previstos.get(chave) ?? { valor: 0, pessoas: new Set<string>(), feiraId: d.feiraId }
    atual.valor += valorDaDiaria(d)
    atual.pessoas.add(d.colaboradorId)
    previstos.set(chave, atual)
  }

  for (const [chave, dados] of previstos) {
    const [feiraId, data] = chave.split('|')
    const feira = feiraPorId.get(feiraId)
    movimentos.push({
      id: `d_${chave}`,
      tipo: 'SAIDA',
      data,
      titulo: `Acerto da equipe`,
      detalhe: `${dados.pessoas.size} ${dados.pessoas.size === 1 ? 'pessoa' : 'pessoas'} · ${feira?.nome ?? 'feira'}`,
      valor: dados.valor,
      realizado: false,
      atrasado: data < hoje,
      feiraId,
      refId: chave,
    })
  }

  return movimentos.sort((a, b) => a.data.localeCompare(b.data))
}

export interface ResumoCaixa {
  entrou: Centavos
  saiu: Centavos
  saldo: Centavos
  aReceber: Centavos
  aPagar: Centavos
  atrasadoReceber: Centavos
  /** Onde o caixa fica depois de tudo que está previsto acontecer. */
  projecao: Centavos
}

export function resumirCaixa(movimentos: Movimento[]): ResumoCaixa {
  let entrou = 0
  let saiu = 0
  let aReceber = 0
  let aPagar = 0
  let atrasadoReceber = 0

  for (const m of movimentos) {
    if (m.realizado) {
      if (m.tipo === 'ENTRADA') entrou += m.valor
      else saiu += m.valor
    } else {
      if (m.tipo === 'ENTRADA') {
        aReceber += m.valor
        if (m.atrasado) atrasadoReceber += m.valor
      } else aPagar += m.valor
    }
  }

  const saldo = entrou - saiu
  return { entrou, saiu, saldo, aReceber, aPagar, atrasadoReceber, projecao: saldo + aReceber - aPagar }
}
