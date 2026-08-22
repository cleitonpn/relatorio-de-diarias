import { useMemo, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Selecao } from '@/components/ui/Campo'
import { Avatar } from '@/components/ui/Avatar'
import { useToast } from '@/components/app/Toast'
import { useColaboradores } from '@/hooks/useDados'
import { escalarEmLote } from '@/lib/acoes'
import { cn } from '@/lib/cn'
import { dataCurta, diasEntre, isoParaData, moeda, nomeCurto } from '@/lib/format'
import { FASES, type Diaria, type Fase, type Feira } from '@/types'

interface Props {
  empresaId: string
  feira: Feira
  /** Diárias que já existem, para não duplicar ninguém no mesmo dia. */
  jaEscaladas: Diaria[]
  standId?: string | null
  aoFechar: () => void
}

const DIAS_ABREV = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

/**
 * O "empenho": escolhe quem vai, em quais dias, e o app cria uma diária
 * para cada cruzamento pessoa × dia.
 */
export function FormEscala({ empresaId, feira, jaEscaladas, standId, aoFechar }: Props) {
  const toast = useToast()
  const { dados: equipe } = useColaboradores()

  const dias = useMemo(() => diasEntre(feira.dataInicio, feira.dataFim), [feira])
  const [pessoas, setPessoas] = useState<Set<string>>(new Set())
  const [diasEscolhidos, setDiasEscolhidos] = useState<Set<string>>(new Set(dias))
  const [fase, setFase] = useState<Fase>('MONTAGEM')
  const [ocupado, setOcupado] = useState(false)

  /** Chave pessoa+dia do que já está lançado — evita diária duplicada. */
  const existentes = useMemo(() => {
    const chaves = new Set<string>()
    for (const d of jaEscaladas) chaves.add(`${d.colaboradorId}|${d.data}`)
    return chaves
  }, [jaEscaladas])

  const aCriar = useMemo(() => {
    let total = 0
    let custo = 0
    for (const id of pessoas) {
      const pessoa = equipe.find((p) => p.id === id)
      if (!pessoa) continue
      for (const dia of diasEscolhidos) {
        if (existentes.has(`${id}|${dia}`)) continue
        total++
        custo += pessoa.diariaPadrao + feira.almocoPorPessoaDia
      }
    }
    return { total, custo }
  }, [pessoas, diasEscolhidos, equipe, existentes, feira.almocoPorPessoaDia])

  function alternar<T>(conjunto: Set<T>, valor: T, definir: (s: Set<T>) => void) {
    const novo = new Set(conjunto)
    if (novo.has(valor)) novo.delete(valor)
    else novo.add(valor)
    definir(novo)
  }

  async function confirmar() {
    if (aCriar.total === 0) return
    setOcupado(true)
    try {
      const lote: Omit<Diaria, 'id' | 'empresaId' | 'criadaEm'>[] = []
      for (const id of pessoas) {
        const pessoa = equipe.find((p) => p.id === id)
        if (!pessoa) continue
        for (const dia of [...diasEscolhidos].sort()) {
          if (existentes.has(`${id}|${dia}`)) continue
          lote.push({
            feiraId: feira.id,
            standId: standId ?? null,
            colaboradorId: pessoa.id,
            colaboradorNome: nomeCurto(pessoa.nome, pessoa.apelido),
            data: dia,
            fase,
            // Valores CONGELADOS: mudar a diária no cadastro depois não mexe aqui.
            valorDiaria: pessoa.diariaPadrao,
            multiplicador: 1,
            valorAlmoco: feira.almocoPorPessoaDia,
            presenca: 'PREVISTO',
            observacao: null,
            pagamentoId: null,
          })
        }
      }
      const gravadas = await escalarEmLote(empresaId, lote)
      toast(`${gravadas} ${gravadas === 1 ? 'dia lançado' : 'dias lançados'}!`)
      aoFechar()
    } catch {
      toast('Não deu para escalar. Tente de novo.', 'erro')
      setOcupado(false)
    }
  }

  return (
    <Sheet
      aberto
      aoFechar={aoFechar}
      titulo="Quem vai trabalhar"
      subtitulo="Escolha as pessoas e os dias"
      alturaTotal
      rodape={
        <>
          {aCriar.total > 0 && (
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[14px] text-muted">
                {aCriar.total} {aCriar.total === 1 ? 'diária' : 'diárias'}
              </span>
              <span className="tnum text-[16px] font-bold">
                custo previsto {moeda(aCriar.custo)}
              </span>
            </div>
          )}
          <button
            onClick={confirmar}
            disabled={ocupado || aCriar.total === 0}
            className="btn-primary w-full"
          >
            {ocupado ? (
              <Loader2 size={20} className="animate-spin" />
            ) : aCriar.total === 0 ? (
              'Escolha pessoas e dias'
            ) : (
              `Escalar ${pessoas.size} ${pessoas.size === 1 ? 'pessoa' : 'pessoas'}`
            )}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        <Selecao<Fase>
          rotulo="Fase do trabalho"
          opcoes={FASES.map((f) => ({ valor: f.valor, rotulo: f.rotulo, emoji: f.emoji }))}
          valor={fase}
          onChange={setFase}
          colunas={3}
        />

        {/* Dias */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="label mb-0">Dias</span>
            <button
              onClick={() =>
                setDiasEscolhidos(diasEscolhidos.size === dias.length ? new Set() : new Set(dias))
              }
              className="text-[13px] font-bold text-brand"
            >
              {diasEscolhidos.size === dias.length ? 'Limpar' : 'Todos'}
            </button>
          </div>
          <div className="scroll-x -mx-1 px-1">
            <div className="flex gap-2 pb-1">
              {dias.map((dia) => {
                const ativo = diasEscolhidos.has(dia)
                const data = isoParaData(dia)
                return (
                  <button
                    key={dia}
                    onClick={() => alternar(diasEscolhidos, dia, setDiasEscolhidos)}
                    className={cn(
                      'shrink-0 w-[64px] py-2.5 rounded-2xl border-2 transition active:scale-95',
                      ativo
                        ? 'border-brand bg-brand text-white'
                        : 'border-line bg-raised text-ink',
                    )}
                  >
                    <div className={cn('text-[11px] font-bold', ativo ? 'text-white/70' : 'text-faint')}>
                      {DIAS_ABREV[data.getDay()]}
                    </div>
                    <div className="text-[15px] font-extrabold leading-tight">{data.getDate()}</div>
                    <div className={cn('text-[10px]', ativo ? 'text-white/70' : 'text-faint')}>
                      {dataCurta(dia).split(' ')[1]}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Pessoas */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="label mb-0">Equipe</span>
            <button
              onClick={() =>
                setPessoas(
                  pessoas.size === equipe.length ? new Set() : new Set(equipe.map((p) => p.id)),
                )
              }
              className="text-[13px] font-bold text-brand"
            >
              {pessoas.size === equipe.length ? 'Limpar' : 'Todos'}
            </button>
          </div>

          {equipe.length === 0 ? (
            <p className="py-8 text-center text-[15px] text-muted">
              Cadastre sua equipe primeiro, na aba Equipe.
            </p>
          ) : (
            <div className="space-y-2">
              {equipe.map((p) => {
                const ativo = pessoas.has(p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => alternar(pessoas, p.id, setPessoas)}
                    className={cn(
                      'w-full p-3 rounded-2xl border-2 flex items-center gap-3 text-left transition active:scale-[.99]',
                      ativo ? 'border-brand bg-brand-soft' : 'border-line bg-raised',
                    )}
                  >
                    <Avatar nome={p.nome} fotoUrl={p.fotoUrl} tamanho="md" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[15.5px] truncate">
                        {nomeCurto(p.nome, p.apelido)}
                      </div>
                      <div className="text-[13px] text-muted truncate">
                        {moeda(p.diariaPadrao)} por dia
                        {p.funcao ? ` · ${p.funcao}` : ''}
                      </div>
                    </div>
                    <div
                      className={cn(
                        'shrink-0 w-7 h-7 rounded-full grid place-items-center border-2 transition',
                        ativo ? 'bg-brand border-brand text-white' : 'border-line',
                      )}
                    >
                      {ativo && <Check size={16} strokeWidth={3} />}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Sheet>
  )
}
