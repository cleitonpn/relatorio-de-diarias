import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { ArrowRight, Building2, HardHat, Loader2, UserCheck } from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { Campo } from '@/components/ui/Campo'
import { CarregandoTela } from '@/components/ui/Estados'
import type { Convite } from '@/types'

/**
 * Entrada por convite.
 *
 * O empreiteiro manda o link no WhatsApp; a pessoa abre, entra com a conta
 * Google do próprio celular e pronto. Sem criar senha, sem lembrar e-mail —
 * que é onde esse público desiste.
 */
export function EntrarPorConvite() {
  const { codigo } = useParams<{ codigo: string }>()
  const navigate = useNavigate()
  const { usuarioAuth, perfil, entrarComGoogle, entrarComConvite, sair } = useAuth()

  const [convite, setConvite] = useState<Convite | null>(null)
  const [buscando, setBuscando] = useState(true)
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    if (!codigo) return
    getDoc(doc(db, 'convites', codigo.toUpperCase()))
      .then((snap) => {
        setConvite(snap.exists() ? ({ ...snap.data(), id: snap.id } as Convite) : null)
      })
      .catch(() => setConvite(null))
      .finally(() => setBuscando(false))
  }, [codigo])

  useEffect(() => {
    if (convite?.colaboradorNome && !nome) setNome(convite.colaboradorNome)
    else if (usuarioAuth?.displayName && !nome) setNome(usuarioAuth.displayName)
  }, [convite, usuarioAuth, nome])

  // Já tem perfil: não faz sentido aceitar convite de novo.
  useEffect(() => {
    if (perfil) navigate('/', { replace: true })
  }, [perfil, navigate])

  if (buscando) return <CarregandoTela />

  if (!convite || convite.usado) {
    return (
      <Aviso
        titulo={convite?.usado ? 'Esse convite já foi usado' : 'Convite não encontrado'}
        texto={
          convite?.usado
            ? 'Peça um link novo para quem te chamou.'
            : 'Confira o link com quem te enviou — ele pode ter vindo cortado.'
        }
      />
    )
  }

  const ehEncarregado = convite.papel === 'ENCARREGADO'

  async function aceitar() {
    setErro(null)
    setOcupado(true)
    try {
      if (!usuarioAuth) {
        await entrarComGoogle()
        setOcupado(false)
        return // o botão volta como "Entrar", agora já logado
      }
      await entrarComConvite(convite!.id, nome)
      navigate('/', { replace: true })
    } catch (e) {
      setErro((e as Error).message || 'Não deu certo. Tente de novo.')
      setOcupado(false)
    }
  }

  return (
    <div className="min-h-dvh bg-canvas">
      <div
        className="relative px-6 pt-14 pb-12 text-white overflow-hidden safe-top"
        style={{ backgroundImage: 'linear-gradient(150deg, #4F46E5 0%, #3730A3 55%, #1E1B4B 100%)' }}
      >
        <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="relative max-w-md mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur grid place-items-center mb-5">
            {ehEncarregado ? <HardHat size={26} /> : <UserCheck size={26} />}
          </div>
          <h1 className="text-[26px] font-extrabold leading-tight">
            {convite.empresaNome} está te chamando
          </h1>
          <p className="text-[16px] text-white/80 mt-2 leading-relaxed">
            {ehEncarregado
              ? 'Você vai poder marcar presença e cuidar da equipe nas feiras.'
              : 'Aqui você acompanha seus dias trabalhados e o quanto tem a receber.'}
          </p>
        </div>
      </div>

      <div className="px-5 -mt-7">
        <div className="max-w-md mx-auto card p-6 animate-fade-up space-y-5">
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-raised">
            <Building2 size={20} className="shrink-0 text-brand" />
            <div className="min-w-0">
              <div className="font-bold text-[15px] truncate">{convite.empresaNome}</div>
              <div className="text-[13px] text-muted">
                Convite para {ehEncarregado ? 'encarregado' : 'funcionário'}
              </div>
            </div>
          </div>

          {usuarioAuth ? (
            <>
              <Campo
                rotulo="Seu nome"
                placeholder="Como você quer ser chamado"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                dica={`Entrando com ${usuarioAuth.email}`}
              />

              {erro && (
                <div className="px-4 py-3 rounded-2xl bg-custo-soft text-custo text-[14px] font-medium">
                  {erro}
                </div>
              )}

              <button
                onClick={aceitar}
                disabled={ocupado || nome.trim().length < 2}
                className="btn-primary w-full"
              >
                {ocupado ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    Entrar <ArrowRight size={19} />
                  </>
                )}
              </button>

              <button onClick={sair} className="w-full h-11 text-[14px] font-semibold text-muted">
                Entrar com outra conta
              </button>
            </>
          ) : (
            <>
              <p className="text-[14.5px] text-muted leading-relaxed">
                Toque no botão abaixo para entrar com a conta Google do seu celular. Não precisa
                criar senha.
              </p>
              {erro && (
                <div className="px-4 py-3 rounded-2xl bg-custo-soft text-custo text-[14px] font-medium">
                  {erro}
                </div>
              )}
              <button onClick={aceitar} disabled={ocupado} className="btn-primary w-full">
                {ocupado ? <Loader2 size={20} className="animate-spin" /> : 'Continuar com Google'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="h-10" />
    </div>
  )
}

function Aviso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="min-h-dvh bg-canvas grid place-items-center px-6">
      <div className="max-w-sm text-center">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-alerta-soft text-alerta grid place-items-center mb-4">
          <UserCheck size={30} />
        </div>
        <h1 className="text-[20px] font-bold">{titulo}</h1>
        <p className="text-[15px] text-muted mt-2 leading-relaxed">{texto}</p>
      </div>
    </div>
  )
}
