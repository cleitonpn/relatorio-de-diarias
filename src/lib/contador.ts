import type { Centavos, Colaborador, Custo, DataISO, Diaria, Feira, Pagamento, Stand } from '@/types'
import { CATEGORIAS_CUSTO } from '@/types'
import { receitaDaFeira, valorDaDiaria } from './calc'
import { moeda } from './format'

/**
 * O pacote que o contador precisa.
 *
 * Ele não quer telas nem gráficos: quer o que entrou, o que saiu, e — a parte
 * que dá mais trabalho ao empreiteiro hoje — quanto foi pago a cada pessoa
 * física, com data. É isso que costuma ir escrito num caderno.
 */

export interface LinhaReceita {
  data: DataISO
  feira: string
  contratante: string
  descricao: string
  valor: Centavos
}

export interface LinhaDespesa {
  data: DataISO
  categoria: string
  descricao: string
  feira: string
  valor: Centavos
}

export interface LinhaPagamentoPessoa {
  data: DataISO
  nome: string
  documento: string
  diarias: number
  bruto: Centavos
  descontos: Centavos
  liquido: Centavos
  feira: string
}

export interface PacoteContador {
  de: DataISO
  ate: DataISO
  receitas: LinhaReceita[]
  despesas: LinhaDespesa[]
  pagamentos: LinhaPagamentoPessoa[]
  totalReceita: Centavos
  totalDespesa: Centavos
  totalMaoDeObra: Centavos
  resultado: Centavos
  pessoasPagas: number
}

interface Entrada {
  de: DataISO
  ate: DataISO
  feiras: Feira[]
  stands: Stand[]
  diarias: Diaria[]
  custos: Custo[]
  pagamentos: Pagamento[]
  colaboradores: Colaborador[]
}

export function montarPacoteContador(dados: Entrada): PacoteContador {
  const { de, ate } = dados

  // Receita entra pela data de término da feira: é quando o serviço foi
  // entregue, que é o critério que o contador usa para competência.
  const feirasDoPeriodo = dados.feiras.filter((f) => f.dataFim >= de && f.dataFim <= ate)
  const standsPorFeira = new Map<string, Stand[]>()
  for (const s of dados.stands) {
    const lista = standsPorFeira.get(s.feiraId) ?? []
    lista.push(s)
    standsPorFeira.set(s.feiraId, lista)
  }

  const receitas: LinhaReceita[] = feirasDoPeriodo.map((f) => ({
    data: f.dataFim,
    feira: f.nome,
    contratante: f.contratanteNome ?? 'Não informado',
    descricao:
      f.modo === 'PACOTE'
        ? `Pacote fechado${f.pacoteQtdStands ? ` — ${f.pacoteQtdStands} stands` : ''}`
        : (() => {
            const quantidade = (standsPorFeira.get(f.id) ?? []).length
            return `${quantidade} ${quantidade === 1 ? 'stand' : 'stands'}`
          })(),
    valor: receitaDaFeira(f, standsPorFeira.get(f.id) ?? []),
  }))

  const nomeFeira = (id: string | null) =>
    dados.feiras.find((f) => f.id === id)?.nome ?? '—'

  const despesas: LinhaDespesa[] = dados.custos
    .filter((c) => c.data >= de && c.data <= ate)
    .map((c) => ({
      data: c.data,
      categoria: CATEGORIAS_CUSTO.find((x) => x.valor === c.categoria)?.rotulo ?? c.categoria,
      descricao: c.descricao ?? '',
      feira: nomeFeira(c.feiraId),
      valor: c.valor,
    }))

  // Pagamentos a pessoa física — a parte mais sensível para o contador.
  const porColaborador = new Map<string, Colaborador>()
  for (const c of dados.colaboradores) porColaborador.set(c.id, c)

  const pagamentos: LinhaPagamentoPessoa[] = dados.pagamentos
    .filter((p) => p.status === 'PAGO' && p.dataPagamento && p.dataPagamento >= de && p.dataPagamento <= ate)
    .map((p) => {
      const ficha = porColaborador.get(p.colaboradorId)
      const quantidade = dados.diarias
        .filter((d) => p.diariaIds.includes(d.id))
        .reduce((t, d) => t + d.multiplicador, 0)
      return {
        data: p.dataPagamento!,
        nome: ficha?.nome ?? p.colaboradorNome,
        // CPF só quando a chave PIX é CPF — é o único documento que o app guarda.
        documento: ficha?.chavePixTipo === 'CPF' ? (ficha.chavePix ?? '') : '',
        diarias: quantidade,
        bruto: p.valorBruto,
        descontos: p.valorVales,
        liquido: p.valorLiquido,
        feira: p.feiraNome ?? nomeFeira(p.feiraId),
      }
    })
    .sort((a, b) => a.data.localeCompare(b.data))

  // Almoço lançado junto com a presença não vira Custo: precisa entrar aqui.
  const almocoDaEscala = dados.diarias
    .filter((d) => d.presenca === 'PRESENTE' && d.data >= de && d.data <= ate)
    .reduce((t, d) => t + (d.valorAlmoco || 0), 0)

  const maoDeObra = dados.diarias
    .filter((d) => d.presenca === 'PRESENTE' && d.data >= de && d.data <= ate)
    .reduce((t, d) => t + valorDaDiaria(d), 0)

  const totalReceita = receitas.reduce((t, r) => t + r.valor, 0)
  const totalDespesa =
    despesas.reduce((t, d) => t + d.valor, 0) + maoDeObra + almocoDaEscala

  return {
    de,
    ate,
    receitas,
    despesas: [
      ...despesas,
      ...(almocoDaEscala > 0
        ? [
            {
              data: ate,
              categoria: 'Alimentação (com a presença)',
              descricao: 'Almoço lançado junto com os dias trabalhados',
              feira: '—',
              valor: almocoDaEscala,
            },
          ]
        : []),
      ...(maoDeObra > 0
        ? [
            {
              data: ate,
              categoria: 'Mão de obra (diárias)',
              descricao: 'Soma das diárias trabalhadas no período',
              feira: '—',
              valor: maoDeObra,
            },
          ]
        : []),
    ],
    pagamentos,
    totalReceita,
    totalDespesa,
    totalMaoDeObra: maoDeObra,
    resultado: totalReceita - totalDespesa,
    pessoasPagas: new Set(pagamentos.map((p) => p.nome)).size,
  }
}

/* ------------------------------ Exportação ------------------------------ */

/** Ponto e vírgula e BOM: é o que o Excel brasileiro abre sem reclamar. */
function paraCSV(linhas: (string | number)[][]): string {
  const corpo = linhas
    .map((linha) =>
      linha
        .map((celula) => {
          const texto = String(celula ?? '')
          return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
        })
        .join(';'),
    )
    .join('\r\n')
  return `﻿${corpo}`
}

/** Valor em formato numérico brasileiro, para o Excel somar sem ajuste. */
function numero(centavos: Centavos): string {
  return (centavos / 100).toFixed(2).replace('.', ',')
}

const dataBR = (iso: DataISO) => iso.split('-').reverse().join('/')

export function csvDoContador(pacote: PacoteContador, empresa: string): string {
  const linhas: (string | number)[][] = [
    [`Relatório para contabilidade — ${empresa}`],
    [`Período: ${dataBR(pacote.de)} a ${dataBR(pacote.ate)}`],
    [],
    ['RECEITAS'],
    ['Data', 'Contratante', 'Feira', 'Descrição', 'Valor'],
    ...pacote.receitas.map((r) => [dataBR(r.data), r.contratante, r.feira, r.descricao, numero(r.valor)]),
    ['', '', '', 'Total de receitas', numero(pacote.totalReceita)],
    [],
    ['DESPESAS'],
    ['Data', 'Categoria', 'Descrição', 'Feira', 'Valor'],
    ...pacote.despesas.map((d) => [dataBR(d.data), d.categoria, d.descricao, d.feira, numero(d.valor)]),
    ['', '', '', 'Total de despesas', numero(pacote.totalDespesa)],
    [],
    ['PAGAMENTOS A PESSOAS FÍSICAS'],
    ['Data', 'Nome', 'CPF', 'Diárias', 'Bruto', 'Descontos', 'Líquido pago', 'Feira'],
    ...pacote.pagamentos.map((p) => [
      dataBR(p.data),
      p.nome,
      p.documento,
      p.diarias,
      numero(p.bruto),
      numero(p.descontos),
      numero(p.liquido),
      p.feira,
    ]),
    [],
    ['RESUMO'],
    ['Receitas', numero(pacote.totalReceita)],
    ['Despesas', numero(pacote.totalDespesa)],
    ['Resultado', numero(pacote.resultado)],
    ['Pessoas pagas no período', pacote.pessoasPagas],
  ]
  return paraCSV(linhas)
}

/** Resumo curto para mandar no WhatsApp do contador. */
export function resumoParaTexto(pacote: PacoteContador, empresa: string): string {
  return [
    `*${empresa}* — ${dataBR(pacote.de)} a ${dataBR(pacote.ate)}`,
    '',
    `Receitas: ${moeda(pacote.totalReceita)}`,
    `Despesas: ${moeda(pacote.totalDespesa)}`,
    `  • Mão de obra: ${moeda(pacote.totalMaoDeObra)}`,
    `Resultado: ${moeda(pacote.resultado)}`,
    '',
    `${pacote.pagamentos.length} pagamentos a ${pacote.pessoasPagas} pessoas.`,
    '',
    'A planilha detalhada segue em anexo.',
  ].join('\n')
}

/** Entrega o arquivo. No celular, salva na pasta de downloads. */
export function baixarArquivo(conteudo: string, nome: string) {
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
