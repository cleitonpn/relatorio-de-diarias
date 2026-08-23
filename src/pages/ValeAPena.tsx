import { useMemo, useState } from 'react'
import { Calculator, Send, TrendingUp } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useColaboradores, useFeiras, useTodosStands } from '@/hooks/useDados'
import { BarraTopo, EspacoBarra } from '@/components/app/Navegacao'
import { Campo, CampoDinheiro } from '@/components/ui/Campo'
import { cn } from '@/lib/cn'
import {
  MARGEM_ALVO,
  agruparPorFeira,
  avaliarProposta,
  precoHabitualPorM2,
  TEXTO_SAUDE,
} from '@/lib/calc'
import { moeda, percentual } from '@/lib/format'

/**
 * "Vale a pena?"
 *
 * O gerente liga oferecendo um valor e ele tem trinta segundos para responder.
 * Hoje essa conta é feita de cabeça, e errada. Aqui ela sai na hora — e junto
 * com a contraproposta, porque descobrir que está ruim sem saber quanto pedir
 * não resolve o problema dele.
 */
export function ValeAPena() {
  const { empresa } = useAuth()
  const { dados: equipe } = useColaboradores()
  const { dados: feiras } = useFeiras()
  const { dados: stands } = useTodosStands()

  // Diária média da equipe real dele — não um número inventado.
  const diariaSugerida = useMemo(() => {
    if (equipe.length === 0) return 20000
    return Math.round(equipe.reduce((t, p) => t + p.diariaPadrao, 0) / equipe.length)
  }, [equipe])

  const habitual = useMemo(
    () => precoHabitualPorM2(feiras, agruparPorFeira(stands)),
    [feiras, stands],
  )

  const [valor, setValor] = useState(0)
  const [m2, setM2] = useState('')
  const [dias, setDias] = useState('')
  const [pessoas, setPessoas] = useState('')
  const [diaria, setDiaria] = useState(diariaSugerida)
  const [outros, setOutros] = useState(0)
  const [tocouDiaria, setTocouDiaria] = useState(false)

  // Enquanto ele não mexer, a diária acompanha a média da equipe.
  const diariaEfetiva = tocouDiaria ? diaria : diariaSugerida

  const metros = Number(m2.replace(',', '.')) || 0
  const numDias = Number(dias) || 0
  const numPessoas = Number(pessoas) || 0
  const preencheu = valor > 0 && numDias > 0 && numPessoas > 0

  const veredito = useMemo(
    () =>
      avaliarProposta({
        valorProposto: valor,
        m2: metros,
        dias: numDias,
        pessoas: numPessoas,
        diariaMedia: diariaEfetiva,
        almocoPorPessoaDia: empresa?.almocoPadrao ?? 2500,
        outrosCustos: outros,
      }),
    [valor, metros, numDias, numPessoas, diariaEfetiva, empresa?.almocoPadrao, outros],
  )

  const texto = TEXTO_SAUDE[veredito.saude]
  const precisaContraproposta = veredito.margem < MARGEM_ALVO

  async function mandarContraproposta() {
    const linhas = [
      metros > 0 ? `Para os ${metros} m² dessa feira,` : 'Para esse serviço,',
      `pelo valor de ${moeda(valor)} não fecha pra mim.`,
      '',
      `São ${veredito.totalDiarias} diárias de trabalho, o que dá ${moeda(veredito.custoTotal)} de custo.`,
      '',
      `Consigo fechar por ${moeda(veredito.contraproposta)}${
        metros > 0 ? ` (${moeda(veredito.contrapropostaPorM2)} o m²)` : ''
      }.`,
    ]
    const mensagem = linhas.join('\n')
    if (navigator.share) {
      try {
        await navigator.share({ text: mensagem })
        return
      } catch {
        /* cancelou */
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(mensagem)}`, '_blank')
  }

  return (
    <>
      <BarraTopo
        titulo="Vale a pena?"
        subtitulo="Antes de aceitar o serviço"
        voltarPara="/dinheiro"
      />

      <main className="max-w-2xl lg:max-w-3xl mx-auto px-4 pt-4 space-y-4">
        <div className="card p-5 space-y-5">
          <div className="flex items-center gap-2.5">
            <Calculator size={20} className="text-brand" />
            <span className="text-[15px] font-bold">O que te ofereceram</span>
          </div>

          <CampoDinheiro
            rotulo="Valor proposto"
            valor={valor}
            onChange={setValor}
            grande
            dica="O total que te pagariam pelo serviço"
          />

          <div className="grid grid-cols-3 gap-2.5">
            <Campo
              rotulo="Tamanho"
              type="number"
              inputMode="decimal"
              placeholder="1000"
              value={m2}
              onChange={(e) => setM2(e.target.value)}
              sufixo="m²"
            />
            <Campo
              rotulo="Dias"
              type="number"
              inputMode="numeric"
              placeholder="5"
              value={dias}
              onChange={(e) => setDias(e.target.value)}
            />
            <Campo
              rotulo="Pessoas"
              type="number"
              inputMode="numeric"
              placeholder="6"
              value={pessoas}
              onChange={(e) => setPessoas(e.target.value)}
            />
          </div>

          <CampoDinheiro
            rotulo="Diária de cada um"
            valor={diariaEfetiva}
            onChange={(v) => {
              setDiaria(v)
              setTocouDiaria(true)
            }}
            dica={
              tocouDiaria
                ? undefined
                : `Média da sua equipe. Toque para mudar.`
            }
          />

          <CampoDinheiro
            rotulo="Outros gastos previstos"
            valor={outros}
            onChange={setOutros}
            dica="Combustível, material, estacionamento…"
          />
        </div>

        {!preencheu ? (
          <div className="p-5 rounded-3xl bg-raised text-center">
            <p className="text-[14.5px] text-muted leading-relaxed">
              Preencha o valor, os dias e quantas pessoas para ver o resultado.
            </p>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-up">
            {/* O veredito */}
            <div
              className="relative overflow-hidden p-6 rounded-3xl text-white shadow-lift"
              style={{
                backgroundImage:
                  veredito.saude === 'PREJUIZO'
                    ? 'linear-gradient(140deg, #E11D48 0%, #9F1239 60%, #881337 100%)'
                    : veredito.saude === 'APERTADO'
                      ? 'linear-gradient(140deg, #D97706 0%, #B45309 60%, #92400E 100%)'
                      : 'linear-gradient(140deg, #059669 0%, #047857 60%, #065F46 100%)',
              }}
            >
              <div className="absolute -top-20 -right-14 w-52 h-52 rounded-full bg-white/10 blur-2xl" aria-hidden />
              <div className="relative">
                <div className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-white/80">
                  {texto.titulo} {texto.emoji}
                </div>
                <div className="tnum text-[clamp(28px,9vw,42px)] font-extrabold leading-none mt-1.5 whitespace-nowrap">
                  {moeda(veredito.sobra)}
                </div>
                <div className="text-[14.5px] text-white/85 mt-1.5">
                  sobra pra você · {percentual(veredito.margem)}
                </div>
                <p className="mt-3 text-[14.5px] text-white/90 leading-relaxed">
                  {frase(veredito.saude, veredito.totalDiarias)}
                </p>
              </div>
            </div>

            {/* A contraproposta */}
            {precisaContraproposta && (
              <div className="card p-5 border-2 border-brand/30">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp size={19} className="text-brand" />
                  <span className="text-[13px] font-bold text-brand uppercase tracking-wide">
                    Peça este valor
                  </span>
                </div>
                <div className="tnum text-[32px] font-extrabold text-brand leading-none mt-1">
                  {moeda(veredito.contraproposta)}
                </div>
                {metros > 0 && (
                  <div className="text-[14px] text-muted mt-1">
                    {moeda(veredito.contrapropostaPorM2)} o m²
                  </div>
                )}
                <p className="text-[13.5px] text-muted mt-2.5 leading-relaxed">
                  Com esse valor sobram {moeda(veredito.contraproposta - veredito.custoTotal)} pra
                  você — uma folga sadia para imprevisto.
                </p>
                <button onClick={mandarContraproposta} className="btn-primary w-full mt-4">
                  <Send size={18} /> Mandar contraproposta
                </button>
              </div>
            )}

            {/* A conta aberta */}
            <div className="card p-5">
              <h3 className="text-[13px] font-bold text-faint uppercase tracking-wide mb-1">
                Como fica a conta
              </h3>
              <Linha rotulo="Você recebe" valor={moeda(valor)} tom="lucro" />
              <Linha
                rotulo={`${veredito.totalDiarias} diárias (${numPessoas} × ${numDias} dias)`}
                valor={`− ${moeda(veredito.custoMaoDeObra)}`}
                tom="custo"
              />
              <Linha rotulo="Comida" valor={`− ${moeda(veredito.custoAlmoco)}`} tom="custo" />
              {outros > 0 && (
                <Linha rotulo="Outros gastos" valor={`− ${moeda(outros)}`} tom="custo" />
              )}
              <div className="flex items-center justify-between pt-3.5 mt-1 border-t-2 border-line">
                <span className="text-[16px] font-bold">Sobra</span>
                <span
                  className={cn(
                    'tnum text-[21px] font-extrabold',
                    veredito.sobra >= 0 ? 'text-lucro' : 'text-custo',
                  )}
                >
                  {moeda(veredito.sobra)}
                </span>
              </div>
            </div>

            {/* Os limites */}
            <div className="grid grid-cols-2 gap-2.5">
              <Caixa
                rotulo="Abaixo disso é prejuízo"
                valor={moeda(veredito.pontoDeEquilibrio)}
                tom="custo"
              />
              <Caixa
                rotulo="Máximo em mão de obra"
                valor={moeda(veredito.tetoMaoDeObra)}
              />
            </div>

            {/* Comparação com o histórico dele */}
            {metros > 0 && habitual && habitual > 0 && (
              <div
                className={cn(
                  'p-4 rounded-3xl border',
                  veredito.valorPorM2 >= habitual
                    ? 'bg-lucro-soft border-lucro/20'
                    : 'bg-alerta-soft border-alerta/20',
                )}
              >
                <div className="text-[15px] font-bold leading-snug">
                  Essa proposta paga {moeda(veredito.valorPorM2)} o m².
                </div>
                <div className="text-[13.5px] text-muted mt-1 leading-relaxed">
                  Você costuma receber <strong>{moeda(habitual)}</strong> o m² nas suas feiras —
                  {veredito.valorPorM2 >= habitual
                    ? ' essa está acima do seu normal.'
                    : ` essa está ${percentual((habitual - veredito.valorPorM2) / habitual)} abaixo.`}
                </div>
              </div>
            )}

            <p className="px-1 text-[12.5px] text-faint leading-relaxed">
              A conta usa a diária média da sua equipe e o almoço que você cadastrou. Ela não
              considera imposto nem imprevisto — por isso a sugestão deixa folga.
            </p>
          </div>
        )}

        <EspacoBarra />
      </main>
    </>
  )
}

function frase(saude: string, diarias: number): string {
  switch (saude) {
    case 'PREJUIZO':
      return `Nesse valor você paga do seu bolso. Não pegue sem renegociar.`
    case 'APERTADO':
      return `Dá pra fazer, mas sem folga. Um dia a mais de trabalho e você perde dinheiro.`
    case 'BOM':
      return `Serviço saudável. As ${diarias} diárias cabem com folga.`
    default:
      return `Proposta muito boa. Vale pegar.`
  }
}

function Linha({ rotulo, valor, tom }: { rotulo: string; valor: string; tom?: 'lucro' | 'custo' }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-line last:border-0">
      <span className="text-[14.5px] text-muted">{rotulo}</span>
      <span
        className={cn(
          'tnum text-[15.5px] font-bold',
          tom === 'lucro' && 'text-lucro',
          tom === 'custo' && 'text-custo',
        )}
      >
        {valor}
      </span>
    </div>
  )
}

function Caixa({ rotulo, valor, tom }: { rotulo: string; valor: string; tom?: 'custo' }) {
  return (
    <div className="card p-3.5">
      <div className="text-[11.5px] font-bold text-faint uppercase tracking-wide leading-tight">
        {rotulo}
      </div>
      <div className={cn('tnum text-[17px] font-extrabold mt-1', tom === 'custo' && 'text-custo')}>
        {valor}
      </div>
    </div>
  )
}
