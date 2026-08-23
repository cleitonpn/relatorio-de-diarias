import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Loader2, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Sheet } from '@/components/ui/Sheet'
import { Avatar } from '@/components/ui/Avatar'
import { useToast } from '@/components/app/Toast'
import { useColaboradores, useDiariasNoPeriodo, useFeiras } from '@/hooks/useDados'
import { escalarEmLote, liberarDiariasParaTransferencia } from '@/lib/acoes'
import { cn } from '@/lib/cn'
import { dataCurta, dataPorExtenso, isoParaData, moeda, nomeCurto } from '@/lib/format'
import { diasDaFase, fasesDaFeira, periodoDaFase } from '@/lib/calc'
import { FASES, type Diaria, type Fase, type Feira } from '@/types'
import { useFluxo } from '@/hooks/useTelemetria'
import { registrar } from '@/lib/telemetria'

interface Props {
  empresaId: string
  feira: Feira
  /** Diárias que já existem, para não duplicar ninguém no mesmo dia. */
  jaEscaladas: Diaria[]
  standId?: string | null
  aoFechar: () => void
}

const DIAS_ABREV = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

type Etapa = 'quem' | 'quando' | 'conflitos'

/**
 * O "empenho": escolhe quem vai, em quais dias, e o app cria uma diária
 * para cada cruzamento pessoa × dia.
 *
 * Em duas etapas, e não numa tela só, por dois motivos aprendidos no teste:
 * uma decisão por vez é mais fácil de entender, e quando tudo aparecia junto
 * a seleção de dias passava despercebida — ela vinha com todos os dias já
 * marcados, e "tudo marcado" não se lê como escolha, se lê como enfeite.
 */
export function FormEscala({ empresaId, feira, jaEscaladas, standId, aoFechar }: Props) {
  // Mede quem abre este formulário e sai sem terminar.
  const concluir = useFluxo('escala')
  const toast = useToast()
  const { dados: equipe } = useColaboradores()
  const { dados: feiras } = useFeiras()
  const { dados: diariasNoPeriodo } = useDiariasNoPeriodo(feira.dataInicio, feira.dataFim)

  const disponiveis = useMemo(() => fasesDaFeira(feira), [feira])

  const [etapa, setEtapa] = useState<Etapa>('quem')
  const [pessoas, setPessoas] = useState<Set<string>>(new Set())
  // Nada vem marcado: quem escolhe os dias é ele, não o sistema.
  const [diasEscolhidos, setDiasEscolhidos] = useState<Set<string>>(new Set())
  const [fase, setFase] = useState<Fase>(disponiveis[0] ?? 'MONTAGEM')

  /** Só os dias da fase escolhida — é o que torna a divisão clara. */
  const dias = useMemo(() => diasDaFase(feira, fase), [feira, fase])

  /** Trocar de fase zera os dias: eles pertencem a outra parte do calendário. */
  function trocarFase(nova: Fase) {
    setFase(nova)
    setDiasEscolhidos(new Set())
  }
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

  /**
   * Mesma pessoa, mesmo dia, OUTRA feira.
   *
   * Acontece por toque errado, e o estrago é silencioso: a pessoa fica contada
   * duas vezes, o custo infla nas duas feiras e o acerto sai errado. Melhor
   * perguntar antes de gravar do que descobrir no dia do pagamento.
   */
  const conflitos = useMemo(() => {
    return diariasNoPeriodo.filter(
      (d) =>
        d.feiraId !== feira.id &&
        pessoas.has(d.colaboradorId) &&
        diasEscolhidos.has(d.data) &&
        d.presenca !== 'FALTOU',
    )
  }, [diariasNoPeriodo, feira.id, pessoas, diasEscolhidos])

  /** Já pagas não podem ser transferidas: o histórico precisa continuar batendo. */
  const conflitosTravados = useMemo(() => conflitos.filter((d) => !!d.pagamentoId), [conflitos])

  const nomeDaFeira = (id: string) => feiras.find((f) => f.id === id)?.nome ?? 'outra feira'

  function alternar<T>(conjunto: Set<T>, valor: T, definir: (s: Set<T>) => void) {
    const novo = new Set(conjunto)
    if (novo.has(valor)) novo.delete(valor)
    else novo.add(valor)
    definir(novo)
  }

  /** Chamado pelo botão final; se houver conflito, desvia para a pergunta. */
  function seguir() {
    if (aCriar.total === 0) return
    if (conflitos.length > 0) {
      registrar({
        nome: 'conflito_detectado',
        pessoas: new Set(conflitos.map((d) => d.colaboradorId)).size,
      })
      setEtapa('conflitos')
      return
    }
    void confirmar('transferir')
  }

  async function confirmar(decisao: 'transferir' | 'pular') {
    if (conflitos.length > 0) {
      registrar({ nome: 'conflito_resolvido', transferiu: decisao === 'transferir' })
    }
    setOcupado(true)
    try {
      // "Pular" = não escalar a pessoa exatamente nos dias em que ela já está
      // em outra feira. O resto da escala dela continua valendo.
      const pular = new Set<string>()
      if (decisao === 'pular') {
        for (const d of conflitos) pular.add(`${d.colaboradorId}|${d.data}`)
      } else {
        // Transferir: as travadas (já pagas) continuam de fora, sempre.
        for (const d of conflitosTravados) pular.add(`${d.colaboradorId}|${d.data}`)
        await liberarDiariasParaTransferencia(
          empresaId,
          conflitos.filter((d) => !d.pagamentoId),
        )
      }

      const lote: Omit<Diaria, 'id' | 'empresaId' | 'criadaEm'>[] = []
      for (const id of pessoas) {
        const pessoa = equipe.find((p) => p.id === id)
        if (!pessoa) continue
        for (const dia of [...diasEscolhidos].sort()) {
          if (existentes.has(`${id}|${dia}`)) continue
          if (pular.has(`${id}|${dia}`)) continue
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
      concluir()
      aoFechar()
    } catch {
      toast('Não deu para escalar. Tente de novo.', 'erro')
      setOcupado(false)
    }
  }

  const semEquipe = equipe.length === 0

  return (
    <Sheet
      aberto
      aoFechar={aoFechar}
      titulo={
        etapa === 'quem'
          ? 'Quem vai trabalhar?'
          : etapa === 'quando'
            ? 'Em quais dias?'
            : 'Essa pessoa já está em outra feira'
      }
      subtitulo={
        etapa === 'quem' ? 'Passo 1 de 2' : etapa === 'quando' ? 'Passo 2 de 2' : 'Confira antes de gravar'
      }
      alturaTotal
      rodape={
        etapa === 'conflitos' ? (
          <div className="space-y-2.5">
            <button
              onClick={() => confirmar('transferir')}
              disabled={ocupado}
              className="btn-primary w-full"
            >
              {ocupado ? <Loader2 size={20} className="animate-spin" /> : 'Transferir para esta feira'}
            </button>
            <button
              onClick={() => confirmar('pular')}
              disabled={ocupado}
              className="btn-ghost w-full"
            >
              Deixar na outra feira
            </button>
            <button
              onClick={() => setEtapa('quando')}
              disabled={ocupado}
              className="w-full h-11 text-[14.5px] font-semibold text-muted"
            >
              Voltar e mudar os dias
            </button>
          </div>
        ) : etapa === 'quem' ? (
          <button
            onClick={() => setEtapa('quando')}
            disabled={pessoas.size === 0}
            className="btn-primary w-full"
          >
            {pessoas.size === 0 ? (
              'Escolha quem vai'
            ) : (
              <>
                Continuar · {pessoas.size} {pessoas.size === 1 ? 'pessoa' : 'pessoas'}
                <ArrowRight size={19} />
              </>
            )}
          </button>
        ) : (
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
            <div className="flex gap-2.5">
              <button onClick={() => setEtapa('quem')} className="btn-ghost px-5">
                <ArrowLeft size={19} />
              </button>
              <button
                onClick={seguir}
                disabled={ocupado || aCriar.total === 0}
                className="btn-primary flex-1"
              >
                {ocupado ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : diasEscolhidos.size === 0 ? (
                  'Escolha os dias'
                ) : aCriar.total === 0 ? (
                  'Já estão escalados nesses dias'
                ) : (
                  `Escalar ${pessoas.size} ${pessoas.size === 1 ? 'pessoa' : 'pessoas'}`
                )}
              </button>
            </div>
          </>
        )
      }
    >
      {/* Onde ele está no caminho */}
      <div className="flex gap-1.5 mb-5">
        <span className="flex-1 h-1.5 rounded-full bg-brand" />
        <span
          className={cn(
            'flex-1 h-1.5 rounded-full',
            etapa === 'quem' ? 'bg-line' : 'bg-brand',
          )}
        />
        {etapa === 'conflitos' && <span className="flex-1 h-1.5 rounded-full bg-alerta" />}
      </div>

      {etapa === 'conflitos' ? (
        <div className="space-y-4 animate-fade-up">
          <div className="p-4 rounded-3xl bg-alerta-soft border border-alerta/20 flex items-start gap-2.5">
            <AlertTriangle size={20} className="shrink-0 text-alerta mt-0.5" />
            <p className="text-[14.5px] text-ink leading-relaxed">
              {conflitos.length === 1
                ? 'Essa pessoa já está escalada em outra feira nesse dia.'
                : `Tem ${conflitos.length} dias em que essas pessoas já estão escaladas em outra feira.`}{' '}
              Ninguém trabalha em dois lugares ao mesmo tempo — escolha o que fazer.
            </p>
          </div>

          <div className="space-y-2">
            {conflitos.map((d) => (
              <div key={d.id} className="card p-3.5 flex items-center gap-3">
                <Avatar
                  nome={d.colaboradorNome}
                  fotoUrl={equipe.find((p) => p.id === d.colaboradorId)?.fotoUrl}
                  tamanho="md"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[15.5px] truncate">{d.colaboradorNome}</div>
                  <div className="text-[13px] text-muted truncate">
                    {dataPorExtenso(d.data)}
                  </div>
                  <div className="text-[13px] text-muted truncate">
                    está em <span className="font-semibold">{nomeDaFeira(d.feiraId)}</span>
                  </div>
                </div>
                {d.pagamentoId && (
                  <span className="shrink-0 px-2 py-1 rounded-lg bg-lucro-soft text-lucro text-[11px] font-bold uppercase tracking-wide">
                    Já paga
                  </span>
                )}
              </div>
            ))}
          </div>

          {conflitosTravados.length > 0 && (
            <p className="px-1 text-[13px] text-muted leading-relaxed">
              {conflitosTravados.length === 1
                ? 'Uma diária já foi paga e não pode ser transferida: ela fica como está, para o histórico do pagamento continuar batendo.'
                : `${conflitosTravados.length} diárias já foram pagas e não podem ser transferidas: elas ficam como estão, para o histórico do pagamento continuar batendo.`}
            </p>
          )}

          <div className="p-4 rounded-2xl bg-raised text-[13px] text-muted leading-relaxed">
            <strong className="text-ink">Transferir</strong> tira a pessoa da outra feira
            nesses dias e traz para esta.<br />
            <strong className="text-ink">Deixar na outra</strong> mantém como está e não
            escala ela aqui nesses dias.
          </div>
        </div>
      ) : etapa === 'quem' ? (
        <div className="animate-fade-up">
          {semEquipe ? (
            <div className="py-8 text-center">
              <p className="text-[15px] text-muted leading-relaxed px-4">
                Você ainda não cadastrou ninguém. Cadastre sua equipe para poder escalar.
              </p>
              <Link to="/equipe" onClick={aoFechar} className="btn-primary w-full mt-4">
                <Users size={18} /> Cadastrar equipe
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-baseline justify-between mb-2">
                <span className="label mb-0">Toque em quem vai</span>
                <button
                  onClick={() =>
                    setPessoas(
                      pessoas.size === equipe.length ? new Set() : new Set(equipe.map((p) => p.id)),
                    )
                  }
                  className="text-[13px] font-bold text-brand"
                >
                  {pessoas.size === equipe.length ? 'Limpar' : 'Marcar todos'}
                </button>
              </div>

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
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6 animate-fade-up">
          {/* A fase vem antes dos dias: ela é que define quais dias existem */}
          <div>
            <span className="label">Que parte do trabalho?</span>
            <div className="space-y-2">
              {disponiveis.map((f) => {
                const info = FASES.find((x) => x.valor === f)!
                const quando = periodoDaFase(feira, f)
                const ativo = fase === f
                return (
                  <button
                    key={f}
                    onClick={() => trocarFase(f)}
                    className={cn(
                      'w-full p-3.5 rounded-2xl border-2 flex items-center gap-3 text-left transition active:scale-[.99]',
                      ativo ? 'border-brand bg-brand-soft' : 'border-line bg-raised',
                    )}
                  >
                    <span className="shrink-0 text-[21px]">{info.emoji}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-bold text-[15.5px]">{info.rotulo}</span>
                      {quando && (
                        <span className="block text-[13px] text-muted">{quando}</span>
                      )}
                    </span>
                    <span
                      className={cn(
                        'shrink-0 w-6 h-6 rounded-full border-2 grid place-items-center',
                        ativo ? 'bg-brand border-brand text-white' : 'border-line',
                      )}
                    >
                      {ativo && <Check size={14} strokeWidth={3} />}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="label mb-0">Quais dias</span>
              <button
                onClick={() =>
                  setDiasEscolhidos(
                    diasEscolhidos.size === dias.length ? new Set() : new Set(dias),
                  )
                }
                className="text-[13px] font-bold text-brand"
              >
                {diasEscolhidos.size === dias.length ? 'Limpar' : 'Marcar todos'}
              </button>
            </div>

            <p className="text-[13px] text-muted mb-3 leading-relaxed">
              {diasEscolhidos.size === 0
                ? 'Toque nos dias em que essa gente vai trabalhar.'
                : `${diasEscolhidos.size} de ${dias.length} ${dias.length === 1 ? 'dia marcado' : 'dias marcados'}.`}
            </p>

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
                      <div
                        className={cn(
                          'text-[11px] font-bold',
                          ativo ? 'text-white/70' : 'text-faint',
                        )}
                      >
                        {DIAS_ABREV[data.getDay()]}
                      </div>
                      <div className="text-[15px] font-extrabold leading-tight">
                        {data.getDate()}
                      </div>
                      <div className={cn('text-[10px]', ativo ? 'text-white/70' : 'text-faint')}>
                        {dataCurta(dia).split(' ')[1]}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Quem foi escolhido no passo anterior, para ele conferir sem voltar */}
          <div className="p-4 rounded-2xl bg-raised">
            <div className="text-[12px] font-bold text-faint uppercase tracking-wide mb-2">
              Vão trabalhar
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[...pessoas].map((id) => {
                const p = equipe.find((x) => x.id === id)
                if (!p) return null
                return (
                  <span
                    key={id}
                    className="px-2.5 py-1 rounded-lg bg-surface border border-line text-[13px] font-semibold"
                  >
                    {nomeCurto(p.nome, p.apelido)}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </Sheet>
  )
}
