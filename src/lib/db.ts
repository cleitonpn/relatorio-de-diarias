import {
  collection,
  doc,
  type CollectionReference,
  type DocumentData,
} from 'firebase/firestore'
import { db } from './firebase'
import type {
  Colaborador,
  Contratante,
  Custo,
  Diaria,
  Empresa,
  Feira,
  Pagamento,
  Recebimento,
  Stand,
  Usuario,
  Vale,
} from '@/types'

/**
 * Tudo do inquilino vive sob /empresas/{empresaId}/...
 * O isolamento entre empreiteiros é garantido pelas regras do Firestore,
 * nunca pelo código da tela — se depender do front-end, uma hora vaza.
 */

function sub<T = DocumentData>(empresaId: string, nome: string) {
  return collection(db, 'empresas', empresaId, nome) as CollectionReference<T>
}

export const colEmpresas = collection(db, 'empresas') as CollectionReference<Empresa>
export const colUsuarios = collection(db, 'usuarios') as CollectionReference<Usuario>

export const docEmpresa = (id: string) => doc(colEmpresas, id)
export const docUsuario = (uid: string) => doc(colUsuarios, uid)

export const colColaboradores = (e: string) => sub<Colaborador>(e, 'colaboradores')
export const colContratantes = (e: string) => sub<Contratante>(e, 'contratantes')
export const colFeiras = (e: string) => sub<Feira>(e, 'feiras')
export const colStands = (e: string) => sub<Stand>(e, 'stands')
export const colDiarias = (e: string) => sub<Diaria>(e, 'diarias')
export const colCustos = (e: string) => sub<Custo>(e, 'custos')
export const colVales = (e: string) => sub<Vale>(e, 'vales')
export const colPagamentos = (e: string) => sub<Pagamento>(e, 'pagamentos')
export const colRecebimentos = (e: string) => sub<Recebimento>(e, 'recebimentos')
