import { useMemo, useState } from 'react'
import { orderBy } from 'firebase/firestore'
import { HandCoins, Wallet } from 'lucide-react'
import { Agenda } from './Agenda'
import { AReceber } from './AReceber'
import { useAuth } from '@/contexts/AuthContext'
import { useColaboradores, useFeiras, usePagamentos, useVales } from '@/hooks/useDados'
import { useColecao, useIndice } from '@/hooks/useColecao'
import { colDiarias } from '@/lib/db'
import { BarraTopo, EspacoBarra } from '@/components/app/Navegacao'
import { CarregandoLista, EstadoVazio } from '@/components/ui/Estados'
import { Avatar } from '@/components/ui/Avatar'
import { useToast } from '@/components/app/Toast'
import { cn } from '@/lib/cn'
import { montarAcerto } from '@/lib/calc'
import { confirmarPagamento, fecharPagamento } from '@/lib/acoes'
import { hojeISO, moeda } from '@/lib/format'
import { SheetPix } from './SheetPix'
import { PainelVales } from './PainelVales'
import type { Diaria } from '@/types'

type Aba = 'agenda' | 'receber' | 'pagar' | 'vales'

export function Pagamentos() {
  const { perfil, empresa } = useAuth()
  const [aba, setAba] = useState<Aba>('agenda')
  const { dados: valesPendentes } = useVales('SOLICITADO')

  const ABAS: { id: Aba; rotulo: string; aviso?: number }[] = [
    { id: 'agenda', rotulo: 'Agenda' },
    { id: 'receber', rotulo: 'Receber' },
    { id: 'pagar', rotulo: 'Pagar' },
    { id: 'vales', rotulo: 'Vales', aviso: valesPendentes.length },
  ]

  if (!perfil || !empresa) return <CarregandoLista />

  return (
    <>
      <BarraTopo titulo="Caixa" subtitulo="O que entra e o que sai" />

      <div className="sticky top-16 z-20 bg-canvas/85 backdrop-blur-xl border-b border-line/70">
        <div className="max-w-2xl lg:max-w-3xl mx-auto px-4 flex gap-1">
          {ABAS.map((a) => (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              className={cn(
                'relative flex-1 h-12 text-[14.5px] font-semibold transition',
                aba === a.id ? 'text-brand' : 'text-muted',
              )}
            >
              {a.rotulo}
              {!!a.aviso && a.aviso > 0 && (
                <span className="ml-1.5 inline-grid place-items-center min-w-[18px] h-[18px] px-1 rounded-full bg-custo text-white text-[11px] font-bold align-middle">
                  {a.aviso}
                </span>
              )}
              {aba === a.id && (
                <span className="absolute bottom-0 inset-x-2 h-[3px] rounded-t-full bg-brand" />
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-2xl lg:max-w-3xl mx-auto px-4 pt-4">
        {aba === 'agenda' && <Agenda />}
        {aba === 'receber' && <AReceber />}
        {aba === 'pagar' && <AbaAPagar />}
        {aba === 'vales' && <PainelVales empresaId={perfil.empresaId} />}
        <EspacoBarra />
      </main>
    </>
  )
}

/* --------------------------------- A pagar --------------------------------- */

function AbaAPagar() {
  const { perfil, empresa } = useAuth()
  const empresaId = perfil!.empresaId
  const toast = useToast()

  const { dados: diarias, carregando } = useColecao<Diaria>(
    colDiarias(empresaId),
    [orderBy('data')],
    [empresaId],
  )
  const { dados: equipe } = useColaboradores(false)
  const { dados: feiras } = useFeiras()
  const { dados: valesAprovados } = useVales('APROVADO')
  const indiceEquipe = useIndice(equipe)
  const indiceFeiras = useIndice(feiras)

  const [pagando, setPagando] = useState<string | null>(null)

  const valesPorPessoa = useMemo(() => {
    const mapa: Record<string, number> = {}
    for (const v of valesAprovados) {
      if (v.pagamentoId) continue
      mapa[v.colaboradorId] = (mapa[v.colaboradorId] ?? 0) + v.valor
    }
    return mapa
  }, [valesAprovados])

  const acertos = useMemo(
    () => montarAcerto(diarias, valesPorPessoa),
    [diarias, valesPorPessoa],
  )

  const totalAPagar = acertos.reduce((t, a) => t + a.valorLiquido, 0)

  async function registrarPagamento(colaboradorId: string) {
    const acerto = acertos.find((a) => a.colaboradorId === colaboradorId)
    if (!acerto) return

    const feiraId = acerto.diarias[0]?.feiraId ?? null
    const valesDoColaborador = valesAprovados
      .filter((v) => v.colaboradorId === colaboradorId && !v.pagamentoId)
      .map((v) => v.id)

    const pagamentoId = await fecharPagamento(empresaId, {
      colaboradorId,
      colaboradorNome: acerto.colaboradorNome,
      feiraId,
      feiraNome: feiraId ? (indiceFeiras[feiraId]?.nome ?? null) : null,
      diariaIds: acerto.diarias.map((d) => d.id),
      valeIds: valesDoColaborador,
      valorBruto: acerto.valorBruto,
      valorVales: acerto.valorVales,
      valorLiquido: acerto.valorLiquido,
      status: 'PENDENTE',
      dataPrevista: hojeISO(),
      dataPagamento: null,
      pixPayload: null,
      comprovanteUrl: null,
    })
    await confirmarPagamento(empresaId, pagamentoId, hojeISO())
  }

  if (carregando) return <CarregandoLista linhas={3} />

  if (acertos.length === 0) {
    return (
      <EstadoVazio
        icone={<Wallet size={34} />}
        titulo="Nada a pagar agora"
        descricao="Quando você marcar presença em uma feira, o valor de cada pessoa aparece aqui."
      />
    )
  }

  const emPagamento = pagando ? acertos.find((a) => a.colaboradorId === pagando) : null
  const colaboradorEmPagamento = pagando ? indiceEquipe[pagando] : null

  return (
    <div className="space-y-3 animate-fade-up">
      <div
        className="p-5 rounded-3xl text-white shadow-lift"
        style={{ backgroundImage: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}
      >
        <div className="text-[13px] font-semibold uppercase tracking-wider text-white/75">
          Total a pagar
        </div>
        <div className="tnum text-[36px] font-extrabold leading-none mt-1">
          {moeda(totalAPagar)}
        </div>
        <div className="text-[13.5px] text-white/80 mt-1.5">
          {acertos.length} {acertos.length === 1 ? 'pessoa' : 'pessoas'} esperando
        </div>
      </div>

      {acertos.map((a) => {
        const pessoa = indiceEquipe[a.colaboradorId]
        return (
          <div key={a.colaboradorId} className="card p-4">
            <div className="flex items-center gap-3.5">
              <Avatar nome={a.colaboradorNome} fotoUrl={pessoa?.fotoUrl} tamanho="md" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[16px] truncate">{a.colaboradorNome}</div>
                <div className="text-[13px] text-muted">
                  {a.quantidadeDiarias} {a.quantidadeDiarias === 1 ? 'diária' : 'diárias'}
                  {a.valorVales > 0 && ` · vale ${moeda(a.valorVales)}`}
                </div>
              </div>
              <div className="text-right shrink-0">
                {a.valorVales > 0 && (
                  <div className="tnum text-[12.5px] text-faint line-through">
                    {moeda(a.valorBruto)}
                  </div>
                )}
                <div className="tnum text-[19px] font-extrabold text-lucro">
                  {moeda(a.valorLiquido)}
                </div>
              </div>
            </div>

            <button
              onClick={() => setPagando(a.colaboradorId)}
              className="btn-primary w-full mt-3.5 h-12"
            >
              <HandCoins size={18} /> Pagar {a.colaboradorNome.split(' ')[0]}
            </button>
          </div>
        )
      })}

      <AbaHistorico />

      {emPagamento && colaboradorEmPagamento && (
        <SheetPix
          colaborador={colaboradorEmPagamento}
          valor={emPagamento.valorLiquido}
          cidade={empresa?.cidade ?? 'BRASIL'}
          descricao={`${emPagamento.quantidadeDiarias} diarias`}
          aoFechar={() => setPagando(null)}
          aoConfirmarPago={async () => {
            await registrarPagamento(emPagamento.colaboradorId)
            toast('Pagamento registrado!')
          }}
        />
      )}
    </div>
  )
}

/* -------------------------------- Histórico -------------------------------- */

function AbaHistorico() {
  const { dados: pagamentos, carregando } = usePagamentos()
  const { dados: equipe } = useColaboradores(false)
  const indice = useIndice(equipe)

  const ordenados = useMemo(
    () => [...pagamentos].sort((a, b) => (b.dataPagamento ?? '').localeCompare(a.dataPagamento ?? '')),
    [pagamentos],
  )

  if (carregando) return <CarregandoLista linhas={3} />

  if (ordenados.length === 0) return null

  return (
    <div className="space-y-2.5 animate-fade-up pt-2">
      <h2 className="px-1 pb-1 pt-4 text-[13px] font-bold text-faint uppercase tracking-wide">
        Já pagos
      </h2>
      {ordenados.map((p) => (
        <div key={p.id} className="card p-4 flex items-center gap-3.5">
          <Avatar
            nome={p.colaboradorNome}
            fotoUrl={indice[p.colaboradorId]?.fotoUrl}
            tamanho="md"
          />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[15.5px] truncate">{p.colaboradorNome}</div>
            <div className="text-[13px] text-muted truncate">
              {p.dataPagamento
                ? new Date(p.dataPagamento + 'T12:00').toLocaleDateString('pt-BR')
                : 'sem data'}
              {p.feiraNome && ` · ${p.feiraNome}`}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="tnum text-[16.5px] font-bold">{moeda(p.valorLiquido)}</div>
            <div
              className={cn(
                'text-[11px] font-bold uppercase tracking-wide',
                p.status === 'PAGO' ? 'text-lucro' : 'text-alerta',
              )}
            >
              {p.status === 'PAGO' ? 'Pago' : 'Pendente'}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
