import { useMemo, useState } from 'react'
import { Download, FileSpreadsheet, Send, Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  useColaboradores,
  useFeiras,
  usePagamentos,
  useTodasDiarias,
  useTodosCustos,
  useTodosStands,
} from '@/hooks/useDados'
import { BarraTopo, EspacoBarra } from '@/components/app/Navegacao'
import { CarregandoLista } from '@/components/ui/Estados'
import { useToast } from '@/components/app/Toast'
import { cn } from '@/lib/cn'
import {
  baixarArquivo,
  csvDoContador,
  montarPacoteContador,
  resumoParaTexto,
} from '@/lib/contador'
import { dataParaISO, moeda } from '@/lib/format'

type Faixa = 'MES' | 'MES_PASSADO' | 'TRIMESTRE' | 'ANO'

const FAIXAS: { valor: Faixa; rotulo: string }[] = [
  { valor: 'MES', rotulo: 'Este mês' },
  { valor: 'MES_PASSADO', rotulo: 'Mês passado' },
  { valor: 'TRIMESTRE', rotulo: '3 meses' },
  { valor: 'ANO', rotulo: 'Este ano' },
]

function limites(faixa: Faixa) {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth()
  switch (faixa) {
    case 'MES':
      return { de: dataParaISO(new Date(ano, mes, 1)), ate: dataParaISO(new Date(ano, mes + 1, 0)) }
    case 'MES_PASSADO':
      return { de: dataParaISO(new Date(ano, mes - 1, 1)), ate: dataParaISO(new Date(ano, mes, 0)) }
    case 'TRIMESTRE':
      return { de: dataParaISO(new Date(ano, mes - 2, 1)), ate: dataParaISO(new Date(ano, mes + 1, 0)) }
    default:
      return { de: dataParaISO(new Date(ano, 0, 1)), ate: dataParaISO(new Date(ano, 11, 31)) }
  }
}

/**
 * O pacote do contador.
 *
 * Hoje o empreiteiro entrega isso escrito à mão, num caderno ou num áudio de
 * WhatsApp. Aqui sai uma planilha que o Excel abre e o contador lança direto —
 * com o que entrou, o que saiu e quanto foi pago a cada pessoa, com data.
 */
export function Contador() {
  const toast = useToast()
  const { empresa } = useAuth()
  const [faixa, setFaixa] = useState<Faixa>('MES')

  const { dados: feiras, carregando } = useFeiras()
  const { dados: stands } = useTodosStands()
  const { dados: diarias } = useTodasDiarias()
  const { dados: custos } = useTodosCustos()
  const { dados: pagamentos } = usePagamentos()
  const { dados: colaboradores } = useColaboradores(false)

  const { de, ate } = useMemo(() => limites(faixa), [faixa])

  const pacote = useMemo(
    () =>
      montarPacoteContador({ de, ate, feiras, stands, diarias, custos, pagamentos, colaboradores }),
    [de, ate, feiras, stands, diarias, custos, pagamentos, colaboradores],
  )

  const nomeArquivo = `contabilidade-${de}-a-${ate}.csv`

  function baixar() {
    baixarArquivo(csvDoContador(pacote, empresa?.nome ?? 'Minha empresa'), nomeArquivo)
    toast('Planilha baixada! Mande para o contador.')
  }

  async function enviarResumo() {
    const texto = resumoParaTexto(pacote, empresa?.nome ?? 'Minha empresa')
    if (navigator.share) {
      try {
        await navigator.share({ text: texto })
        return
      } catch {
        /* cancelou */
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
  }

  return (
    <>
      <BarraTopo titulo="Para o contador" subtitulo="Tudo pronto, sem escrever nada" voltarPara="/ajustes" />

      <main className="max-w-2xl lg:max-w-3xl mx-auto px-4 pt-4 space-y-4">
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
        ) : (
          <div className="space-y-4 animate-fade-up">
            {/* Resumo do período */}
            <div className="card p-5">
              <h2 className="text-[13px] font-bold text-faint uppercase tracking-wide mb-3">
                Resumo do período
              </h2>
              <Linha rotulo="Entrou" valor={moeda(pacote.totalReceita)} tom="lucro" />
              <Linha rotulo="Saiu" valor={moeda(pacote.totalDespesa)} tom="custo" />
              <Linha rotulo="Mão de obra (diárias)" valor={moeda(pacote.totalMaoDeObra)} discreto />
              <div className="flex items-center justify-between pt-3.5 mt-1 border-t-2 border-line">
                <span className="text-[16px] font-bold">Resultado</span>
                <span
                  className={cn(
                    'tnum text-[21px] font-extrabold',
                    pacote.resultado >= 0 ? 'text-lucro' : 'text-custo',
                  )}
                >
                  {moeda(pacote.resultado)}
                </span>
              </div>
            </div>

            {/* O que vai na planilha */}
            <div className="grid grid-cols-3 gap-2.5">
              <Caixa rotulo="Receitas" valor={String(pacote.receitas.length)} />
              <Caixa rotulo="Despesas" valor={String(pacote.despesas.length)} />
              <Caixa rotulo="Pagamentos" valor={String(pacote.pagamentos.length)} />
            </div>

            {pacote.pagamentos.length > 0 && (
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Users size={18} className="text-muted" />
                  <h2 className="text-[15px] font-bold">Pagamentos a pessoas</h2>
                </div>
                <p className="text-[13px] text-muted mb-3 leading-relaxed">
                  {pacote.pessoasPagas}{' '}
                  {pacote.pessoasPagas === 1 ? 'pessoa recebeu' : 'pessoas receberam'} no período.
                  Vai tudo na planilha com data, valor e CPF de quem cadastrou.
                </p>
                <div className="divide-y divide-line -mx-1">
                  {pacote.pagamentos.slice(0, 6).map((p, i) => (
                    <div key={i} className="px-1 py-2.5 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[14.5px] truncate">{p.nome}</div>
                        <div className="text-[12.5px] text-muted">
                          {p.data.split('-').reverse().join('/')} · {p.diarias}{' '}
                          {p.diarias === 1 ? 'diária' : 'diárias'}
                        </div>
                      </div>
                      <span className="tnum text-[15px] font-bold shrink-0">
                        {moeda(p.liquido)}
                      </span>
                    </div>
                  ))}
                </div>
                {pacote.pagamentos.length > 6 && (
                  <p className="mt-2.5 text-[13px] text-faint">
                    e mais {pacote.pagamentos.length - 6} na planilha.
                  </p>
                )}
              </div>
            )}

            {/* Entrega */}
            <button onClick={baixar} className="btn-primary w-full">
              <Download size={19} /> Baixar planilha
            </button>
            <button onClick={enviarResumo} className="btn-ghost w-full">
              <Send size={18} /> Mandar resumo no WhatsApp
            </button>

            <div className="p-4 rounded-2xl bg-raised flex items-start gap-2.5">
              <FileSpreadsheet size={19} className="shrink-0 text-muted mt-0.5" />
              <p className="text-[13px] text-muted leading-relaxed">
                A planilha abre no Excel e no Google Planilhas. Ela traz receitas por
                contratante, despesas por categoria e todos os pagamentos a pessoas físicas
                com data — que é o que o contador costuma pedir por escrito.
              </p>
            </div>
          </div>
        )}

        <EspacoBarra />
      </main>
    </>
  )
}

function Linha({
  rotulo,
  valor,
  tom,
  discreto,
}: {
  rotulo: string
  valor: string
  tom?: 'lucro' | 'custo'
  discreto?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className={cn('text-[15px]', discreto ? 'text-faint pl-3' : 'text-muted')}>
        {rotulo}
      </span>
      <span
        className={cn(
          'tnum font-bold',
          discreto ? 'text-[14px] text-faint' : 'text-[16px]',
          tom === 'lucro' && 'text-lucro',
          tom === 'custo' && 'text-custo',
        )}
      >
        {valor}
      </span>
    </div>
  )
}

function Caixa({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="card p-3.5">
      <div className="text-[11.5px] font-bold text-faint uppercase tracking-wide">{rotulo}</div>
      <div className="tnum text-[20px] font-extrabold mt-0.5">{valor}</div>
    </div>
  )
}
