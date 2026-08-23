import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Award, Calculator, ChevronRight, Settings, TrendingDown, Wallet } from 'lucide-react'
import { useFeiras, useTodasDiarias, useTodosCustos, useTodosStands } from '@/hooks/useDados'
import { BarraTopo, EspacoBarra } from '@/components/app/Navegacao'
import { CarregandoLista, EstadoVazio } from '@/components/ui/Estados'
import { CartaoResultado, LinhaDetalhe } from '@/components/app/CartaoResultado'
import { cn } from '@/lib/cn'
import { agruparPorFeira, consolidar, type ResultadoDaFeira } from '@/lib/calc'
import { dataParaISO, moeda, percentual, periodo as textoPeriodo } from '@/lib/format'
import type { DataISO } from '@/types'

type Faixa = 'MES' | 'MES_PASSADO' | 'TRIMESTRE' | 'ANO' | 'TUDO'

const FAIXAS: { valor: Faixa; rotulo: string }[] = [
  { valor: 'MES', rotulo: 'Este mês' },
  { valor: 'MES_PASSADO', rotulo: 'Mês passado' },
  { valor: 'TRIMESTRE', rotulo: '3 meses' },
  { valor: 'ANO', rotulo: 'Este ano' },
  { valor: 'TUDO', rotulo: 'Tudo' },
]

function limites(faixa: Faixa): { de: DataISO; ate: DataISO; nome: string } {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth()

  switch (faixa) {
    case 'MES':
      return {
        de: dataParaISO(new Date(ano, mes, 1)),
        ate: dataParaISO(new Date(ano, mes + 1, 0)),
        nome: 'neste mês',
      }
    case 'MES_PASSADO':
      return {
        de: dataParaISO(new Date(ano, mes - 1, 1)),
        ate: dataParaISO(new Date(ano, mes, 0)),
        nome: 'no mês passado',
      }
    case 'TRIMESTRE':
      return {
        de: dataParaISO(new Date(ano, mes - 2, 1)),
        ate: dataParaISO(new Date(ano, mes + 1, 0)),
        nome: 'nos últimos 3 meses',
      }
    case 'ANO':
      return {
        de: dataParaISO(new Date(ano, 0, 1)),
        ate: dataParaISO(new Date(ano, 11, 31)),
        nome: 'neste ano',
      }
    default:
      return { de: '0000-01-01', ate: '9999-12-31', nome: 'desde o começo' }
  }
}

/**
 * O consolidado: quanto ele ganhou, gastou e embolsou em todas as feiras de um
 * período. É a tela que responde "como foi meu mês", que a planilha dele não
 * responde sem somar tudo na mão.
 */
export function MeuDinheiro() {
  const [faixa, setFaixa] = useState<Faixa>('MES')

  const { dados: feiras, carregando } = useFeiras()
  const { dados: stands } = useTodosStands()
  const { dados: diarias } = useTodasDiarias()
  const { dados: custos } = useTodosCustos()

  const { de, ate, nome } = useMemo(() => limites(faixa), [faixa])

  const consolidado = useMemo(() => {
    // A feira conta no período em que começou — é assim que ele pensa.
    const doPeriodo = feiras.filter((f) => f.dataInicio >= de && f.dataInicio <= ate)
    const ids = new Set(doPeriodo.map((f) => f.id))
    return consolidar(
      doPeriodo,
      agruparPorFeira(stands.filter((s) => ids.has(s.feiraId))),
      agruparPorFeira(diarias.filter((d) => ids.has(d.feiraId))),
      agruparPorFeira(custos.filter((c) => ids.has(c.feiraId))),
    )
  }, [feiras, stands, diarias, custos, de, ate])

  return (
    <>
      <BarraTopo
        titulo="Meu dinheiro"
        subtitulo="Todas as feiras juntas"
        acao={
          <Link
            to="/ajustes"
            className="shrink-0 w-11 h-11 grid place-items-center rounded-full text-muted hover:bg-raised transition"
            aria-label="Ajustes"
          >
            <Settings size={20} />
          </Link>
        }
      />

      <main className="max-w-2xl lg:max-w-3xl mx-auto px-4 pt-4 space-y-4">
        {/* A pergunta que vem antes de tudo: vale a pena pegar? */}
        <Link
          to="/vale-a-pena"
          className="flex items-center gap-3.5 p-4 rounded-3xl bg-brand-soft border border-brand/15 active:scale-[.99] transition"
        >
          <div className="shrink-0 w-11 h-11 rounded-2xl bg-brand text-white grid place-items-center">
            <Calculator size={21} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[15.5px] text-brand-ink">Vale a pena pegar?</div>
            <div className="text-[13px] text-muted">
              Calcule antes de aceitar um serviço novo
            </div>
          </div>
          <ChevronRight size={20} className="shrink-0 text-brand-ink/60" />
        </Link>

        {/* Período */}
        <div className="scroll-x -mx-4 px-4">
          <div className="flex gap-2 pb-1">
            {FAIXAS.map((f) => (
              <button
                key={f.valor}
                onClick={() => setFaixa(f.valor)}
                className={cn(
                  'shrink-0 h-11 px-4 rounded-2xl text-[14.5px] font-semibold border-2 transition active:scale-95',
                  faixa === f.valor
                    ? 'border-brand bg-brand text-white'
                    : 'border-line bg-raised text-muted',
                )}
              >
                {f.rotulo}
              </button>
            ))}
          </div>
        </div>

        {carregando ? (
          <CarregandoLista linhas={4} />
        ) : consolidado.quantidadeFeiras === 0 ? (
          <EstadoVazio
            icone={<Wallet size={34} />}
            titulo="Nenhuma feira nesse período"
            descricao="Escolha outro período acima ou cadastre uma feira para começar a ver seus números."
            acao={
              <Link to="/feiras" className="btn-primary w-full">
                Ver minhas feiras
              </Link>
            }
          />
        ) : (
          <div className="space-y-4 animate-fade-up">
            <CartaoResultado resultado={consolidado} titulo={`Sobrou pra você ${nome}`} />

            {/* A frase que resume tudo, em português de gente */}
            <div className="card p-5">
              <p className="text-[15.5px] leading-relaxed">
                Você fez{' '}
                <strong>
                  {consolidado.quantidadeFeiras}{' '}
                  {consolidado.quantidadeFeiras === 1 ? 'feira' : 'feiras'}
                </strong>{' '}
                {nome}, recebeu <strong>{moeda(consolidado.receita)}</strong>, gastou{' '}
                <strong>{moeda(consolidado.custoTotal)}</strong> e{' '}
                {consolidado.lucro >= 0 ? 'sobrou pra você ' : 'ficou faltando '}
                <strong className={consolidado.lucro >= 0 ? 'text-lucro' : 'text-custo'}>
                  {moeda(Math.abs(consolidado.lucro))}
                </strong>
                .
              </p>
            </div>

            {/* Números que importam */}
            <div className="grid grid-cols-2 gap-2.5">
              <Indicador rotulo="Diárias pagas" valor={String(consolidado.totalDiarias)} />
              <Indicador rotulo="Pessoas na obra" valor={String(consolidado.pessoasEnvolvidas)} />
              <Indicador
                rotulo="Sobra por diária"
                valor={moeda(consolidado.lucroPorDiaria)}
                tom={consolidado.lucroPorDiaria >= 0 ? 'lucro' : 'custo'}
              />
              <Indicador rotulo="Quanto sobra de cada R$ 100" valor={
                consolidado.receita > 0
                  ? moeda(Math.round(consolidado.margem * 10000))
                  : '—'
              } />
            </div>

            {/* Detalhe da conta */}
            <div className="card p-5">
              <h3 className="text-[13px] font-bold text-faint uppercase tracking-wide mb-1">
                Onde o dinheiro foi
              </h3>
              <LinhaDetalhe rotulo="Você recebeu" valor={moeda(consolidado.receita)} emoji="💰" destaque="lucro" />
              <LinhaDetalhe rotulo="Diárias da equipe" valor={`− ${moeda(consolidado.custoDiarias)}`} emoji="👷" destaque="custo" />
              <LinhaDetalhe rotulo="Comida" valor={`− ${moeda(consolidado.custoAlmoco)}`} emoji="🍚" destaque="custo" />
              <LinhaDetalhe rotulo="Outros gastos" valor={`− ${moeda(consolidado.custoOutros)}`} emoji="🚚" destaque="custo" />
              <div className="flex items-center justify-between pt-4 mt-1 border-t-2 border-line">
                <span className="text-[16px] font-bold">Sobrou pra você</span>
                <span
                  className={cn(
                    'tnum text-[22px] font-extrabold',
                    consolidado.lucro >= 0 ? 'text-lucro' : 'text-custo',
                  )}
                >
                  {moeda(consolidado.lucro)}
                </span>
              </div>
            </div>

            {/* Melhor e pior */}
            {consolidado.melhor && consolidado.pior && (
              <div className="grid grid-cols-1 gap-2.5">
                <Destaque
                  icone={<Award size={19} />}
                  rotulo="A que mais rendeu"
                  item={consolidado.melhor}
                  tom="lucro"
                />
                <Destaque
                  icone={<TrendingDown size={19} />}
                  rotulo="A que menos rendeu"
                  item={consolidado.pior}
                  tom={consolidado.pior.resultado.lucro < 0 ? 'custo' : 'neutro'}
                />
              </div>
            )}

            {/* Feira por feira */}
            <section>
              <h2 className="px-1 pb-2.5 text-[13px] font-bold text-faint uppercase tracking-wide">
                Feira por feira
              </h2>
              <div className="space-y-2.5">
                {consolidado.feiras.map((f) => (
                  <LinhaFeira key={f.feira.id} item={f} maximo={consolidado.melhor?.resultado.lucro ?? 0} />
                ))}
              </div>
            </section>

            <p className="px-1 pb-2 text-[12.5px] text-faint leading-relaxed">
              Uma feira conta no período em que ela começou. Assim o resultado não fica partido
              quando a feira atravessa a virada do mês.
            </p>
          </div>
        )}

        <EspacoBarra />
      </main>
    </>
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
          'tnum text-[18px] font-extrabold mt-1',
          tom === 'lucro' && 'text-lucro',
          tom === 'custo' && 'text-custo',
        )}
      >
        {valor}
      </div>
    </div>
  )
}

function Destaque({
  icone,
  rotulo,
  item,
  tom,
}: {
  icone: React.ReactNode
  rotulo: string
  item: ResultadoDaFeira
  tom: 'lucro' | 'custo' | 'neutro'
}) {
  return (
    <Link to={`/feiras/${item.feira.id}`} className="card p-4 flex items-center gap-3.5 active:scale-[.99] transition">
      <div
        className={cn(
          'shrink-0 w-11 h-11 rounded-2xl grid place-items-center',
          tom === 'lucro' && 'bg-lucro-soft text-lucro',
          tom === 'custo' && 'bg-custo-soft text-custo',
          tom === 'neutro' && 'bg-raised text-muted',
        )}
      >
        {icone}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11.5px] font-bold text-faint uppercase tracking-wide">{rotulo}</div>
        <div className="font-bold text-[15.5px] truncate">{item.feira.nome}</div>
      </div>
      <div className="text-right shrink-0">
        <div
          className={cn(
            'tnum text-[16px] font-extrabold',
            item.resultado.lucro >= 0 ? 'text-lucro' : 'text-custo',
          )}
        >
          {moeda(item.resultado.lucro)}
        </div>
        <div className="text-[11.5px] text-faint">{percentual(item.resultado.margem)}</div>
      </div>
    </Link>
  )
}

function LinhaFeira({ item, maximo }: { item: ResultadoDaFeira; maximo: number }) {
  const { feira, resultado } = item
  const largura = maximo > 0 ? Math.max(3, (Math.abs(resultado.lucro) / maximo) * 100) : 0
  const positivo = resultado.lucro >= 0

  return (
    <Link to={`/feiras/${feira.id}`} className="block card p-4 active:scale-[.99] transition">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[15.5px] truncate">{feira.nome}</div>
          <div className="text-[12.5px] text-muted truncate">
            {textoPeriodo(feira.dataInicio, feira.dataFim)}
            {feira.modo === 'PACOTE' && ' · pacote'}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className={cn('tnum text-[17px] font-extrabold', positivo ? 'text-lucro' : 'text-custo')}>
            {moeda(resultado.lucro)}
          </div>
          <div className="text-[11.5px] text-faint">de {moeda(resultado.receita)}</div>
        </div>
        <ChevronRight size={18} className="shrink-0 text-faint mt-1.5 -ml-1" />
      </div>

      {/* Barra comparando com a feira que mais rendeu */}
      <div className="mt-3 h-2 rounded-full bg-raised overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', positivo ? 'bg-lucro' : 'bg-custo')}
          style={{ width: `${Math.min(100, largura)}%` }}
        />
      </div>
    </Link>
  )
}
