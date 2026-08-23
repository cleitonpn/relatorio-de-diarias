import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, CalendarClock } from 'lucide-react'
import {
  useFeiras,
  usePagamentos,
  useRecebimentos,
  useTodasDiarias,
  useTodosCustos,
} from '@/hooks/useDados'
import { EstadoVazio } from '@/components/ui/Estados'
import { cn } from '@/lib/cn'
import { montarAgenda, resumirCaixa, type Movimento } from '@/lib/calc'
import { dataPorExtenso, distanciaDeHoje, hojeISO, moeda } from '@/lib/format'

/**
 * A agenda do dinheiro.
 *
 * "Tenho R$ 8.000 a pagar" é uma informação incompleta. "Tenho R$ 8.000 a
 * pagar na sexta e só recebo na terça" é a que evita o aperto — e era
 * exatamente o que faltava.
 */
export function Agenda() {
  const hoje = hojeISO()
  const { dados: recebimentos } = useRecebimentos()
  const { dados: pagamentos } = usePagamentos()
  const { dados: diarias } = useTodasDiarias()
  const { dados: custos } = useTodosCustos()
  const { dados: feiras } = useFeiras()

  const movimentos = useMemo(
    () => montarAgenda({ recebimentos, pagamentos, diariasAbertas: diarias, custos, feiras, hoje }),
    [recebimentos, pagamentos, diarias, custos, feiras, hoje],
  )

  const resumo = useMemo(() => resumirCaixa(movimentos), [movimentos])

  const { atrasados, futuros, passados } = useMemo(
    () => ({
      atrasados: movimentos.filter((m) => m.atrasado),
      futuros: movimentos.filter((m) => !m.realizado && !m.atrasado),
      passados: movimentos.filter((m) => m.realizado).reverse(),
    }),
    [movimentos],
  )

  if (movimentos.length === 0) {
    return (
      <EstadoVazio
        icone={<CalendarClock size={34} />}
        titulo="Nada marcado ainda"
        descricao="Quando você cadastrar uma feira com as datas de pagamento da contratante, tudo aparece aqui em ordem."
      />
    )
  }

  return (
    <div className="space-y-4 animate-fade-up">
      {/* Onde o caixa está e onde vai parar */}
      <div
        className="p-5 rounded-3xl text-white shadow-lift"
        style={{
          backgroundImage:
            resumo.saldo >= 0
              ? 'linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)'
              : 'linear-gradient(135deg, #E11D48 0%, #9F1239 100%)',
        }}
      >
        <div className="text-[13px] font-semibold uppercase tracking-wider text-white/75">
          Passou pelo seu caixa
        </div>
        <div className="tnum text-[clamp(28px,9vw,38px)] font-extrabold leading-none mt-1 whitespace-nowrap">
          {moeda(resumo.saldo)}
        </div>
        <div className="text-[13px] text-white/75 mt-1">
          {moeda(resumo.entrou)} entrou · {moeda(resumo.saiu)} saiu
        </div>

        <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-3">
          <div>
            <div className="text-[12px] text-white/65 uppercase tracking-wide">A receber</div>
            <div className="tnum text-[17px] font-bold">{moeda(resumo.aReceber)}</div>
          </div>
          <div className="text-right">
            <div className="text-[12px] text-white/65 uppercase tracking-wide">A pagar</div>
            <div className="tnum text-[17px] font-bold">{moeda(resumo.aPagar)}</div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between">
          <span className="text-[13.5px] text-white/85">Se tudo acontecer, sobra</span>
          <span className="tnum text-[19px] font-extrabold">{moeda(resumo.projecao)}</span>
        </div>
      </div>

      {resumo.atrasadoReceber > 0 && (
        <div className="p-4 rounded-3xl bg-custo-soft border border-custo/20 flex items-start gap-2.5">
          <AlertTriangle size={19} className="shrink-0 text-custo mt-0.5" />
          <div className="text-[14px] leading-relaxed">
            <strong className="text-custo">{moeda(resumo.atrasadoReceber)} atrasado.</strong>{' '}
            <span className="text-muted">
              Tem dinheiro que já era pra ter caído na sua conta. Vale uma cobrança.
            </span>
          </div>
        </div>
      )}

      <Grupo titulo="Passou da data" itens={atrasados} destaque />
      <Grupo titulo="Vem por aí" itens={futuros} />
      <Grupo titulo="Já aconteceu" itens={passados.slice(0, 20)} />
    </div>
  )
}

function Grupo({
  titulo,
  itens,
  destaque,
}: {
  titulo: string
  itens: Movimento[]
  destaque?: boolean
}) {
  if (itens.length === 0) return null

  // Agrupa por dia, para virar calendário em vez de lista solta.
  const porDia = new Map<string, Movimento[]>()
  for (const m of itens) {
    const lista = porDia.get(m.data) ?? []
    lista.push(m)
    porDia.set(m.data, lista)
  }

  return (
    <section>
      <h2 className={cn('px-1 pb-2 text-[13px] font-bold uppercase tracking-wide', destaque ? 'text-custo' : 'text-faint')}>
        {titulo}
      </h2>
      <div className="space-y-3">
        {[...porDia.entries()].map(([data, doDia]) => {
          const saldoDoDia = doDia.reduce(
            (t, m) => t + (m.tipo === 'ENTRADA' ? m.valor : -m.valor),
            0,
          )
          return (
            <div key={data} className="card overflow-hidden">
              <div className="px-4 py-2.5 bg-raised/60 border-b border-line flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold text-[14.5px] truncate">{dataPorExtenso(data)}</div>
                  <div className="text-[12px] text-faint">{distanciaDeHoje(data)}</div>
                </div>
                <span
                  className={cn(
                    'tnum text-[15px] font-extrabold shrink-0',
                    saldoDoDia >= 0 ? 'text-lucro' : 'text-custo',
                  )}
                >
                  {saldoDoDia >= 0 ? '+' : ''}
                  {moeda(saldoDoDia)}
                </span>
              </div>
              <div className="divide-y divide-line">
                {doDia.map((m) => (
                  <Linha key={m.id} movimento={m} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Linha({ movimento }: { movimento: Movimento }) {
  const entrada = movimento.tipo === 'ENTRADA'
  const conteudo = (
    <div className="p-3.5 flex items-center gap-3">
      <div
        className={cn(
          'shrink-0 w-10 h-10 rounded-2xl grid place-items-center',
          entrada ? 'bg-lucro-soft text-lucro' : 'bg-custo-soft text-custo',
          movimento.realizado && 'opacity-60',
        )}
      >
        {entrada ? <ArrowDownLeft size={19} /> : <ArrowUpRight size={19} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[15px] truncate">{movimento.titulo}</div>
        <div className="text-[12.5px] text-muted truncate">{movimento.detalhe}</div>
      </div>
      <div className="text-right shrink-0">
        <div
          className={cn(
            'tnum text-[15.5px] font-bold',
            entrada ? 'text-lucro' : 'text-custo',
            movimento.realizado && 'opacity-70',
          )}
        >
          {entrada ? '+' : '−'}
          {moeda(movimento.valor)}
        </div>
        <div className="text-[11px] font-bold uppercase tracking-wide text-faint">
          {movimento.realizado ? (entrada ? 'recebido' : 'pago') : 'previsto'}
        </div>
      </div>
    </div>
  )

  return movimento.feiraId ? (
    <Link to={`/feiras/${movimento.feiraId}`} className="block active:bg-raised transition">
      {conteudo}
    </Link>
  ) : (
    conteudo
  )
}
