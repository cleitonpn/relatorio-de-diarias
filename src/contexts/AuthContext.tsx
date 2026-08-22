import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore'
import { auth, db, googleProvider } from '@/lib/firebase'
import { docEmpresa, docUsuario } from '@/lib/db'
import { DIAS_TESTE, gerarCodigoIndicacao } from '@/lib/planos'
import type { Empresa, Usuario } from '@/types'

interface EstadoAuth {
  carregando: boolean
  usuarioAuth: User | null
  perfil: Usuario | null
  empresa: Empresa | null
  /** true quando está logado mas ainda não criou a empresa. */
  precisaOnboarding: boolean
  entrarComEmail: (email: string, senha: string) => Promise<void>
  criarContaComEmail: (nome: string, email: string, senha: string) => Promise<void>
  entrarComGoogle: () => Promise<void>
  criarEmpresa: (dados: { nome: string; ramo: string; cidade: string; codigoIndicacao?: string }) => Promise<void>
  sair: () => Promise<void>
}

const Contexto = createContext<EstadoAuth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [carregando, setCarregando] = useState(true)
  const [usuarioAuth, setUsuarioAuth] = useState<User | null>(null)
  const [perfil, setPerfil] = useState<Usuario | null>(null)
  const [empresa, setEmpresa] = useState<Empresa | null>(null)

  // 1) Sessão do Firebase Auth
  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setUsuarioAuth(user)
      if (!user) {
        setPerfil(null)
        setEmpresa(null)
        setCarregando(false)
      }
    })
  }, [])

  // 2) Perfil do usuário (papel, empresa a que pertence)
  useEffect(() => {
    if (!usuarioAuth) return
    return onSnapshot(
      docUsuario(usuarioAuth.uid),
      (snap) => {
        setPerfil(snap.exists() ? ({ ...snap.data(), id: snap.id } as Usuario) : null)
        setCarregando(false)
      },
      () => setCarregando(false),
    )
  }, [usuarioAuth])

  // 3) Empresa (tenant) — chega junto com o estado da assinatura
  useEffect(() => {
    if (!perfil?.empresaId) {
      setEmpresa(null)
      return
    }
    return onSnapshot(docEmpresa(perfil.empresaId), (snap) => {
      setEmpresa(snap.exists() ? ({ ...snap.data(), id: snap.id } as Empresa) : null)
    })
  }, [perfil?.empresaId])

  const entrarComEmail = useCallback(async (email: string, senha: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), senha)
  }, [])

  const criarContaComEmail = useCallback(async (nome: string, email: string, senha: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), senha)
    await updateProfile(cred.user, { displayName: nome.trim() })
  }, [])

  const entrarComGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider)
  }, [])

  /**
   * Cria a empresa (tenant) e o perfil de dono numa tacada só.
   * Todo mundo nasce em TESTE — a regra do Firestore recusa qualquer outro estado.
   */
  const criarEmpresa = useCallback<EstadoAuth['criarEmpresa']>(
    async (dados) => {
      const user = auth.currentUser
      if (!user) throw new Error('Sessão expirada. Entre de novo.')

      const empresaRef = doc(db, 'empresas', user.uid)
      const fimTeste = new Date()
      fimTeste.setDate(fimTeste.getDate() + DIAS_TESTE)

      const novaEmpresa: Omit<Empresa, 'id' | 'criadaEm'> & { criadaEm: unknown } = {
        nome: dados.nome.trim(),
        ramo: dados.ramo.trim() || null,
        cidade: dados.cidade.trim() || null,
        documento: null,
        donoUid: user.uid,
        codigoIndicacao: gerarCodigoIndicacao(),
        indicadaPor: dados.codigoIndicacao?.trim().toUpperCase() || null,
        assinatura: {
          plano: 'EQUIPE',
          status: 'TESTE',
          fimTeste: Timestamp.fromDate(fimTeste),
          fimPeriodo: null,
          descontoPercentual: null,
          descontoMotivo: null,
          descontoAte: null,
          mpPreapprovalId: null,
          mpPayerId: null,
          creditoMeses: 0,
        },
        almocoPadrao: 2500,
        aceiteTermos: null,
        criadaEm: serverTimestamp(),
      }

      await setDoc(empresaRef, novaEmpresa)

      await setDoc(docUsuario(user.uid), {
        empresaId: empresaRef.id,
        nome: user.displayName || dados.nome.trim(),
        email: user.email,
        telefone: null,
        papel: 'DONO',
        vePainelFinanceiro: true,
        ativo: true,
        criadoEm: serverTimestamp(),
      } as never)
    },
    [],
  )

  const sair = useCallback(async () => {
    await signOut(auth)
  }, [])

  const valor = useMemo<EstadoAuth>(
    () => ({
      carregando,
      usuarioAuth,
      perfil,
      empresa,
      precisaOnboarding: !!usuarioAuth && !carregando && !perfil,
      entrarComEmail,
      criarContaComEmail,
      entrarComGoogle,
      criarEmpresa,
      sair,
    }),
    [carregando, usuarioAuth, perfil, empresa, entrarComEmail, criarContaComEmail, entrarComGoogle, criarEmpresa, sair],
  )

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useAuth(): EstadoAuth {
  const ctx = useContext(Contexto)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}

/** Atalho: id da empresa corrente (lança se não houver). */
export function useEmpresaId(): string {
  const { perfil } = useAuth()
  if (!perfil?.empresaId) throw new Error('Sem empresa ativa')
  return perfil.empresaId
}

/** Se o perfil pode lançar coisa nova (assinatura em dia). */
export function usePodeEditar(): boolean {
  const { empresa } = useAuth()
  const status = empresa?.assinatura.status
  return status === 'TESTE' || status === 'ATIVA' || status === 'PENDENTE'
}

export async function buscarEmpresaPorCodigo(codigo: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'empresas', codigo))
  return snap.exists()
}
