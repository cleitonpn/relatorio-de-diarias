import { useState } from 'react'
import { ArrowLeft, ArrowRight, Loader2, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Campo, CampoDinheiro, Selecao } from '@/components/ui/Campo'
import { Sheet } from '@/components/ui/Sheet'
import { ConteudoTermos } from './Termos'
import { Check } from 'lucide-react'

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
export function Onboarding({ aoVoltar }: { aoVoltar?: () => void } = {}) {
  const { criarEmpresa, sair, usuarioAuth } = useAuth()
  const [nomePessoa, setNomePessoa] = useState(usuarioAuth?.displayName ?? '')
  const [nome, setNome] = useState('')
  const [ramo, setRamo] = useState<string | null>(null)
  const [cidade, setCidade] = useState('')
  const [valorM2, setValorM2] = useState(0)
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [aceitou, setAceitou] = useState(false)
  const [lendoTermos, setLendoTermos] = useState(false)

  const podeSeguir =
    nomePessoa.trim().length >= 2 &&
    nome.trim().length >= 2 &&
    !!ramo &&
    cidade.trim().length >= 2 &&
    aceitou

  async function enviar() {
    setErro(null)
    setOcupado(true)
    try {
      await criarEmpresa({
        nome,
        nomePessoa,
        ramo: ramo!,
        cidade,
        codigoIndicacao: codigo,
        valorM2Padrao: valorM2 > 0 ? valorM2 : null,
        aceitouTermos: true,
      })
    } catch (e) {
      setErro((e as Error).message || 'Não deu para criar. Tente de novo.')
      setOcupado(false)
    }
  }

  return (
    <div className="min-h-dvh bg-canvas">
      <div className="max-w-md mx-auto px-5 py-10 safe-top">
        {aoVoltar ? (
          <button
            onClick={aoVoltar}
            className="flex items-center gap-1.5 text-[14px] font-medium text-muted mb-8"
          >
            <ArrowLeft size={16} /> Voltar para a administração
          </button>
        ) : (
          <button
            onClick={sair}
            className="flex items-center gap-1.5 text-[14px] font-medium text-muted mb-8"
          >
            <LogOut size={16} /> Sair
          </button>
        )}

        <h1 className="text-[28px] font-extrabold leading-tight">
          Bem-vindo{usuarioAuth?.displayName ? `, ${usuarioAuth.displayName.split(' ')[0]}` : ''}!
        </h1>
        <p className="text-[16px] text-muted mt-2 leading-relaxed">
          Conte só o básico do seu trabalho. Leva menos de um minuto.
        </p>

        <div className="mt-8 space-y-6 animate-fade-up">
          <Campo
            rotulo="Seu nome"
            placeholder="Como você quer ser chamado"
            value={nomePessoa}
            onChange={(e) => setNomePessoa(e.target.value)}
            dica="Pode ser diferente do nome da sua conta Google"
            autoComplete="name"
          />

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

          <CampoDinheiro
            rotulo="Quanto você cobra por m² (opcional)"
            valor={valorM2}
            onChange={setValorM2}
            dica="O app usa isso para dizer se uma proposta está boa. Dá para mudar depois."
          />

          <Campo
            rotulo="Código de indicação (opcional)"
            placeholder="Se alguém te indicou"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            dica="Você ganha 50% de desconto na primeira mensalidade"
            maxLength={6}
          />

          {/* Aceite antes de criar a conta — com o texto a um toque de distância */}
          <button
            type="button"
            onClick={() => setAceitou((v) => !v)}
            className="w-full flex items-start gap-3 p-4 rounded-2xl bg-raised border border-line text-left active:scale-[.99] transition"
          >
            <span
              className={`shrink-0 w-6 h-6 mt-0.5 rounded-lg border-2 grid place-items-center transition ${
                aceitou ? 'bg-brand border-brand text-white' : 'border-line'
              }`}
            >
              {aceitou && <Check size={15} strokeWidth={3} />}
            </span>
            <span className="text-[14px] leading-relaxed">
              Li e aceito os{' '}
              <span
                role="link"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation()
                  setLendoTermos(true)
                }}
                className="font-bold text-brand underline"
              >
                Termos de Uso e a Política de Privacidade
              </span>
              .
            </span>
          </button>

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

      {lendoTermos && (
        <Sheet
          aberto
          aoFechar={() => setLendoTermos(false)}
          titulo="Termos de Uso"
          subtitulo="e Política de Privacidade"
          alturaTotal
          rodape={
            <button
              onClick={() => {
                setAceitou(true)
                setLendoTermos(false)
              }}
              className="btn-primary w-full"
            >
              Li e aceito
            </button>
          }
        >
          <ConteudoTermos />
        </Sheet>
      )}
    </div>
  )
}
