import {
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'
import {
  colColaboradores,
  colContratantes,
  colCustos,
  colDiarias,
  colFeiras,
  colPagamentos,
  colStands,
  colVales,
} from './db'
import type { Colaborador, Custo, Diaria, Feira, Pagamento, Stand, Vale } from '@/types'

type SemMeta<T> = Omit<T, 'id' | 'empresaId' | 'criadoEm' | 'criadaEm'>

const agora = () => serverTimestamp()

/* ------------------------------ Colaboradores ------------------------------ */

export async function salvarColaborador(
  empresaId: string,
  dados: SemMeta<Colaborador>,
  id?: string,
) {
  if (id) {
    await updateDoc(doc(colColaboradores(empresaId), id), dados as never)
    return id
  }
  const ref = await addDoc(colColaboradores(empresaId), {
    ...dados,
    empresaId,
    criadoEm: agora(),
  } as never)
  return ref.id
}

/** Nunca apagamos gente: desativar preserva o histórico de diárias já pagas. */
export async function desativarColaborador(empresaId: string, id: string) {
  await updateDoc(doc(colColaboradores(empresaId), id), { ativo: false })
}

export async function reativarColaborador(empresaId: string, id: string) {
  await updateDoc(doc(colColaboradores(empresaId), id), { ativo: true })
}

/* ------------------------------- Contratantes ------------------------------ */

export async function criarContratante(empresaId: string, nome: string, cnpj?: string | null) {
  const ref = await addDoc(colContratantes(empresaId), {
    nome: nome.trim(),
    cnpj: cnpj?.replace(/\D/g, '') || null,
    contato: null,
    empresaId,
    criadoEm: agora(),
  } as never)
  return ref.id
}

/* ---------------------------------- Feiras --------------------------------- */

export async function salvarFeira(empresaId: string, dados: SemMeta<Feira>, id?: string) {
  if (id) {
    await updateDoc(doc(colFeiras(empresaId), id), dados as never)
    return id
  }
  const ref = await addDoc(colFeiras(empresaId), {
    ...dados,
    empresaId,
    criadaEm: agora(),
  } as never)
  return ref.id
}

export async function encerrarFeira(empresaId: string, id: string, encerrada = true) {
  await updateDoc(doc(colFeiras(empresaId), id), { encerrada })
}

/* ---------------------------------- Stands --------------------------------- */

export async function salvarStand(empresaId: string, dados: SemMeta<Stand>, id?: string) {
  if (id) {
    await updateDoc(doc(colStands(empresaId), id), dados as never)
    return id
  }
  const ref = await addDoc(colStands(empresaId), {
    ...dados,
    empresaId,
    criadoEm: agora(),
  } as never)
  return ref.id
}

export async function apagarStand(empresaId: string, id: string) {
  await deleteDoc(doc(colStands(empresaId), id))
}

/* --------------------------------- Diárias --------------------------------- */

/**
 * Lança (ou atualiza) a diária de uma pessoa num dia.
 *
 * O valor da diária e o do almoço são CONGELADOS aqui: se amanhã ele aumentar
 * a diária do Zé, o mês passado não pode mudar de valor.
 */
export async function salvarDiaria(empresaId: string, dados: SemMeta<Diaria>, id?: string) {
  if (id) {
    await updateDoc(doc(colDiarias(empresaId), id), dados as never)
    return id
  }
  const ref = await addDoc(colDiarias(empresaId), {
    ...dados,
    empresaId,
    criadaEm: agora(),
  } as never)
  return ref.id
}

export async function marcarPresenca(
  empresaId: string,
  diariaId: string,
  presenca: Diaria['presenca'],
) {
  await updateDoc(doc(colDiarias(empresaId), diariaId), { presenca })
}

export async function definirMultiplicador(
  empresaId: string,
  diariaId: string,
  multiplicador: Diaria['multiplicador'],
) {
  await updateDoc(doc(colDiarias(empresaId), diariaId), { multiplicador })
}

export async function apagarDiaria(empresaId: string, id: string) {
  await deleteDoc(doc(colDiarias(empresaId), id))
}

/** Escala várias pessoas em vários dias de uma vez (o "empenho"). */
export async function escalarEmLote(
  empresaId: string,
  lote: SemMeta<Diaria>[],
): Promise<number> {
  let gravadas = 0
  // O Firestore aceita no máximo 500 operações por lote.
  for (let i = 0; i < lote.length; i += 450) {
    const fatia = lote.slice(i, i + 450)
    const batch = writeBatch(db)
    for (const item of fatia) {
      batch.set(doc(colDiarias(empresaId)), { ...item, empresaId, criadaEm: agora() } as never)
    }
    await batch.commit()
    gravadas += fatia.length
  }
  return gravadas
}

/* ---------------------------------- Custos --------------------------------- */

export async function salvarCusto(empresaId: string, dados: SemMeta<Custo>, id?: string) {
  if (id) {
    await updateDoc(doc(colCustos(empresaId), id), dados as never)
    return id
  }
  const ref = await addDoc(colCustos(empresaId), {
    ...dados,
    empresaId,
    criadoEm: agora(),
  } as never)
  return ref.id
}

export async function apagarCusto(empresaId: string, id: string) {
  await deleteDoc(doc(colCustos(empresaId), id))
}

/* ----------------------------------- Vales --------------------------------- */

export async function criarVale(empresaId: string, dados: SemMeta<Vale>) {
  const ref = await addDoc(colVales(empresaId), {
    ...dados,
    empresaId,
    criadoEm: agora(),
  } as never)
  return ref.id
}

export async function responderVale(
  empresaId: string,
  id: string,
  status: Extract<Vale['status'], 'APROVADO' | 'NEGADO'>,
) {
  await updateDoc(doc(colVales(empresaId), id), { status })
}

export async function apagarVale(empresaId: string, id: string) {
  await deleteDoc(doc(colVales(empresaId), id))
}

/* -------------------------------- Pagamentos -------------------------------- */

/**
 * Fecha o acerto de uma pessoa.
 *
 * Grava o pagamento e carimba `pagamentoId` em cada diária e vale incluídos —
 * é essa marca que impede pagar a mesma diária duas vezes. Tudo num lote só:
 * ou entra inteiro, ou não entra nada.
 */
export async function fecharPagamento(
  empresaId: string,
  dados: Omit<Pagamento, 'id' | 'empresaId' | 'criadoEm'>,
): Promise<string> {
  const batch = writeBatch(db)
  const pagamentoRef = doc(colPagamentos(empresaId))

  batch.set(pagamentoRef, { ...dados, empresaId, criadoEm: agora() } as never)

  for (const diariaId of dados.diariaIds) {
    batch.update(doc(colDiarias(empresaId), diariaId), { pagamentoId: pagamentoRef.id })
  }
  for (const valeId of dados.valeIds) {
    batch.update(doc(colVales(empresaId), valeId), {
      status: 'DESCONTADO',
      pagamentoId: pagamentoRef.id,
    })
  }

  await batch.commit()
  return pagamentoRef.id
}

export async function confirmarPagamento(empresaId: string, id: string, data: string) {
  await updateDoc(doc(colPagamentos(empresaId), id), {
    status: 'PAGO',
    dataPagamento: data,
  })
}

/** Desfaz um acerto: solta as diárias e os vales para entrarem no próximo. */
export async function desfazerPagamento(empresaId: string, pagamento: Pagamento) {
  const batch = writeBatch(db)
  for (const diariaId of pagamento.diariaIds) {
    batch.update(doc(colDiarias(empresaId), diariaId), { pagamentoId: null })
  }
  for (const valeId of pagamento.valeIds) {
    batch.update(doc(colVales(empresaId), valeId), { status: 'APROVADO', pagamentoId: null })
  }
  batch.delete(doc(colPagamentos(empresaId), pagamento.id))
  await batch.commit()
}

/**
 * Tira as diárias antigas para a pessoa ser escalada em outra feira no
 * mesmo dia. Diária já paga nunca é removida — o histórico do pagamento
 * tem que continuar batendo.
 */
export async function liberarDiariasParaTransferencia(
  empresaId: string,
  diarias: Diaria[],
): Promise<number> {
  const transferiveis = diarias.filter((d) => !d.pagamentoId)
  for (let i = 0; i < transferiveis.length; i += 450) {
    const fatia = transferiveis.slice(i, i + 450)
    const batch = writeBatch(db)
    for (const d of fatia) batch.delete(doc(colDiarias(empresaId), d.id))
    await batch.commit()
  }
  return transferiveis.length
}

/**
 * Apaga uma feira e tudo que pendura nela.
 *
 * Cadastro errado acontece, e deixar lixo no relatório é pior que apagar.
 * Diária já paga trava a exclusão: apagar o que foi pago quebraria o
 * histórico do acerto, e essa conta precisa ser inquestionável.
 */
export async function apagarFeira(empresaId: string, feiraId: string): Promise<void> {
  const [diarias, custos, stands] = await Promise.all([
    getDocs(query(colDiarias(empresaId), where('feiraId', '==', feiraId))),
    getDocs(query(colCustos(empresaId), where('feiraId', '==', feiraId))),
    getDocs(query(colStands(empresaId), where('feiraId', '==', feiraId))),
  ])

  const paga = diarias.docs.find((d) => !!d.data().pagamentoId)
  if (paga) {
    throw new Error(
      'Essa feira já tem diária paga. Desfaça o pagamento antes de apagar.',
    )
  }

  // Coleções diferentes, então o tipo do documento varia: só o caminho importa.
  const alvos = [...diarias.docs, ...custos.docs, ...stands.docs].map((d) => d.ref.path)
  for (let i = 0; i < alvos.length; i += 450) {
    const batch = writeBatch(db)
    for (const caminho of alvos.slice(i, i + 450)) batch.delete(doc(db, caminho))
    await batch.commit()
  }
  await deleteDoc(doc(colFeiras(empresaId), feiraId))
}

/* -------------------------------- Convites -------------------------------- */

/** Código curto e legível ao telefone: sem 0/O nem 1/I. */
function gerarCodigoConvite(): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint32Array(8))
  return [...bytes].map((n) => alfabeto[n % alfabeto.length]).join('')
}

/**
 * Cria um convite de acesso.
 *
 * O código é o segredo — quem recebe o link entra. Por isso ele é longo o
 * bastante para não ser adivinhado, e vale uma vez só.
 */
export async function criarConvite(dados: {
  empresaId: string
  empresaNome: string
  papel: 'ENCARREGADO' | 'COLABORADOR'
  colaboradorId?: string | null
  colaboradorNome?: string | null
}): Promise<string> {
  const codigo = gerarCodigoConvite()
  await setDoc(doc(db, 'convites', codigo), {
    empresaId: dados.empresaId,
    empresaNome: dados.empresaNome,
    papel: dados.papel,
    colaboradorId: dados.colaboradorId ?? null,
    colaboradorNome: dados.colaboradorNome ?? null,
    usado: false,
    usadoPor: null,
    criadoEm: agora(),
  } as never)
  return codigo
}

export async function apagarConvite(codigo: string) {
  await deleteDoc(doc(db, 'convites', codigo))
}

/** O dono liga ou desliga o painel financeiro de um encarregado. */
export async function definirAcessoFinanceiro(uid: string, libera: boolean) {
  await updateDoc(doc(db, 'usuarios', uid), { vePainelFinanceiro: libera })
}

export async function desativarUsuario(uid: string, ativo: boolean) {
  await updateDoc(doc(db, 'usuarios', uid), { ativo })
}
