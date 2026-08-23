import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ChevronRight,
  DoorOpen,
  Loader2,
  MonitorSmartphone,
  PhoneCall,
  RefreshCw,
} from 'lucide-react'
import { CarregandoLista, EstadoVazio } from '@/components/ui/Estados'
import { Sheet } from '@/components/ui/Sheet'
import { useToast } from '@/components/app/Toast'
import { cn } from '@/lib/cn'
import { dataCurta, distanciaDeHoje } from '@/lib/format'
import {
  ROTULO_FLUXO,
  carregarLotes,
  carregarUso,
  contasTravadas,
  resumirUso,
  type LinhaDia,
  type LoteEventos,
  type ResumoUso,
} from '@/lib/uso'
import type { ResumoConta } from '@/lib/admin'
import type { Fluxo } from '@/lib/telemetria'

/**
 * O que o app aprendeu sobre si mesmo.
 *
 * Esta tela não tem um único número em reais — de propósito. A pergunta aqui
 * não é quanto o negócio rende; é se o empreiteiro consegue usar o produto
 * sozinho. Quem responde isso é o funil e a coluna de abandono.
 */
export function PainelUso({ contas }: { contas: ResumoConta[] }) {
  const toast = useToast()
  const [linhas, setLinhas] = useState<LinhaDia[]>([])
  const [carregando, setCarregando] = useState(true)
  const [dias, setDias] = useState(30)
  const [comInternas, setComInternas] = useState(false)
  const [investigando, setInvestigando] = useState<string | null>(null)

  const carregar = useCallback(
    async (quantos: number) => {
      setCarregando(true)
      try {
        setLinhas(await carregarUso(quantos))
      } catch {
        toast('Não deu para carregar o uso.', 'erro')
      } finally {
        setCarregando(false)
      }
    },
    [toast],
  )

  useEffect(() => {
    void carregar(dias)
  }, [carregar, dias])

  const resumo = useMemo(() => resumirUso(linhas, comInternas), [linhas, comInternas])
  const travadas = useMemo(() => contasTravadas(linhas), [linhas])
  const nomeDaConta = useCallback(
    (empresaId: string) =>
      contas.find((c) => c.empresa.id === empresaId)?.empresa.nome ?? 'Conta removida',
    [contas],
  )

  if (carregando) return <CarregandoLista linhas={5} />

  if (resumo.contas === 0) {
    return (
      <EstadoVazio
        icone={<Activity size={34} />}
        titulo="Nenhum uso registrado ainda"
        descricao={
          comInternas
            ? 'O app começa a medir assim que alguém entrar.'
            : 'Só há uso das contas internas neste período. Marque "incluir contas internas" para ver.'
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1 p-1 rounded-2xl bg-raised">
          {[7, 30, 90].map((n) => (
            <button
              key={n}
              onClick={() => setDias(n)}
              className={cn(
                'flex-1 h-9 rounded-xl text-[13.5px] font-bold transition',
                dias === n ? 'bg-canvas text-ink shadow-sm' : 'text-muted',
              )}
            >
              {n} dias
            </button>
          ))}
        </div>
        <button
          onClick={() => carregar(dias)}
          className="shrink-0 w-11 h-11 grid place-items-center rounded-full text-muted hover:bg-raised transition"
          aria-label="Atualizar"
        >
          <RefreshCw size={19} />
        </button>
      </div>

      <label className="flex items-center gap-2.5 px-1 text-[13.5px] text-muted">
        <input
          type="checkbox"
          checked={comInternas}
          onChange={(e) => setComInternas(e.target.checked)}
          className="w-4 h-4 accent-current text-brand"
        />
        Incluir contas internas (você testando)
      </label>

      <Cabecalho resumo={resumo} dias={dias} />
      <Funil resumo={resumo} />
      <Fluxos resumo={resumo} />

      {travadas.length > 0 && (
        <section className="card p-5">
          <Titulo
            icone={<PhoneCall size={18} />}
            texto="Quem ligar"
            explica="Contas que usaram o app e nunca chegaram a fechar um pagamento. Não desistiram — travaram em alguma coisa."
          />
          <div className="mt-3 space-y-1.5">
            {travadas.slice(0, 12).map((t) => (
              <button
                key={t.empresaId}
                onClick={() => setInvestigando(t.empresaId)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-raised text-left active:scale-[.99] transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[14.5px] truncate">
                    {nomeDaConta(t.empresaId)}
                  </div>
                  <div className="text-[12.5px] text-muted">
                    parou em “{t.chegouEm}” · {distanciaDeHoje(t.ultimoDia)}
                  </div>
                </div>
                <ChevronRight size={18} className="shrink-0 text-faint" />
              </button>
            ))}
          </div>
        </section>
      )}

      <Listagem
        icone={<MonitorSmartphone size={18} />}
        titulo="Telas mais abertas"
        explica="Onde ele passa o tempo. Tela que ninguém abre é tela que não resolve problema dele."
        itens={resumo.telas}
        vazio="Nenhuma navegação registrada."
      />

      <Listagem
        icone={<AlertTriangle size={18} />}
        titulo="Erros que ele viu"
        explica="Código técnico e a tela onde apareceu. Nunca a mensagem — mensagem é texto livre e texto livre carrega dado de gente."
        itens={resumo.erros}
        vazio="Nenhum erro registrado. 🎉"
        tom="custo"
      />

      {investigando && (
        <Investigacao
          empresaId={investigando}
          nome={nomeDaConta(investigando)}
          aoFechar={() => setInvestigando(null)}
        />
      )}
    </div>
  )
}

/* ───────────────────────────────── Blocos ───────────────────────────────── */

function Cabecalho({ resumo, dias }: { resumo: ResumoUso; dias: number }) {
  const pico = Math.max(1, ...resumo.porDia.map((d) => d.contas))
  return (
    <div className="card p-5">
      <div className="flex items-end gap-6">
        <div>
          <div className="text-[11px] font-bold text-faint uppercase tracking-wide">
            Na semana
          </div>
          <div className="tnum text-[34px] font-extrabold leading-none">
            {resumo.contasNaSemana}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-bold text-faint uppercase tracking-wide">
            Em {dias} dias
          </div>
          <div className="tnum text-[22px] font-extrabold leading-none text-muted">
            {resumo.contas}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-bold text-faint uppercase tracking-wide">Ações</div>
          <div className="tnum text-[22px] font-extrabold leading-none text-muted">
            {resumo.eventos.toLocaleString('pt-BR')}
          </div>
        </div>
      </div>

      {/* Uma barra por dia — dá para ver de longe se o uso cresce ou seca. */}
      <div className="mt-4 flex items-end gap-[3px] h-14">
        {resumo.porDia.map((d) => (
          <div
            key={d.dia}
            title={`${dataCurta(d.dia)} · ${d.contas} ${d.contas === 1 ? 'conta' : 'contas'}`}
            className="flex-1 min-w-[3px] rounded-t bg-brand/70"
            style={{ height: `${Math.max(6, (d.contas / pico) * 100)}%` }}
          />
        ))}
      </div>
    </div>
  )
}

function Funil({ resumo }: { resumo: ResumoUso }) {
  return (
    <section className="card p-5">
      <Titulo
        icone={<DoorOpen size={18} />}
        texto="Do cadastro até pagar alguém"
        explica="O degrau em que a conta para é o degrau que precisa ser mais fácil."
      />
      <div className="mt-4 space-y-2.5">
        {resumo.funil.map((d, i) => {
          const anterior = i > 0 ? resumo.funil[i - 1].contas : d.contas
          const perdeu = anterior - d.contas
          return (
            <div key={d.rotulo}>
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <span className="text-[14px] font-semibold">{d.rotulo}</span>
                <span className="tnum text-[13px] text-muted">
                  {d.contas} · {Math.round(d.fracao * 100)}%
                </span>
              </div>
              <div className="h-3 rounded-full bg-raised overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand transition-all"
                  style={{ width: `${Math.max(2, d.fracao * 100)}%` }}
                />
              </div>
              {i > 0 && perdeu > 0 && (
                <div className="text-[12px] text-custo mt-1">
                  −{perdeu} {perdeu === 1 ? 'conta parou aqui' : 'contas pararam aqui'}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Fluxos({ resumo }: { resumo: ResumoUso }) {
  const usados = resumo.fluxos.filter((f) => f.iniciados > 0)
  if (usados.length === 0) return null

  return (
    <section className="card p-5">
      <Titulo
        icone={<Activity size={18} />}
        texto="O que ele abre e não termina"
        explica="Abriu o formulário, olhou e fechou sem salvar. Ninguém liga para reclamar disso — só some."
      />
      <div className="mt-3 space-y-2">
        {usados.map((f) => {
          const taxa = f.conclusao ?? 1
          return (
            <div key={f.fluxo} className="p-3 rounded-2xl bg-raised">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[14.5px] font-semibold">
                  {ROTULO_FLUXO[f.fluxo as Fluxo]}
                </span>
                <span
                  className={cn(
                    'tnum text-[13.5px] font-bold',
                    taxa >= 0.8 ? 'text-lucro' : taxa >= 0.5 ? 'text-alerta' : 'text-custo',
                  )}
                >
                  {Math.round(taxa * 100)}% termina
                </span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-canvas overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full',
                    taxa >= 0.8 ? 'bg-lucro' : taxa >= 0.5 ? 'bg-alerta' : 'bg-custo',
                  )}
                  style={{ width: `${Math.max(2, taxa * 100)}%` }}
                />
              </div>
              {/* A porcentagem sai destes dois números, e não das aberturas: um
                  formulário aberto às 23h58 e fechado às 00h01 cai no dia
                  seguinte, então "aberturas" e "fechados" não batem sempre. */}
              <div className="text-[12.5px] text-muted mt-1.5">
                {f.concluidos} {f.concluidos === 1 ? 'terminou' : 'terminaram'} ·{' '}
                <span className={cn(f.abandonados > 0 && 'text-custo font-semibold')}>
                  {f.abandonados} {f.abandonados === 1 ? 'desistiu' : 'desistiram'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Listagem({
  icone,
  titulo,
  explica,
  itens,
  vazio,
  tom,
}: {
  icone: React.ReactNode
  titulo: string
  explica: string
  itens: { chave: string; vezes: number; contas: number }[]
  vazio: string
  tom?: 'custo'
}) {
  const pico = Math.max(1, ...itens.map((i) => i.vezes))
  return (
    <section className="card p-5">
      <Titulo icone={icone} texto={titulo} explica={explica} />
      {itens.length === 0 ? (
        <p className="mt-3 text-[13.5px] text-muted">{vazio}</p>
      ) : (
        <div className="mt-3 space-y-1.5">
          {itens.slice(0, 12).map((i) => (
            <div key={i.chave} className="flex items-center gap-3">
              <span className="w-40 shrink-0 text-[13.5px] font-medium truncate">{i.chave}</span>
              <div className="flex-1 h-2.5 rounded-full bg-raised overflow-hidden">
                <div
                  className={cn('h-full rounded-full', tom === 'custo' ? 'bg-custo' : 'bg-brand')}
                  style={{ width: `${Math.max(3, (i.vezes / pico) * 100)}%` }}
                />
              </div>
              <span className="tnum w-24 shrink-0 text-right text-[12.5px] text-muted whitespace-nowrap">
                {i.vezes} · {i.contas} {i.contas === 1 ? 'conta' : 'contas'}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function Titulo({
  icone,
  texto,
  explica,
}: {
  icone: React.ReactNode
  texto: string
  explica: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0 w-9 h-9 rounded-xl bg-brand-soft text-brand-ink grid place-items-center">
        {icone}
      </div>
      <div className="min-w-0">
        <div className="font-bold text-[16px]">{texto}</div>
        <div className="text-[12.5px] text-muted leading-snug">{explica}</div>
      </div>
    </div>
  )
}

/* ────────────────────────────── Investigação ────────────────────────────── */

/**
 * A sequência crua do que a conta fez, sessão por sessão.
 *
 * É aqui que "ela parou em cadastrar a feira" vira "ela abriu escalar equipe
 * três vezes seguidas e saiu nas três".
 */
function Investigacao({
  empresaId,
  nome,
  aoFechar,
}: {
  empresaId: string
  nome: string
  aoFechar: () => void
}) {
  const [lotes, setLotes] = useState<LoteEventos[] | null>(null)

  useEffect(() => {
    let vivo = true
    carregarLotes(empresaId)
      .then((l) => vivo && setLotes(l))
      .catch(() => vivo && setLotes([]))
    return () => {
      vivo = false
    }
  }, [empresaId])

  const sessoes = useMemo(() => {
    if (!lotes) return []
    const mapa = new Map<string, { dia: string; eventos: LoteEventos['eventos'] }>()
    for (const lote of lotes) {
      const chave = `${lote.dia}|${lote.sessao}`
      const acc = mapa.get(chave) ?? { dia: lote.dia, eventos: [] }
      acc.eventos.push(...lote.eventos)
      mapa.set(chave, acc)
    }
    return [...mapa.values()]
      .map((s) => ({ ...s, eventos: s.eventos.sort((a, b) => a.em - b.em) }))
      .sort((a, b) => (b.eventos[0]?.em ?? 0) - (a.eventos[0]?.em ?? 0))
  }, [lotes])

  return (
    <Sheet aberto aoFechar={aoFechar} titulo={nome} subtitulo="Últimas sessões" alturaTotal>
      {!lotes ? (
        <div className="py-10 grid place-items-center text-muted">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : sessoes.length === 0 ? (
        <p className="text-[14px] text-muted">
          Sem detalhe guardado. O registro miúdo some depois de 90 dias — o resumo do dia fica.
        </p>
      ) : (
        <div className="space-y-4">
          {sessoes.slice(0, 8).map((s, i) => (
            <div key={i}>
              <div className="text-[12px] font-bold text-faint uppercase tracking-wide mb-1.5">
                {dataCurta(s.dia)} · {s.eventos.length} ações
              </div>
              <div className="space-y-1">
                {s.eventos.map((e, j) => (
                  <div
                    key={j}
                    className="flex flex-wrap items-baseline gap-x-2 px-3 py-1.5 rounded-xl bg-raised text-[13px]"
                  >
                    <span className="tnum shrink-0 text-faint">
                      {new Date(e.em).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span
                      className={cn(
                        'font-semibold',
                        String(e.nome).startsWith('fluxo_abandonado') && 'text-custo',
                        e.nome === 'erro' && 'text-custo',
                      )}
                    >
                      {String(e.nome)}
                    </span>
                    <span className="text-muted break-all">{detalhe(e)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  )
}

/** Os campos do evento, menos o carimbo de hora. */
function detalhe(evento: Record<string, unknown>): string {
  return Object.entries(evento)
    .filter(([chave]) => chave !== 'nome' && chave !== 'em')
    .map(([chave, valor]) => `${chave}=${String(valor)}`)
    .join(' ')
}
