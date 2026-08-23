import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Building2,
  Gift,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  Users,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { BarraTopo, EspacoBarra } from '@/components/app/Navegacao'
import { CarregandoLista, EstadoVazio } from '@/components/ui/Estados'
import { useToast } from '@/components/app/Toast'
import { cn } from '@/lib/cn'
import { moeda } from '@/lib/format'
import { calcularMetricas, listarContas, type Metricas, type ResumoConta } from '@/lib/admin'
import { FichaConta } from './AdminFichaConta'
import { PainelDemo } from './AdminDemo'
import { PainelIndicacoes } from './AdminIndicacoes'
import { PainelUso } from './AdminUso'
import type { StatusAssinatura } from '@/types'

const ROTULO_STATUS: Record<StatusAssinatura, { texto: string; cor: string }> = {
  TESTE: { texto: 'Teste', cor: 'bg-brand-soft text-brand-ink' },
  ATIVA: { texto: 'Ativa', cor: 'bg-lucro-soft text-lucro' },
  PENDENTE: { texto: 'Pendente', cor: 'bg-alerta-soft text-alerta' },
  SOMENTE_LEITURA: { texto: 'Bloqueada', cor: 'bg-custo-soft text-custo' },
  PAUSADA: { texto: 'Pausada', cor: 'bg-raised text-muted' },
  CANCELADA: { texto: 'Cancelada', cor: 'bg-raised text-faint' },
}

export function Admin() {
  const { ehAdmin } = useAuth()
  const toast = useToast()
  const [contas, setContas] = useState<ResumoConta[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [aberta, setAberta] = useState<ResumoConta | null>(null)
  const [aba, setAba] = useState<'contas' | 'uso' | 'indicacoes' | 'ferramentas'>('contas')

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      setContas(await listarContas())
    } catch {
      toast('Não deu para carregar as contas.', 'erro')
    } finally {
      setCarregando(false)
    }
  }, [toast])

  useEffect(() => {
    if (ehAdmin) void carregar()
  }, [ehAdmin, carregar])

  const metricas = useMemo(() => calcularMetricas(contas), [contas])

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return contas
    return contas.filter(
      (c) =>
        c.empresa.nome.toLowerCase().includes(termo) ||
        (c.empresa.cidade ?? '').toLowerCase().includes(termo) ||
        c.empresa.codigoIndicacao.toLowerCase().includes(termo) ||
        c.usuarios.some((u) => (u.email ?? '').toLowerCase().includes(termo)),
    )
  }, [contas, busca])

  if (!ehAdmin) {
    return (
      <EstadoVazio
        icone={<ShieldAlert size={34} />}
        titulo="Área restrita"
        descricao="Esta tela é só para a administração da plataforma."
      />
    )
  }

  return (
    <>
      <BarraTopo
        titulo="Administração"
        subtitulo={`${contas.length} ${contas.length === 1 ? 'conta' : 'contas'}`}
        acao={
          <button
            onClick={carregar}
            disabled={carregando}
            className="shrink-0 w-11 h-11 grid place-items-center rounded-full text-muted hover:bg-raised transition"
            aria-label="Atualizar"
          >
            <RefreshCw size={19} className={cn(carregando && 'animate-spin')} />
          </button>
        }
      />

      <div className="sticky top-16 z-20 bg-canvas/85 backdrop-blur-xl border-b border-line/70">
        <div className="max-w-2xl lg:max-w-3xl mx-auto px-4 flex gap-1">
          {([
            ['contas', 'Contas'],
            ['uso', 'Uso'],
            ['indicacoes', 'Indicações'],
            ['ferramentas', 'Ferramentas'],
          ] as const).map(([id, rotulo]) => (
            <button
              key={id}
              onClick={() => setAba(id)}
              className={cn(
                'relative flex-1 h-12 text-[13.5px] sm:text-[14.5px] font-semibold transition',
                aba === id ? 'text-brand' : 'text-muted',
              )}
            >
              {rotulo}
              {aba === id && (
                <span className="absolute bottom-0 inset-x-2 h-[3px] rounded-t-full bg-brand" />
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-2xl lg:max-w-3xl mx-auto px-4 pt-4 space-y-4">
        <PainelMetricas metricas={metricas} />

        {aba === 'contas' && (
          <>
            <div className="relative">
              <Search size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Procurar por nome, cidade, e-mail ou código"
                className="field pl-12"
              />
            </div>

            {carregando ? (
              <CarregandoLista linhas={4} />
            ) : filtradas.length === 0 ? (
              <EstadoVazio
                icone={<Building2 size={34} />}
                titulo={busca ? 'Nada encontrado' : 'Nenhuma conta ainda'}
                descricao={
                  busca
                    ? 'Tente outro termo de busca.'
                    : 'Quando o primeiro empreiteiro se cadastrar, ele aparece aqui.'
                }
              />
            ) : (
              <div className="space-y-2.5">
                {filtradas.map((c) => (
                  <CartaoConta key={c.empresa.id} conta={c} aoAbrir={() => setAberta(c)} />
                ))}
              </div>
            )}
          </>
        )}

        {aba === 'uso' && <PainelUso contas={contas} />}

        {aba === 'indicacoes' && <PainelIndicacoes contas={contas} aoMudar={carregar} />}

        {aba === 'ferramentas' && <PainelDemo />}

        <EspacoBarra />
      </main>

      {aberta && (
        <FichaConta
          conta={aberta}
          aoFechar={() => setAberta(null)}
          aoMudar={async () => {
            await carregar()
            setAberta(null)
          }}
        />
      )}
    </>
  )
}

function PainelMetricas({ metricas }: { metricas: Metricas }) {
  return (
    <div className="space-y-2.5">
      <div
        className="p-5 rounded-3xl text-white shadow-lift"
        style={{ backgroundImage: 'linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)' }}
      >
        <div className="text-[13px] font-semibold uppercase tracking-wider text-white/75">
          Receita recorrente por mês
        </div>
        <div className="tnum text-[36px] font-extrabold leading-none mt-1">
          {moeda(metricas.receitaMensal)}
        </div>
        <div className="text-[13.5px] text-white/80 mt-1.5">
          {metricas.ativas} {metricas.ativas === 1 ? 'conta pagante' : 'contas pagantes'} ·{' '}
          {metricas.emTeste} em teste
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Numero rotulo="Total" valor={metricas.total} />
        <Numero rotulo="Teste" valor={metricas.emTeste} tom="brand" />
        <Numero rotulo="Ativas" valor={metricas.ativas} tom="lucro" />
        <Numero rotulo="Atraso" valor={metricas.inadimplentes} tom="custo" />
      </div>

      {metricas.porIndicacao > 0 && (
        <div className="card p-4 flex items-center gap-3">
          <Gift size={20} className="shrink-0 text-lucro" />
          <span className="text-[14px] text-muted">
            <span className="font-bold text-ink">{metricas.porIndicacao}</span>{' '}
            {metricas.porIndicacao === 1 ? 'conta entrou' : 'contas entraram'} por indicação
          </span>
        </div>
      )}
    </div>
  )
}

function Numero({
  rotulo,
  valor,
  tom,
}: {
  rotulo: string
  valor: number
  tom?: 'brand' | 'lucro' | 'custo'
}) {
  return (
    <div className="card p-3">
      <div className="text-[11px] font-bold text-faint uppercase tracking-wide">{rotulo}</div>
      <div
        className={cn(
          'tnum text-[22px] font-extrabold mt-0.5',
          tom === 'brand' && 'text-brand',
          tom === 'lucro' && 'text-lucro',
          tom === 'custo' && valor > 0 && 'text-custo',
        )}
      >
        {valor}
      </div>
    </div>
  )
}

function CartaoConta({ conta, aoAbrir }: { conta: ResumoConta; aoAbrir: () => void }) {
  const { empresa, usuarios, diasRestantesTeste } = conta
  const status = ROTULO_STATUS[empresa.assinatura.status]
  const dono = usuarios.find((u) => u.papel === 'DONO')
  const temDesconto = !!empresa.assinatura.descontoPercentual

  return (
    <button
      onClick={aoAbrir}
      className="w-full card p-4 text-left active:scale-[.99] transition"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-11 h-11 rounded-2xl bg-brand-soft text-brand-ink grid place-items-center">
          <Building2 size={20} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-bold text-[16px] truncate">{empresa.nome}</div>
          <div className="text-[13px] text-muted truncate">
            {[empresa.ramo, empresa.cidade].filter(Boolean).join(' · ') || 'sem ramo'}
          </div>
          {dono?.email && (
            <div className="text-[12.5px] text-faint truncate mt-0.5">{dono.email}</div>
          )}

          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className={cn('px-2 py-0.5 rounded-lg text-[11px] font-bold uppercase tracking-wide', status.cor)}>
              {status.texto}
            </span>
            {empresa.assinatura.status === 'TESTE' && diasRestantesTeste !== null && (
              <span className="px-2 py-0.5 rounded-lg bg-raised text-[11px] font-bold text-muted">
                {diasRestantesTeste > 0 ? `${diasRestantesTeste}d restantes` : 'expirado'}
              </span>
            )}
            {temDesconto && (
              <span className="px-2 py-0.5 rounded-lg bg-lucro-soft text-lucro text-[11px] font-bold">
                −{empresa.assinatura.descontoPercentual}%
                {!empresa.assinatura.descontoAte && ' vitalício'}
              </span>
            )}
            {usuarios.length > 1 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-raised text-[11px] font-bold text-muted">
                <Users size={11} /> {usuarios.length}
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="tnum text-[15px] font-bold">{moeda(conta.precoEfetivo)}</div>
          <div className="text-[10.5px] text-faint uppercase tracking-wide">por mês</div>
        </div>
      </div>
    </button>
  )
}

/** Aviso reutilizado nas ações que não têm volta. */
export function AvisoPerigo({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-2xl bg-custo-soft border border-custo/20 flex items-start gap-2.5">
      <AlertTriangle size={19} className="shrink-0 text-custo mt-0.5" />
      <div className="text-[13.5px] text-custo leading-relaxed">{children}</div>
    </div>
  )
}

export function BotaoCarregando({ carregando }: { carregando: boolean }) {
  return carregando ? <Loader2 size={20} className="animate-spin" /> : null
}
