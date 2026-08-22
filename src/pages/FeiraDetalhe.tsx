import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Building2, ChevronRight, Pencil, Plus, Receipt, Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCustos, useDiarias, useFeiras, useStands } from '@/hooks/useDados'
import { BarraTopo, EspacoBarra } from '@/components/app/Navegacao'
import { CarregandoTela, EstadoVazio } from '@/components/ui/Estados'
import { CartaoResultado, LinhaDetalhe } from '@/components/app/CartaoResultado'
import { cn } from '@/lib/cn'
import { calcularResultado, custoMedioDiaria, diariasQueAindaCabem, m2DaFeira, receitaDaFeira, receitaDoStand } from '@/lib/calc'
import { metrosQuadrados, moeda, periodo } from '@/lib/format'
import { CATEGORIAS_CUSTO } from '@/types'
import { FormFeira } from './FormFeira'
import { FormStand } from './FormStand'
import { FormCusto } from './FormCusto'
import { FormEscala } from './FormEscala'
import { ListaEscala } from './ListaEscala'
import type { Custo, Stand } from '@/types'

type Aba = 'resultado' | 'equipe' | 'gastos' | 'stands'

export function FeiraDetalhe() {
  const { feiraId } = useParams<{ feiraId: string }>()
  const [parametros, setParametros] = useSearchParams()
  const { perfil } = useAuth()
  const { dados: feiras, carregando } = useFeiras()
  const feira = feiras.find((f) => f.id === feiraId) ?? null

  const { dados: stands } = useStands(feiraId ?? null)
  const { dados: diarias } = useDiarias(feiraId ?? null)
  const { dados: custos } = useCustos(feiraId ?? null)

  const [aba, setAba] = useState<Aba>('resultado')
  const [editandoFeira, setEditandoFeira] = useState(false)
  const [standAberto, setStandAberto] = useState<Stand | 'novo' | null>(null)
  const [custoAberto, setCustoAberto] = useState<Custo | 'novo' | null>(null)
  const [escalando, setEscalando] = useState(false)

  /**
   * Chegando de "feira cadastrada", o app abre o próximo passo sozinho:
   * o formulário de stand (ou a escala, quando a feira é pacote fechado).
   * O parâmetro é consumido na hora para um F5 não reabrir o formulário.
   */
  const comecar = parametros.get('comecar')
  useEffect(() => {
    if (!comecar) return
    if (comecar === 'stands') {
      setAba('stands')
      setStandAberto('novo')
    } else if (comecar === 'equipe') {
      // Sem abrir a folha: se ele ainda não cadastrou ninguém, a escala não
      // teria o que mostrar. O estado vazio da aba já convida com um botão.
      setAba('equipe')
    }
    setParametros({}, { replace: true })
  }, [comecar, setParametros])

  const resultado = useMemo(() => {
    if (!feira) return null
    return calcularResultado(
      receitaDaFeira(feira, stands),
      diarias,
      custos,
      m2DaFeira(feira, stands),
    )
  }, [feira, stands, diarias, custos])

  if (carregando) return <CarregandoTela />
  if (!feira || !perfil) {
    return (
      <EstadoVazio
        icone={<Building2 size={34} />}
        titulo="Feira não encontrada"
        descricao="Ela pode ter sido apagada em outro aparelho."
      />
    )
  }

  const ABAS: { id: Aba; rotulo: string }[] = [
    { id: 'resultado', rotulo: 'Resultado' },
    { id: 'equipe', rotulo: 'Equipe' },
    { id: 'gastos', rotulo: 'Gastos' },
    ...(feira.modo === 'POR_STAND' ? [{ id: 'stands' as Aba, rotulo: 'Stands' }] : []),
  ]

  return (
    <>
      <BarraTopo
        titulo={feira.nome}
        subtitulo={periodo(feira.dataInicio, feira.dataFim)}
        voltarPara="/feiras"
        acao={
          <button
            onClick={() => setEditandoFeira(true)}
            className="shrink-0 w-11 h-11 grid place-items-center rounded-full text-muted hover:bg-raised transition"
            aria-label="Editar feira"
          >
            <Pencil size={19} />
          </button>
        }
      />

      {/* Abas */}
      <div className="sticky top-16 z-20 bg-canvas/85 backdrop-blur-xl border-b border-line/70">
        <div className="max-w-2xl lg:max-w-3xl mx-auto px-4">
          <div className="flex gap-1">
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
                {aba === a.id && (
                  <span className="absolute bottom-0 inset-x-2 h-[3px] rounded-t-full bg-brand" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-2xl lg:max-w-3xl mx-auto px-4 pt-4">
        {aba === 'resultado' && resultado && (
          <AbaResultado
            resultado={resultado}
            almocoPadrao={feira.almocoPorPessoaDia}
            diarias={diarias}
            modo={feira.modo}
          />
        )}

        {aba === 'equipe' && (
          <ListaEscala
            empresaId={perfil.empresaId}
            feira={feira}
            diarias={diarias}
            aoEscalar={() => setEscalando(true)}
          />
        )}

        {aba === 'gastos' && (
          <AbaGastos custos={custos} aoAbrir={setCustoAberto} />
        )}

        {aba === 'stands' && (
          <AbaStands
            stands={stands}
            aoAbrir={setStandAberto}
            temEscala={diarias.length > 0}
            aoEscalar={() => {
              setAba('equipe')
              setEscalando(true)
            }}
          />
        )}

        <EspacoBarra />
      </main>

      {editandoFeira && (
        <FormFeira empresaId={perfil.empresaId} feira={feira} aoFechar={() => setEditandoFeira(false)} />
      )}
      {standAberto && (
        <FormStand
          empresaId={perfil.empresaId}
          feiraId={feira.id}
          stand={standAberto === 'novo' ? null : standAberto}
          aoFechar={() => setStandAberto(null)}
        />
      )}
      {custoAberto && (
        <FormCusto
          empresaId={perfil.empresaId}
          feiraId={feira.id}
          custo={custoAberto === 'novo' ? null : custoAberto}
          aoFechar={() => setCustoAberto(null)}
        />
      )}
      {escalando && (
        <FormEscala
          empresaId={perfil.empresaId}
          feira={feira}
          jaEscaladas={diarias}
          aoFechar={() => setEscalando(false)}
        />
      )}
    </>
  )
}

/* ------------------------------- Aba resultado ------------------------------ */

function AbaResultado({
  resultado,
  almocoPadrao,
  diarias,
  modo,
}: {
  resultado: ReturnType<typeof calcularResultado>
  almocoPadrao: number
  diarias: Parameters<typeof custoMedioDiaria>[0]
  modo: 'POR_STAND' | 'PACOTE'
}) {
  const custoMedio = custoMedioDiaria(diarias, almocoPadrao)
  const cabem = diariasQueAindaCabem(resultado, custoMedio)

  return (
    <div className="space-y-4 animate-fade-up">
      <CartaoResultado resultado={resultado} />

      {/* O alerta que transforma o app de registro em conselheiro */}
      {resultado.receita > 0 && custoMedio > 0 && (
        <div
          className={cn(
            'p-4 rounded-3xl border',
            cabem === 0
              ? 'bg-custo-soft border-custo/20'
              : cabem <= 2
                ? 'bg-alerta-soft border-alerta/20'
                : 'bg-lucro-soft border-lucro/20',
          )}
        >
          <div className="text-[15px] font-bold leading-snug">
            {cabem === 0
              ? 'Você não tem folga para mais nenhum dia de trabalho.'
              : `Ainda cabem ${cabem} ${cabem === 1 ? 'diária' : 'diárias'} antes do lucro acabar.`}
          </div>
          <div className="text-[13.5px] text-muted mt-1">
            Cada dia de uma pessoa custa em média {moeda(custoMedio)}, com almoço.
          </div>
        </div>
      )}

      <div className="card p-5">
        <h3 className="text-[13px] font-bold text-faint uppercase tracking-wide mb-1">
          Como ficou a conta
        </h3>
        <LinhaDetalhe rotulo="Você recebe" valor={moeda(resultado.receita)} emoji="💰" destaque="lucro" />
        <LinhaDetalhe rotulo="Diárias da equipe" valor={`− ${moeda(resultado.custoDiarias)}`} emoji="👷" destaque="custo" />
        <LinhaDetalhe rotulo="Comida" valor={`− ${moeda(resultado.custoAlmoco)}`} emoji="🍚" destaque="custo" />
        <LinhaDetalhe rotulo="Outros gastos" valor={`− ${moeda(resultado.custoOutros)}`} emoji="🚚" destaque="custo" />
        <div className="flex items-center justify-between pt-4 mt-1 border-t-2 border-line">
          <span className="text-[16px] font-bold">Sobrou pra você</span>
          <span
            className={cn(
              'tnum text-[22px] font-extrabold',
              resultado.lucro >= 0 ? 'text-lucro' : 'text-custo',
            )}
          >
            {moeda(resultado.lucro)}
          </span>
        </div>
      </div>

      {resultado.m2 > 0 && (
        <div className="grid grid-cols-3 gap-2.5">
          <Indicador rotulo="Tamanho" valor={metrosQuadrados(resultado.m2)} />
          <Indicador rotulo="Recebe por m²" valor={moeda(resultado.receitaPorM2)} />
          <Indicador
            rotulo="Sobra por m²"
            valor={moeda(resultado.lucroPorM2)}
            tom={resultado.lucroPorM2 >= 0 ? 'lucro' : 'custo'}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <Indicador rotulo="Diárias trabalhadas" valor={String(resultado.totalDiarias)} />
        <Indicador
          rotulo={modo === 'PACOTE' ? 'Modo' : 'Custo por m²'}
          valor={modo === 'PACOTE' ? 'Pacote fechado' : moeda(resultado.custoPorM2)}
        />
      </div>
    </div>
  )
}

function Indicador({
  rotulo,
  valor,
  tom,
}: {
  rotulo: string
  valor: string
  tom?: 'lucro' | 'custo'
}) {
  return (
    <div className="card p-3.5">
      <div className="text-[11.5px] font-bold text-faint uppercase tracking-wide leading-tight">
        {rotulo}
      </div>
      <div
        className={cn(
          'tnum text-[16px] font-extrabold mt-1',
          tom === 'lucro' && 'text-lucro',
          tom === 'custo' && 'text-custo',
        )}
      >
        {valor}
      </div>
    </div>
  )
}

/* --------------------------------- Aba gastos -------------------------------- */

function AbaGastos({
  custos,
  aoAbrir,
}: {
  custos: Custo[]
  aoAbrir: (c: Custo | 'novo') => void
}) {
  const total = custos.reduce((t, c) => t + c.valor, 0)
  const ordenados = [...custos].sort((a, b) => b.data.localeCompare(a.data))

  return (
    <div className="space-y-3 animate-fade-up">
      <button onClick={() => aoAbrir('novo')} className="btn-primary w-full">
        <Plus size={19} /> Lançar gasto
      </button>

      {custos.length === 0 ? (
        <EstadoVazio
          icone={<Receipt size={34} />}
          titulo="Nenhum gasto ainda"
          descricao="Combustível, estacionamento, marmita, material — tudo que sai do seu bolso entra aqui."
        />
      ) : (
        <>
          <div className="card p-4 flex items-center justify-between">
            <span className="text-[15px] font-semibold text-muted">Total de gastos</span>
            <span className="tnum text-[20px] font-extrabold text-custo">{moeda(total)}</span>
          </div>

          <div className="space-y-2.5">
            {ordenados.map((c) => {
              const cat = CATEGORIAS_CUSTO.find((x) => x.valor === c.categoria)
              return (
                <button
                  key={c.id}
                  onClick={() => aoAbrir(c)}
                  className="w-full card p-4 flex items-center gap-3.5 text-left active:scale-[.99] transition"
                >
                  <span className="shrink-0 w-11 h-11 rounded-2xl bg-raised grid place-items-center text-[20px]">
                    {cat?.emoji ?? '📌'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[15.5px]">{cat?.rotulo ?? 'Gasto'}</div>
                    <div className="text-[13px] text-muted truncate">
                      {c.descricao || new Date(c.data + 'T12:00').toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <span className="tnum text-[16px] font-bold text-custo shrink-0">
                    {moeda(c.valor)}
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

/* --------------------------------- Aba stands -------------------------------- */

function AbaStands({
  stands,
  aoAbrir,
  temEscala,
  aoEscalar,
}: {
  stands: Stand[]
  aoAbrir: (s: Stand | 'novo') => void
  temEscala: boolean
  aoEscalar: () => void
}) {
  const receitaTotal = stands.reduce((t, s) => t + receitaDoStand(s), 0)
  const m2Total = stands.reduce((t, s) => t + s.m2, 0)

  return (
    <div className="space-y-3 animate-fade-up">
      <button onClick={() => aoAbrir('novo')} className="btn-primary w-full">
        <Plus size={19} /> Novo stand
      </button>

      {stands.length === 0 ? (
        <EstadoVazio
          icone={<Building2 size={34} />}
          titulo="Nenhum stand ainda"
          descricao="Cadastre cada stand com o tamanho e o valor combinado para o app calcular sua receita."
        />
      ) : (
        <>
          <div className="card p-4 flex items-center justify-between">
            <div>
              <div className="text-[15px] font-semibold text-muted">
                {stands.length} {stands.length === 1 ? 'stand' : 'stands'}
              </div>
              <div className="text-[13px] text-faint">{metrosQuadrados(m2Total)} no total</div>
            </div>
            <span className="tnum text-[20px] font-extrabold text-lucro">{moeda(receitaTotal)}</span>
          </div>

          <div className="space-y-2.5">
            {stands.map((s) => (
              <button
                key={s.id}
                onClick={() => aoAbrir(s)}
                className="w-full card p-4 flex items-center gap-3.5 text-left active:scale-[.99] transition"
              >
                <span className="shrink-0 w-11 h-11 rounded-2xl bg-brand-soft text-brand-ink grid place-items-center font-extrabold text-[13px]">
                  {s.m2}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[15.5px] truncate">{s.nome}</div>
                  <div className="text-[13px] text-muted">
                    {metrosQuadrados(s.m2)}
                    {s.tipoCobranca === 'POR_M2' && s.valorM2
                      ? ` · ${moeda(s.valorM2)}/m²`
                      : ' · valor fechado'}
                  </div>
                </div>
                <span className="tnum text-[16px] font-bold shrink-0">
                  {moeda(receitaDoStand(s))}
                </span>
                <ChevronRight size={18} className="shrink-0 text-faint -ml-1" />
              </button>
            ))}
          </div>

          {/* O stand sozinho não paga ninguém: o próximo passo é a equipe. */}
          {!temEscala && (
            <div className="p-4 rounded-3xl bg-brand-soft border border-brand/15 animate-fade-up">
              <div className="text-[15px] font-bold text-brand-ink">
                Stands cadastrados. Agora escale sua equipe.
              </div>
              <p className="text-[13.5px] text-muted mt-1 leading-relaxed">
                Escolha quem vai trabalhar e em quais dias. É isso que gera o custo e o
                pagamento de cada um.
              </p>
              <button onClick={aoEscalar} className="btn-primary w-full h-12 mt-3.5">
                <Users size={18} /> Escalar equipe
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
