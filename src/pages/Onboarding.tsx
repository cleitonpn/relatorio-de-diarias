import { useState } from 'react'
import { ArrowRight, Loader2, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Campo, Selecao } from '@/components/ui/Campo'

const RAMOS = [
  { valor: 'Tapeçaria', rotulo: 'Tapeçaria', emoji: '🧵' },
  { valor: 'Marcenaria', rotulo: 'Marcenaria', emoji: '🪚' },
  { valor: 'Elétrica', rotulo: 'Elétrica', emoji: '💡' },
  { valor: 'Vidraçaria', rotulo: 'Vidraçaria', emoji: '🪟' },
  { valor: 'Serralheria', rotulo: 'Serralheria', emoji: '🔧' },
  { valor: 'Limpeza', rotulo: 'Limpeza', emoji: '🧹' },
  { valor: 'Pintura', rotulo: 'Pintura', emoji: '🎨' },
  { valor: 'Outro', rotulo: 'Outro', emoji: '📦' },
]

/** Primeiro contato: só o essencial. Cada campo a mais aqui é gente desistindo. */
export function Onboarding() {
  const { criarEmpresa, sair, usuarioAuth } = useAuth()
  const [nome, setNome] = useState('')
  const [ramo, setRamo] = useState<string | null>(null)
  const [cidade, setCidade] = useState('')
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const podeSeguir = nome.trim().length >= 2 && !!ramo && cidade.trim().length >= 2

  async function enviar() {
    setErro(null)
    setOcupado(true)
    try {
      await criarEmpresa({ nome, ramo: ramo!, cidade, codigoIndicacao: codigo })
    } catch (e) {
      setErro((e as Error).message || 'Não deu para criar. Tente de novo.')
      setOcupado(false)
    }
  }

  return (
    <div className="min-h-dvh bg-canvas">
      <div className="max-w-md mx-auto px-5 py-10 safe-top">
        <button
          onClick={sair}
          className="flex items-center gap-1.5 text-[14px] font-medium text-muted mb-8"
        >
          <LogOut size={16} /> Sair
        </button>

        <h1 className="text-[28px] font-extrabold leading-tight">
          Bem-vindo{usuarioAuth?.displayName ? `, ${usuarioAuth.displayName.split(' ')[0]}` : ''}!
        </h1>
        <p className="text-[16px] text-muted mt-2 leading-relaxed">
          Conte só o básico do seu trabalho. Leva menos de um minuto.
        </p>

        <div className="mt-8 space-y-6 animate-fade-up">
          <Campo
            rotulo="Nome do seu negócio"
            placeholder="Ex.: Tapeçaria do Zé"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            dica="É o nome que aparece nos seus relatórios"
          />

          <Selecao
            rotulo="O que você faz"
            opcoes={RAMOS}
            valor={ramo}
            onChange={setRamo}
            colunas={2}
          />

          <Campo
            rotulo="Sua cidade"
            placeholder="Ex.: São Paulo"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            dica="Usada também no PIX que você vai gerar"
          />

          <Campo
            rotulo="Código de indicação (opcional)"
            placeholder="Se alguém te indicou"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            dica="Você ganha 50% de desconto na primeira mensalidade"
            maxLength={6}
          />

          {erro && (
            <div className="px-4 py-3 rounded-2xl bg-custo-soft text-custo text-[14px] font-medium">
              {erro}
            </div>
          )}

          <button onClick={enviar} disabled={!podeSeguir || ocupado} className="btn-primary w-full">
            {ocupado ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                Começar a usar <ArrowRight size={19} />
              </>
            )}
          </button>

          <p className="text-[13px] text-faint text-center leading-relaxed">
            Seus 30 dias grátis começam agora. Sem cartão, sem compromisso.
          </p>
        </div>
      </div>
    </div>
  )
}
