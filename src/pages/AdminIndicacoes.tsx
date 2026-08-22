import { useMemo, useState } from 'react'
import { ArrowRight, Check, Gift, Loader2 } from 'lucide-react'
import { EstadoVazio } from '@/components/ui/Estados'
import { useToast } from '@/components/app/Toast'
import { cn } from '@/lib/cn'
import {
  contarIndicacoesPagantes,
  liberarPremioIndicacao,
  montarIndicacoes,
  type ResumoConta,
} from '@/lib/admin'
import { PREMIOS_INDICACAO } from '@/lib/planos'

/**
 * Gestão das indicações.
 *
 * O prêmio do indicador só fica disponível depois que o indicado vira pagante.
 * O botão nem aparece antes disso — a trava é a regra do programa, não um
 * lembrete para você conferir na hora.
 */
export function PainelIndicacoes({
  contas,
  aoMudar,
}: {
  contas: ResumoConta[]
  aoMudar: () => Promise<void>
}) {
  const toast = useToast()
  const [liberando, setLiberando] = useState<string | null>(null)

  const indicacoes = useMemo(() => montarIndicacoes(contas), [contas])
  const pagantesPorConta = useMemo(() => contarIndicacoesPagantes(indicacoes), [indicacoes])

  const pendentes = indicacoes.filter((i) => i.indicadoPagou && !i.premioLiberado)

  async function liberar(indicadorId: string, indicadoId: string) {
    const indicacao = indicacoes.find(
      (i) => i.indicador.id === indicadorId && i.indicado.id === indicadoId,
    )
    if (!indicacao) return

    setLiberando(indicadoId)
    try {
      // O tamanho do prêmio segue a escada: a 5ª indicação vale mais que a 1ª.
      const total = pagantesPorConta.get(indicadorId) ?? 1
      const faixa = [...PREMIOS_INDICACAO].reverse().find((p) => total >= p.aPartirDe)
      const meses = total >= 5 ? 6 : 1

      await liberarPremioIndicacao(indicacao.indicador, indicadoId, meses)
      toast(`Prêmio liberado: ${faixa?.premio ?? '1 mês grátis'}`)
      await aoMudar()
    } catch {
      toast('Não deu para liberar o prêmio.', 'erro')
    } finally {
      setLiberando(null)
    }
  }

  if (indicacoes.length === 0) {
    return (
      <div className="card">
        <EstadoVazio
          icone={<Gift size={34} />}
          titulo="Nenhuma indicação ainda"
          descricao="Quando alguém se cadastrar usando o código de outro empreiteiro, a indicação aparece aqui."
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {pendentes.length > 0 && (
        <div className="px-4 py-3 rounded-2xl bg-alerta-soft text-alerta text-[14px] font-semibold">
          {pendentes.length}{' '}
          {pendentes.length === 1 ? 'prêmio esperando ser liberado' : 'prêmios esperando'}
        </div>
      )}

      {indicacoes.map((i) => {
        const total = pagantesPorConta.get(i.indicador.id) ?? 0
        return (
          <div key={i.indicado.id} className="card p-4">
            <div className="flex items-center gap-2.5 text-[14.5px]">
              <span className="font-bold truncate flex-1">{i.indicador.nome}</span>
              <ArrowRight size={16} className="shrink-0 text-faint" />
              <span className="font-bold truncate flex-1 text-right">{i.indicado.nome}</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              <Etiqueta
                texto={i.indicadoPagou ? 'Indicado já paga' : 'Ainda não pagou'}
                tom={i.indicadoPagou ? 'lucro' : 'neutro'}
              />
              {i.premioLiberado && <Etiqueta texto="Prêmio liberado" tom="brand" />}
              {total > 0 && (
                <Etiqueta texto={`${total}ª indicação paga`} tom="neutro" />
              )}
            </div>

            {i.indicadoPagou && !i.premioLiberado && (
              <button
                onClick={() => liberar(i.indicador.id, i.indicado.id)}
                disabled={liberando === i.indicado.id}
                className="btn w-full h-12 mt-3 bg-lucro text-white text-[14.5px]"
              >
                {liberando === i.indicado.id ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <Gift size={17} /> Liberar prêmio de {i.indicador.nome.split(' ')[0]}
                  </>
                )}
              </button>
            )}

            {!i.indicadoPagou && (
              <p className="text-[12.5px] text-faint mt-2.5 leading-relaxed">
                O prêmio libera quando o indicado virar pagante — é o que impede conta falsa
                virar mês grátis.
              </p>
            )}

            {i.premioLiberado && (
              <div className="flex items-center gap-1.5 mt-2.5 text-[13px] font-semibold text-lucro">
                <Check size={15} /> Crédito já entrou para {i.indicador.nome.split(' ')[0]}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Etiqueta({ texto, tom }: { texto: string; tom: 'lucro' | 'brand' | 'neutro' }) {
  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded-lg text-[11px] font-bold uppercase tracking-wide',
        tom === 'lucro' && 'bg-lucro-soft text-lucro',
        tom === 'brand' && 'bg-brand-soft text-brand-ink',
        tom === 'neutro' && 'bg-raised text-muted',
      )}
    >
      {texto}
    </span>
  )
}
