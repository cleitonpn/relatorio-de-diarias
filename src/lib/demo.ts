import { collection, doc, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from './firebase'
import {
  colColaboradores,
  colContratantes,
  colCustos,
  colDiarias,
  colFeiras,
  colStands,
  colVales,
} from './db'
import { dataParaISO, hojeISO, somarDias } from './format'
import type { Fase, Presenca } from '@/types'

/**
 * Dados de demonstração.
 *
 * Serve para dois casos: você conferir todas as telas cheias sem precisar
 * digitar nada, e mostrar o app funcionando para um empreiteiro novo.
 *
 * Todo documento criado aqui recebe um id que começa com "demo_". É isso que
 * permite limpar tudo depois sem tocar em nada real — nenhum campo extra
 * precisou ser inventado no modelo.
 */
const PREFIXO = 'demo_'

const ORIGEM_MANUAL = {
  tipo: 'MANUAL' as const,
  appOrigem: null,
  idExterno: null,
  importadoEm: null,
}

const EQUIPE = [
  { nome: 'José Carlos da Silva', apelido: 'Zé Baiano', funcao: 'Encarregado', diaria: 25000, ddd: '11', fone: '988887777' },
  { nome: 'Antônio Ferreira', apelido: 'Tico', funcao: 'Tapeceiro', diaria: 20000, ddd: '11', fone: '977776666' },
  { nome: 'Maria Aparecida Souza', apelido: 'Cida', funcao: 'Tapeceira', diaria: 20000, ddd: '11', fone: '966665555' },
  { nome: 'Roberto Alves', apelido: 'Beto', funcao: 'Ajudante', diaria: 18000, ddd: '11', fone: '955554444' },
  { nome: 'Francisco das Chagas', apelido: 'Chico', funcao: 'Ajudante', diaria: 18000, ddd: '11', fone: '944443333' },
  { nome: 'Paulo Henrique Lima', apelido: 'PH', funcao: 'Motorista', diaria: 22000, ddd: '11', fone: '933332222' },
]

const STANDS = [
  { nome: 'Alfa Móveis', m2: 50, valorM2: 6000 },
  { nome: 'Beta Tecnologia', m2: 36, valorM2: 6500 },
  { nome: 'Gama Alimentos', m2: 72, valorM2: 5500 },
]

export interface ResultadoDemo {
  criados: number
}

export async function criarDadosDemo(empresaId: string): Promise<ResultadoDemo> {
  const hoje = hojeISO()
  const inicio = somarDias(hoje, -2)
  const fim = somarDias(hoje, 2)
  let criados = 0

  const lote = writeBatch(db)
  const marca = () => criados++

  // Contratante
  const contratanteId = `${PREFIXO}contratante`
  lote.set(doc(colContratantes(empresaId), contratanteId), {
    empresaId,
    nome: 'Montadora Central Eventos',
    cnpj: null,
    contato: null,
    criadoEm: serverTimestamp(),
  } as never)
  marca()

  // Equipe
  const idsEquipe: { id: string; nome: string; diaria: number }[] = []
  EQUIPE.forEach((p, i) => {
    const id = `${PREFIXO}pessoa_${i}`
    idsEquipe.push({ id, nome: p.apelido, diaria: p.diaria })
    lote.set(doc(colColaboradores(empresaId), id), {
      empresaId,
      nome: p.nome,
      apelido: p.apelido,
      fotoUrl: null,
      telefone: `${p.ddd}${p.fone}`,
      funcao: p.funcao,
      diariaPadrao: p.diaria,
      chavePixTipo: 'TELEFONE',
      chavePix: `+55${p.ddd}${p.fone}`,
      nomeRecebedor: p.nome,
      ativo: true,
      tokenAcesso: null,
      criadoEm: serverTimestamp(),
    } as never)
    marca()
  })

  // Feira 1 — stand por stand, acontecendo agora
  const feiraId = `${PREFIXO}feira_stands`
  lote.set(doc(colFeiras(empresaId), feiraId), {
    empresaId,
    nome: 'Expo Construção 2026',
    local: 'Pavilhão Azul',
    cidade: 'São Paulo',
    contratanteId,
    contratanteNome: 'Montadora Central Eventos',
    dataInicio: inicio,
    dataFim: fim,
    modo: 'POR_STAND',
    pacoteValor: null,
    pacoteM2: null,
    pacoteQtdStands: null,
    politicaPagamento: 'FIM_FEIRA',
    almocoPorPessoaDia: 2500,
    dataPagamentoFixa: null,
    encerrada: false,
    origem: ORIGEM_MANUAL,
    criadaEm: serverTimestamp(),
  } as never)
  marca()

  STANDS.forEach((s, i) => {
    lote.set(doc(colStands(empresaId), `${PREFIXO}stand_${i}`), {
      empresaId,
      feiraId,
      nome: s.nome,
      m2: s.m2,
      tipoCobranca: 'POR_M2',
      valorM2: s.valorM2,
      valorTotal: null,
      contratanteId,
      origem: ORIGEM_MANUAL,
      criadoEm: serverTimestamp(),
    } as never)
    marca()
  })

  // Feira 2 — pacote fechado, já encerrada (alimenta o histórico)
  const feiraPacoteId = `${PREFIXO}feira_pacote`
  lote.set(doc(colFeiras(empresaId), feiraPacoteId), {
    empresaId,
    nome: 'Salão do Automóvel',
    local: 'Pavilhão Verde',
    cidade: 'São Paulo',
    contratanteId,
    contratanteNome: 'Montadora Central Eventos',
    dataInicio: somarDias(hoje, -25),
    dataFim: somarDias(hoje, -20),
    modo: 'PACOTE',
    pacoteValor: 9000000,
    pacoteM2: 3000,
    pacoteQtdStands: 40,
    politicaPagamento: 'SEMANAL_SEXTA',
    almocoPorPessoaDia: 2500,
    dataPagamentoFixa: null,
    encerrada: true,
    origem: ORIGEM_MANUAL,
    criadaEm: serverTimestamp(),
  } as never)
  marca()

  await lote.commit()

  // Diárias da feira em andamento — presença variada, como na vida real
  const diasFeira = [inicio, somarDias(inicio, 1), hoje, somarDias(hoje, 1), fim]
  const loteDiarias = writeBatch(db)
  let indice = 0

  diasFeira.forEach((dia, d) => {
    const fase: Fase = d === 0 || d === 1 ? 'MONTAGEM' : d === 4 ? 'DESMONTAGEM' : 'EVENTO'
    // Na desmontagem vai menos gente — é assim que acontece de verdade
    const equipeDoDia = fase === 'DESMONTAGEM' ? idsEquipe.slice(0, 3) : idsEquipe

    equipeDoDia.forEach((p, i) => {
      const passado = dia < hoje
      const presenca: Presenca = !passado && dia > hoje ? 'PREVISTO' : i === 4 && d === 1 ? 'FALTOU' : 'PRESENTE'
      loteDiarias.set(doc(colDiarias(empresaId), `${PREFIXO}diaria_${indice++}`), {
        empresaId,
        feiraId,
        standId: null,
        colaboradorId: p.id,
        colaboradorNome: p.nome,
        data: dia,
        fase,
        valorDiaria: p.diaria,
        multiplicador: fase === 'DESMONTAGEM' && i === 0 ? 1.5 : 1,
        valorAlmoco: 2500,
        presenca,
        observacao: null,
        pagamentoId: null,
      } as never)
      criados++
    })
  })
  await loteDiarias.commit()

  // Gastos
  const loteCustos = writeBatch(db)
  const gastos = [
    { categoria: 'COMBUSTIVEL', valor: 28000, descricao: 'Diesel da van', dia: inicio },
    { categoria: 'ESTACIONAMENTO', valor: 9000, descricao: 'Pavilhão, 3 diárias', dia: inicio },
    { categoria: 'MATERIAL', valor: 45000, descricao: 'Carpete e cola', dia: inicio },
    { categoria: 'ALMOCO', valor: 12000, descricao: 'Marmita extra do domingo', dia: hoje },
    { categoria: 'TRANSPORTE', valor: 15000, descricao: 'Frete do material', dia: somarDias(inicio, 1) },
  ]
  gastos.forEach((g, i) => {
    loteCustos.set(doc(colCustos(empresaId), `${PREFIXO}custo_${i}`), {
      empresaId,
      feiraId,
      standId: null,
      categoria: g.categoria,
      descricao: g.descricao,
      valor: g.valor,
      data: g.dia,
      comprovanteUrl: null,
      criadoEm: serverTimestamp(),
    } as never)
    criados++
  })

  // Vales — um aprovado e um esperando decisão, para ver os dois estados
  loteCustos.set(doc(colVales(empresaId), `${PREFIXO}vale_0`), {
    empresaId,
    colaboradorId: idsEquipe[1].id,
    colaboradorNome: idsEquipe[1].nome,
    feiraId,
    valor: 10000,
    data: somarDias(hoje, -1),
    status: 'APROVADO',
    origemPedido: 'DONO',
    observacao: 'Pediu para o mercado',
    pagamentoId: null,
    criadoEm: serverTimestamp(),
  } as never)
  criados++

  loteCustos.set(doc(colVales(empresaId), `${PREFIXO}vale_1`), {
    empresaId,
    colaboradorId: idsEquipe[3].id,
    colaboradorNome: idsEquipe[3].nome,
    feiraId,
    valor: 15000,
    data: dataParaISO(new Date()),
    status: 'SOLICITADO',
    origemPedido: 'COLABORADOR',
    observacao: 'Remédio da filha',
    pagamentoId: null,
    criadoEm: serverTimestamp(),
  } as never)
  criados++

  await loteCustos.commit()

  return { criados }
}

/** Apaga tudo que o modo demonstração criou, sem tocar em dado real. */
export async function limparDadosDemo(empresaId: string): Promise<number> {
  const colecoes = [
    'colaboradores',
    'contratantes',
    'feiras',
    'stands',
    'diarias',
    'custos',
    'vales',
  ]

  let apagados = 0
  for (const col of colecoes) {
    // Filtrar pelo id no cliente é mais simples e seguro que uma consulta por
    // faixa de documentId, e o volume aqui é pequeno por definição.
    const snap = await getDocs(collection(db, 'empresas', empresaId, col))
    const demo = snap.docs.filter((d) => d.id.startsWith(PREFIXO))
    for (let i = 0; i < demo.length; i += 450) {
      const fatia = demo.slice(i, i + 450)
      const lote = writeBatch(db)
      for (const d of fatia) lote.delete(d.ref)
      await lote.commit()
      apagados += fatia.length
    }
  }
  return apagados
}
