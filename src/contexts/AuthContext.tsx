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
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { auth, db, googleProvider } from '@/lib/firebase'
import { docEmpresa, docUsuario } from '@/lib/db'
import { DIAS_TESTE, gerarCodigoIndicacao } from '@/lib/planos'
import type { Convite, Empresa, Usuario } from '@/types'

interface EstadoAuth {
  carregando: boolean
  usuarioAuth: User | null
  perfil: Usuario | null
  empresa: Empresa | null
  /** true quando está logado mas ainda não criou a empresa. */
  precisaOnboarding: boolean
  /** Administrador da plataforma. Definido só à mão, no Console do Firebase. */
  ehAdmin: boolean
  entrarComEmail: (email: string, senha: string) => Promise<void>
  criarContaComEmail: (nome: string, email: string, senha: string) => Promise<void>
  entrarComGoogle: () => Promise<void>
  /** Entra numa empresa existente usando um código de convite. */
  entrarComConvite: (codigo: string, nomePessoa: string) => Promise<void>
  criarEmpresa: (dados: {
    /** Nome do negócio. */
    nome: string
    /** Nome da pessoa — pode ser diferente do que veio da conta Google. */
    nomePessoa: string
    ramo: string
    cidade: string
    codigoIndicacao?: string
  }) => Promise<void>
  sair: () => Promise<void>
}

/** Conta raiz da plataforma — precisa bater com a regra em firestore.rules. */
const ADMIN_RAIZ = 'cleitonpnascimento@gmail.com'

const Contexto = createContext<EstadoAuth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [carregando, setCarregando] = useState(true)
  const [usuarioAuth, setUsuarioAuth] = useState<User | null>(null)
  const [perfil, setPerfil] = useState<Usuario | null>(null)
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [ehAdminPorDoc, setEhAdminPorDoc] = useState(false)
  const [adminVerificado, setAdminVerificado] = useState(false)

  // 1) Sessão do Firebase Auth
  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setUsuarioAuth(user)
      if (!user) {
        setPerfil(null)
        setEmpresa(null)
        setEhAdminPorDoc(false)
        setAdminVerificado(false)
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

  /**
   * A conta raiz é reconhecida na hora, sem ida ao banco — senão a tela
   * pisca o cadastro de empreiteiro antes de cair no painel.
   *
   * Isto aqui só mostra ou esconde menu. Quem decide de verdade são as regras
   * do Firestore; repetir a checagem no cliente é conveniência, não segurança.
   */
  const ehAdminRaiz = !!usuarioAuth && usuarioAuth.email === ADMIN_RAIZ && usuarioAuth.emailVerified

  // 3) Admins adicionais vivem em /admins/{uid} — esses exigem uma leitura.
  useEffect(() => {
    if (!usuarioAuth || ehAdminRaiz) {
      setAdminVerificado(!!usuarioAuth)
      return
    }
    let cancelado = false
    getDoc(doc(db, 'admins', usuarioAuth.uid))
      .then((snap) => {
        if (cancelado) return
        setEhAdminPorDoc(snap.exists())
        setAdminVerificado(true)
      })
      .catch(() => {
        if (cancelado) return
        setEhAdminPorDoc(false)
        setAdminVerificado(true)
      })
    return () => {
      cancelado = true
    }
  }, [usuarioAuth, ehAdminRaiz])

  // 4) Empresa (tenant) — chega junto com o estado da assinatura
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
        // O nome digitado manda: a conta Google pode estar no nome da empresa,
        // do filho, ou sem nome nenhum.
        nome: dados.nomePessoa.trim() || user.displayName || 'Sem nome',
        email: user.email,
        telefone: null,
        papel: 'DONO',
        vePainelFinanceiro: true,
        colaboradorId: null,
        ativo: true,
        convite: null,
        criadoEm: serverTimestamp(),
      } as never)
    },
    [],
  )

  /**
   * Aceita um convite: cria o perfil apontando para a empresa do convite e
   * marca o convite como usado.
   *
   * A regra do Firestore confere o convite no ato da criação — o cliente não
   * consegue se apontar para uma empresa que não o convidou.
   */
  const entrarComConvite = useCallback<EstadoAuth['entrarComConvite']>(
    async (codigo, nomePessoa) => {
      const user = auth.currentUser
      if (!user) throw new Error('Sessão expirada. Entre de novo.')

      const chave = codigo.trim().toUpperCase()
      const conviteRef = doc(db, 'convites', chave)
      const snap = await getDoc(conviteRef)
      if (!snap.exists()) throw new Error('Convite não encontrado. Confira o código.')

      const convite = snap.data() as Convite
      if (convite.usado) throw new Error('Esse convite já foi usado.')

      await setDoc(docUsuario(user.uid), {
        empresaId: convite.empresaId,
        nome: nomePessoa.trim() || convite.colaboradorNome || user.displayName || 'Sem nome',
        email: user.email,
        telefone: null,
        papel: convite.papel,
        vePainelFinanceiro: false,
        colaboradorId: convite.colaboradorId ?? null,
        ativo: true,
        convite: chave,
        criadoEm: serverTimestamp(),
      } as never)

      await updateDoc(conviteRef, { usado: true, usadoPor: user.uid })
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
      // Só decide o destino depois de saber se é admin — evita mandar o
      // administrador para o cadastro de empreiteiro por meio segundo.
      precisaOnboarding: !!usuarioAuth && !carregando && !perfil && adminVerificado,
      ehAdmin: ehAdminRaiz || ehAdminPorDoc,
      entrarComEmail,
      criarContaComEmail,
      entrarComGoogle,
      entrarComConvite,
      criarEmpresa,
      sair,
    }),
    [
      carregando,
      usuarioAuth,
      perfil,
      empresa,
      ehAdminRaiz,
      ehAdminPorDoc,
      adminVerificado,
      entrarComEmail,
      criarContaComEmail,
      entrarComGoogle,
      entrarComConvite,
      criarEmpresa,
      sair,
    ],
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

/** Papéis, para as telas decidirem o que mostrar. */
export function usePapel() {
  const { perfil } = useAuth()
  return {
    ehDono: perfil?.papel === 'DONO',
    ehEncarregado: perfil?.papel === 'ENCARREGADO',
    ehColaborador: perfil?.papel === 'COLABORADOR',
    ehGestor: perfil?.papel === 'DONO' || perfil?.papel === 'ENCARREGADO',
    /** O dono sempre vê; o encarregado só se ele liberar. */
    veFinanceiro: perfil?.papel === 'DONO' || !!perfil?.vePainelFinanceiro,
  }
}

/** Se o perfil pode lançar coisa nova (assinatura em dia). */
export function usePodeEditar(): boolean {
  const { empresa } = useAuth()
  const status = empresa?.assinatura.status
  return status === 'TESTE' || status === 'ATIVA' || status === 'PENDENTE'
}
