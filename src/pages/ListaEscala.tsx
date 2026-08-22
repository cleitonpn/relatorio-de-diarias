import { useMemo, useState } from 'react'
import { CalendarPlus, Check, ChevronDown, UserX, X } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { EstadoVazio } from '@/components/ui/Estados'
import { useToast } from '@/components/app/Toast'
import { useColaboradores } from '@/hooks/useDados'
import { useIndice } from '@/hooks/useColecao'
import { apagarDiaria, definirMultiplicador, marcarPresenca } from '@/lib/acoes'
import { cn } from '@/lib/cn'
import { dataPorExtenso, hojeISO, moeda } from '@/lib/format'
import { valorDaDiaria } from '@/lib/calc'
import { FASES, MULTIPLICADORES, type Diaria, type Feira, type Multiplicador } from '@/types'

interface Props {
  empresaId: string
  feira: Feira
  diarias: Diaria[]
  aoEscalar: () => void
}

/**
 * A lista de presença — o coração da operação do dia.
 *
 * Marcar presença aqui é o que gera o custo, o pagamento e o relatório.
 * Por isso são dois botões grandes, não um menu.
 */
export function ListaEscala({ empresaId, feira, diarias, aoEscalar }: Props) {
  const { dados: equipe } = useColaboradores(false)
  const indice = useIndice(equipe)
  const hoje = hojeISO()

  const porDia = useMemo(() => {
    const mapa = new Map<string, Diaria[]>()
    for (const d of diarias) {
      const lista = mapa.get(d.data) ?? []
      lista.push(d)
      mapa.set(d.data, lista)
    }
    return [...mapa.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([data, itens]) => ({
        data,
        itens: itens.sort((a, b) => a.colaboradorNome.localeCompare(b.colaboradorNome, 'pt-BR')),
      }))
  }, [diarias])

  const [abertos, setAbertos] = useState<Set<string>>(() => new Set([hoje]))

  if (diarias.length === 0) {
    return (
      <div className="animate-fade-up">
        <EstadoVazio
          icone={<CalendarPlus size={34} />}
          titulo="Ninguém escalado ainda"
          descricao="Escolha quem da sua equipe vai trabalhar nessa feira e em quais dias."
          acao={
            <button onClick={aoEscalar} className="btn-primary w-full">
              <CalendarPlus size={19} /> Escalar equipe
            </button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-3 animate-fade-up">
      <button onClick={aoEscalar} className="btn-primary w-full">
        <CalendarPlus size={19} /> Escalar mais gente
      </button>

      {porDia.map(({ data, itens }) => {
        const aberto = abertos.has(data)
        const presentes = itens.filter((d) => d.presenca === 'PRESENTE')
        const custoDoDia = presentes.reduce((t, d) => t + valorDaDiaria(d) + d.valorAlmoco, 0)
        const pendentes = itens.filter((d) => d.presenca === 'PREVISTO').length

        return (
          <section key={data} className="card overflow-hidden">
            <button
              onClick={() => {
                const novo = new Set(abertos)
                if (novo.has(data)) novo.delete(data)
                else novo.add(data)
                setAbertos(novo)
              }}
              className="w-full p-4 flex items-center gap-3 text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[16px]">{dataPorExtenso(data)}</span>
                  {data === hoje && (
                    <span className="px-2 py-0.5 rounded-lg bg-brand text-white text-[10.5px] font-bold uppercase tracking-wide">
                      Hoje
                    </span>
                  )}
                </div>
                <div className="text-[13px] text-muted mt-0.5">
                  {presentes.length} de {itens.length} trabalharam
                  {custoDoDia > 0 && ` · ${moeda(custoDoDia)}`}
                  {pendentes > 0 && ` · ${pendentes} sem marcar`}
                </div>
              </div>
              <ChevronDown
                size={20}
                className={cn('shrink-0 text-faint transition-transform', aberto && 'rotate-180')}
              />
            </button>

            {aberto && (
              <div className="border-t border-line divide-y divide-line">
                {itens.map((d) => (
                  <LinhaPresenca
                    key={d.id}
                    empresaId={empresaId}
                    diaria={d}
                    fotoUrl={indice[d.colaboradorId]?.fotoUrl}
                  />
                ))}
              </div>
            )}
          </section>
        )
      })}

      <p className="px-1 pt-2 text-[12.5px] text-faint leading-relaxed">
        Almoço nesta feira: {moeda(feira.almocoPorPessoaDia)} por pessoa, por dia. Ele entra
        automaticamente em quem você marcar como presente.
      </p>
    </div>
  )
}

function LinhaPresenca({
  empresaId,
  diaria,
  fotoUrl,
}: {
  empresaId: string
  diaria: Diaria
  fotoUrl?: string | null
}) {
  const toast = useToast()
  const [expandido, setExpandido] = useState(false)
  const pago = !!diaria.pagamentoId
  const fase = FASES.find((f) => f.valor === diaria.fase)

  async function definir(presenca: Diaria['presenca']) {
    try {
      await marcarPresenca(empresaId, diaria.id, presenca)
    } catch {
      toast('Não deu para salvar. Tente de novo.', 'erro')
    }
  }

  async function trocarMultiplicador(m: Multiplicador) {
    try {
      await definirMultiplicador(empresaId, diaria.id, m)
      setExpandido(false)
    } catch {
      toast('Não deu para salvar.', 'erro')
    }
  }

  async function remover() {
    try {
      await apagarDiaria(empresaId, diaria.id)
      toast('Dia removido')
    } catch {
      toast('Não deu certo.', 'erro')
    }
  }

  return (
    <div className="p-3.5">
      <div className="flex items-center gap-3">
        <Avatar nome={diaria.colaboradorNome} fotoUrl={fotoUrl} tamanho="md" />

        <button onClick={() => !pago && setExpandido((v) => !v)} className="flex-1 min-w-0 text-left">
          <div className="font-bold text-[15.5px] truncate">{diaria.colaboradorNome}</div>
          <div className="text-[13px] text-muted truncate">
            {fase?.emoji} {fase?.rotulo} · {moeda(valorDaDiaria(diaria))}
            {diaria.multiplicador !== 1 &&
              ` (${MULTIPLICADORES.find((m) => m.valor === diaria.multiplicador)?.rotulo})`}
          </div>
        </button>

        {pago ? (
          <span className="shrink-0 px-2.5 py-1.5 rounded-xl bg-lucro-soft text-lucro text-[12px] font-bold">
            Pago
          </span>
        ) : (
          <div className="shrink-0 flex gap-1.5">
            <BotaoPresenca
              ativo={diaria.presenca === 'PRESENTE'}
              tom="lucro"
              onClick={() => definir(diaria.presenca === 'PRESENTE' ? 'PREVISTO' : 'PRESENTE')}
              rotulo="Trabalhou"
            >
              <Check size={20} strokeWidth={3} />
            </BotaoPresenca>
            <BotaoPresenca
              ativo={diaria.presenca === 'FALTOU'}
              tom="custo"
              onClick={() => definir(diaria.presenca === 'FALTOU' ? 'PREVISTO' : 'FALTOU')}
              rotulo="Faltou"
            >
              <X size={20} strokeWidth={3} />
            </BotaoPresenca>
          </div>
        )}
      </div>

      {expandido && !pago && (
        <div className="mt-3 pl-[60px] space-y-3 animate-fade-up">
          <div>
            <span className="label">Quanto trabalhou</span>
            <div className="grid grid-cols-4 gap-1.5">
              {MULTIPLICADORES.map((m) => (
                <button
                  key={m.valor}
                  onClick={() => trocarMultiplicador(m.valor)}
                  className={cn(
                    'h-11 rounded-xl border-2 text-[13.5px] font-bold transition active:scale-95',
                    diaria.multiplicador === m.valor
                      ? 'border-brand bg-brand text-white'
                      : 'border-line bg-raised',
                  )}
                >
                  {m.rotulo}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={remover}
            className="flex items-center gap-1.5 text-[13.5px] font-semibold text-custo"
          >
            <UserX size={16} /> Tirar dessa data
          </button>
        </div>
      )}
    </div>
  )
}

function BotaoPresenca({
  ativo,
  tom,
  onClick,
  rotulo,
  children,
}: {
  ativo: boolean
  tom: 'lucro' | 'custo'
  onClick: () => void
  rotulo: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-label={rotulo}
      aria-pressed={ativo}
      className={cn(
        'w-12 h-12 rounded-2xl grid place-items-center border-2 transition active:scale-90',
        ativo
          ? tom === 'lucro'
            ? 'bg-lucro border-lucro text-white'
            : 'bg-custo border-custo text-white'
          : 'border-line bg-raised text-faint',
      )}
    >
      {children}
    </button>
  )
}
