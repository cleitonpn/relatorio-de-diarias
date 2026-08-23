import { Plus, Trash2 } from 'lucide-react'
import { CampoDinheiro, Selecao } from '@/components/ui/Campo'
import { cn } from '@/lib/cn'
import { dataCurta, moeda, somarDias } from '@/lib/format'
import {
  MODELOS_RECEBIMENTO,
  type Centavos,
  type DataISO,
  type ModeloRecebimento,
  type ParcelaPlanejada,
} from '@/types'

interface Props {
  modelo: ModeloRecebimento
  aoMudarModelo: (m: ModeloRecebimento) => void
  parcelas: ParcelaPlanejada[]
  aoMudarParcelas: (p: ParcelaPlanejada[]) => void
  /** Total do contrato, para calcular metade e mostrar o que falta. */
  total: Centavos
  /** Âncoras do calendário da feira. */
  inicioMontagem: DataISO | null
  fimFeira: DataISO
  erro?: string | null
}

/**
 * Quando a CONTRATANTE paga ele.
 *
 * O caso comum é 50% antes da montagem e 50% depois — mas não é universal e,
 * pior, não é certeza: o financeiro liga e renegocia. Por isso as datas são
 * campos comuns, editáveis a qualquer momento, e não uma regra fixa amarrada
 * ao calendário.
 */
export function BlocoRecebimentos({
  modelo,
  aoMudarModelo,
  parcelas,
  aoMudarParcelas,
  total,
  inicioMontagem,
  fimFeira,
  erro,
}: Props) {
  const somaParcelas = parcelas.reduce((t, p) => t + p.valor, 0)
  const diferenca = total - somaParcelas

  function aplicarModelo(novo: ModeloRecebimento) {
    aoMudarModelo(novo)
    if (novo === 'TUDO_FIM') {
      aoMudarParcelas([
        { descricao: 'Pagamento', valor: total, data: somarDias(fimFeira, 15) },
      ])
    } else if (novo === 'METADE_METADE') {
      const metade = Math.round(total / 2)
      aoMudarParcelas([
        {
          descricao: 'Entrada (50%)',
          valor: metade,
          data: inicioMontagem ? somarDias(inicioMontagem, -7) : fimFeira,
        },
        { descricao: 'Saldo (50%)', valor: total - metade, data: somarDias(fimFeira, 15) },
      ])
    }
  }

  function alterar(indice: number, campo: keyof ParcelaPlanejada, valor: string | number) {
    aoMudarParcelas(
      parcelas.map((p, i) => (i === indice ? { ...p, [campo]: valor } : p)),
    )
  }

  return (
    <div>
      <span className="label">Quando a contratante te paga</span>
      <p className="text-[13px] text-muted mb-3 leading-relaxed -mt-1">
        As datas são previsão. Se o financeiro ligar e mudar, você ajusta depois.
      </p>

      <Selecao<ModeloRecebimento>
        opcoes={MODELOS_RECEBIMENTO.map((m) => ({
          valor: m.valor,
          rotulo: m.rotulo,
          descricao: m.descricao,
          emoji: m.emoji,
        }))}
        valor={modelo}
        onChange={aplicarModelo}
        colunas={3}
      />

      {parcelas.length > 0 && (
        <div className="mt-4 space-y-2.5">
          {parcelas.map((p, i) => (
            <div key={i} className="p-4 rounded-2xl bg-raised border border-line space-y-3">
              <div className="flex items-center gap-2">
                <input
                  value={p.descricao}
                  onChange={(e) => alterar(i, 'descricao', e.target.value)}
                  placeholder="Ex.: Entrada"
                  className="flex-1 min-w-0 h-10 px-3 rounded-xl bg-surface border border-line text-[14.5px] font-semibold outline-none focus:border-brand"
                />
                {parcelas.length > 1 && (
                  <button
                    onClick={() => aoMudarParcelas(parcelas.filter((_, x) => x !== i))}
                    className="shrink-0 w-10 h-10 grid place-items-center rounded-xl text-custo hover:bg-custo-soft transition"
                    aria-label="Apagar parcela"
                  >
                    <Trash2 size={17} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <CampoDinheiro
                  valor={p.valor}
                  onChange={(v) => alterar(i, 'valor', v)}
                />
                <label className="block">
                  <input
                    type="date"
                    value={p.data}
                    onChange={(e) => e.target.value && alterar(i, 'data', e.target.value)}
                    className="w-full h-14 px-3 rounded-2xl bg-surface border border-line text-ink text-[15px] outline-none focus:border-brand focus:ring-4 focus:ring-brand/15"
                  />
                </label>
              </div>

              <div className="text-[12.5px] text-muted">
                {moeda(p.valor)} previsto para {dataCurta(p.data)}
              </div>
            </div>
          ))}

          <button
            onClick={() => {
              aoMudarModelo('PERSONALIZADO')
              aoMudarParcelas([
                ...parcelas,
                {
                  descricao: `Parcela ${parcelas.length + 1}`,
                  valor: Math.max(0, diferenca),
                  data: somarDias(fimFeira, 30),
                },
              ])
            }}
            className="btn-ghost w-full h-12 text-[14.5px]"
          >
            <Plus size={17} /> Mais uma parcela
          </button>

          {/* A soma das parcelas tem que fechar com o contrato */}
          {total > 0 && diferenca !== 0 && (
            <div
              className={cn(
                'px-4 py-3 rounded-2xl text-[13.5px] font-semibold',
                diferenca > 0 ? 'bg-alerta-soft text-alerta' : 'bg-custo-soft text-custo',
              )}
            >
              {diferenca > 0
                ? `Faltam ${moeda(diferenca)} para fechar o contrato de ${moeda(total)}.`
                : `As parcelas passam ${moeda(-diferenca)} do contrato de ${moeda(total)}.`}
            </div>
          )}
        </div>
      )}

      {erro && <span className="block mt-2 text-[13px] font-medium text-custo">{erro}</span>}
    </div>
  )
}
