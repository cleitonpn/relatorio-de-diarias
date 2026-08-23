import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import { dataCurta, diasEntre } from '@/lib/format'
import type { DataISO, PeriodoFase } from '@/types'

interface Props {
  rotulo: string
  emoji: string
  descricao: string
  periodo: PeriodoFase | null
  aoMudar: (periodo: PeriodoFase | null) => void
  /** Datas usadas quando ele liga a fase pela primeira vez. */
  sugestao: PeriodoFase
  erro?: string | null
}

/**
 * Uma fase do trabalho, com liga/desliga e suas datas.
 *
 * Nem toda feira tem as três: limpeza costuma não ter montagem, marcenaria
 * costuma não ficar durante o evento. Perguntar isso aqui é o que permite,
 * na hora de escalar, mostrar só os dias que fazem sentido.
 */
export function BlocoFase({ rotulo, emoji, descricao, periodo, aoMudar, sugestao, erro }: Props) {
  const ligada = !!periodo
  const dias = periodo ? diasEntre(periodo.inicio, periodo.fim).length : 0

  return (
    <div
      className={cn(
        'rounded-3xl border-2 transition',
        ligada ? 'border-brand bg-brand-soft/40' : 'border-line bg-raised',
      )}
    >
      <button
        type="button"
        onClick={() => aoMudar(ligada ? null : sugestao)}
        className="w-full p-4 flex items-center gap-3 text-left"
      >
        <span className="shrink-0 text-[22px]">{emoji}</span>
        <span className="flex-1 min-w-0">
          <span className="block font-bold text-[16px]">{rotulo}</span>
          <span className="block text-[13px] text-muted">
            {ligada ? `${dias} ${dias === 1 ? 'dia' : 'dias'}` : descricao}
          </span>
        </span>
        <span
          className={cn(
            'shrink-0 w-7 h-7 rounded-full grid place-items-center border-2 transition',
            ligada ? 'bg-brand border-brand text-white' : 'border-line',
          )}
        >
          {ligada && <Check size={16} strokeWidth={3} />}
        </span>
      </button>

      {periodo && (
        <div className="px-4 pb-4 grid grid-cols-2 gap-2.5 animate-fade-up">
          <CampoData
            rotulo="Começa"
            valor={periodo.inicio}
            aoMudar={(inicio) =>
              // Fim nunca pode ficar antes do começo: empurra junto.
              aoMudar({ inicio, fim: periodo.fim < inicio ? inicio : periodo.fim })
            }
          />
          <CampoData
            rotulo="Termina"
            valor={periodo.fim}
            minimo={periodo.inicio}
            aoMudar={(fim) => aoMudar({ ...periodo, fim })}
          />
          {erro && (
            <span className="col-span-2 text-[13px] font-medium text-custo">{erro}</span>
          )}
          {dias > 0 && !erro && (
            <span className="col-span-2 text-[12.5px] text-muted">
              {dataCurta(periodo.inicio)}
              {periodo.inicio !== periodo.fim && ` até ${dataCurta(periodo.fim)}`}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function CampoData({
  rotulo,
  valor,
  minimo,
  aoMudar,
}: {
  rotulo: string
  valor: DataISO
  minimo?: DataISO
  aoMudar: (v: DataISO) => void
}) {
  return (
    <label className="block">
      <span className="block text-[12px] font-semibold text-muted mb-1.5">{rotulo}</span>
      <input
        type="date"
        value={valor}
        min={minimo}
        onChange={(e) => e.target.value && aoMudar(e.target.value)}
        className="w-full h-12 px-3 rounded-xl bg-surface border border-line text-ink text-[15px] outline-none focus:border-brand focus:ring-4 focus:ring-brand/15"
      />
    </label>
  )
}
