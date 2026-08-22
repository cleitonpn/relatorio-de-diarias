import { useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Campo } from '@/components/ui/Campo'
import { cn } from '@/lib/cn'

type Modo = 'entrar' | 'criar'

const ERROS: Record<string, string> = {
  'auth/invalid-credential': 'E-mail ou senha errados. Confira e tente de novo.',
  'auth/user-not-found': 'Não achamos essa conta. Toque em "Criar conta".',
  'auth/wrong-password': 'Senha errada. Tente de novo.',
  'auth/email-already-in-use': 'Esse e-mail já tem conta. Toque em "Entrar".',
  'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
  'auth/invalid-email': 'Esse e-mail não parece certo.',
  'auth/popup-closed-by-user': 'Você fechou a janela do Google antes de terminar.',
  'auth/network-request-failed': 'Sem internet. Verifique a conexão e tente de novo.',
}

export function Entrar() {
  const { entrarComEmail, criarContaComEmail, entrarComGoogle } = useAuth()
  const [modo, setModo] = useState<Modo>('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function executar(acao: () => Promise<void>) {
    setErro(null)
    setOcupado(true)
    try {
      await acao()
    } catch (e) {
      const codigo = (e as { code?: string }).code ?? ''
      setErro(ERROS[codigo] ?? 'Não deu certo. Tente de novo em instantes.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-canvas">
      {/* Topo com identidade */}
      <div
        className="relative px-6 pt-16 pb-14 text-white overflow-hidden safe-top"
        style={{ backgroundImage: 'linear-gradient(150deg, #4F46E5 0%, #3730A3 55%, #1E1B4B 100%)' }}
      >
        <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="relative max-w-md mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur grid place-items-center mb-5">
            <svg viewBox="0 0 64 64" className="w-8 h-8">
              <path d="M18 42V26l14-8 14 8v16" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M26 42v-9h12v9" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-[32px] font-extrabold leading-tight">Empreita</h1>
          <p className="text-[16px] text-white/80 mt-1.5 leading-relaxed">
            Controle suas feiras, sua equipe e o quanto sobra pra você.
          </p>
        </div>
      </div>

      {/* Formulário */}
      <div className="flex-1 px-5 -mt-8">
        <div className="max-w-md mx-auto card p-6 animate-fade-up">
          <div className="flex p-1 rounded-2xl bg-raised mb-6">
            {(['entrar', 'criar'] as Modo[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setModo(m)
                  setErro(null)
                }}
                className={cn(
                  'flex-1 h-11 rounded-xl text-[15px] font-semibold transition',
                  modo === m ? 'bg-surface text-ink shadow-card' : 'text-muted',
                )}
              >
                {m === 'entrar' ? 'Entrar' : 'Criar conta'}
              </button>
            ))}
          </div>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              executar(() =>
                modo === 'entrar'
                  ? entrarComEmail(email, senha)
                  : criarContaComEmail(nome, email, senha),
              )
            }}
          >
            {modo === 'criar' && (
              <Campo
                rotulo="Seu nome"
                placeholder="Como você quer ser chamado"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                autoComplete="name"
                required
              />
            )}

            <Campo
              rotulo="E-mail"
              type="email"
              inputMode="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />

            <Campo
              rotulo="Senha"
              type="password"
              placeholder="Pelo menos 6 caracteres"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
              required
              minLength={6}
            />

            {erro && (
              <div className="px-4 py-3 rounded-2xl bg-custo-soft text-custo text-[14px] font-medium">
                {erro}
              </div>
            )}

            <button type="submit" disabled={ocupado} className="btn-primary w-full">
              {ocupado ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  {modo === 'entrar' ? 'Entrar' : 'Criar minha conta'}
                  <ArrowRight size={19} />
                </>
              )}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-line" />
            <span className="text-[13px] text-faint font-medium">ou</span>
            <div className="flex-1 h-px bg-line" />
          </div>

          <button
            onClick={() => executar(entrarComGoogle)}
            disabled={ocupado}
            className="btn-ghost w-full"
          >
            <GoogleIcone />
            Continuar com Google
          </button>

          {modo === 'criar' && (
            <p className="mt-5 text-[13px] text-faint text-center leading-relaxed">
              30 dias grátis para testar. Não pedimos cartão agora.
            </p>
          )}
        </div>
      </div>

      <div className="h-10" />
    </div>
  )
}

function GoogleIcone() {
  return (
    <svg viewBox="0 0 48 48" className="w-5 h-5">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}
