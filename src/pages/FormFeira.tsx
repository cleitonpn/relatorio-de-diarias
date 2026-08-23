import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Sheet } from '@/components/ui/Sheet'
import { Campo, CampoDinheiro, Selecao } from '@/components/ui/Campo'
import { useToast } from '@/components/app/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useContratantes } from '@/hooks/useDados'
import { apagarFeira, criarContratante, criarRecebimentosDaFeira, salvarFeira } from '@/lib/acoes'
import { dataCurta, hojeISO, somarDias } from '@/lib/format'
import { BlocoFase } from './BlocoFase'
import { BlocoRecebimentos } from './BlocoRecebimentos'
import {
  FASES,
  POLITICAS,
  type CalendarioFases,
  type ModeloRecebimento,
  type ParcelaPlanejada,
  type Fase,
  type Feira,
  type ModoFeira,
  type PeriodoFase,
  type PoliticaPagamento,
} from '@/types'

interface Props {
  empresaId: string
  feira: Feira | null
  aoFechar: () => void
  /** Chamado só quando a feira é NOVA, para encadear o próximo passo. */
  aoCriar?: (feiraId: string, modo: ModoFeira) => void
}

export function FormFeira({ empresaId, feira, aoFechar, aoCriar }: Props) {
  const toast = useToast()
  const navigate = useNavigate()
  const { empresa } = useAuth()
  const { dados: contratantes } = useContratantes()
  const novo = !feira

  const [nome, setNome] = useState(feira?.nome ?? '')
  const [local, setLocal] = useState(feira?.local ?? '')
  const [contratante, setContratante] = useState(feira?.contratanteNome ?? '')
  /**
   * Feira antiga (sem calendário por fase) entra aqui com o intervalo inteiro
   * em Montagem, para ele conferir e ajustar em vez de perder a informação.
   */
  const [fases, setFases] = useState<CalendarioFases>(() => {
    if (feira?.fases) return feira.fases
    if (feira) {
      return {
        MONTAGEM: { inicio: feira.dataInicio, fim: feira.dataFim },
        EVENTO: null,
        DESMONTAGEM: null,
      }
    }
    return {
      MONTAGEM: { inicio: hojeISO(), fim: somarDias(hojeISO(), 2) },
      EVENTO: null,
      DESMONTAGEM: null,
    }
  })
  const [modo, setModo] = useState<ModoFeira>(feira?.modo ?? 'POR_STAND')
  const [pacoteValor, setPacoteValor] = useState(feira?.pacoteValor ?? 0)
  const [pacoteM2, setPacoteM2] = useState(String(feira?.pacoteM2 ?? ''))
  const [pacoteStands, setPacoteStands] = useState(String(feira?.pacoteQtdStands ?? ''))
  const [politica, setPolitica] = useState<PoliticaPagamento>(
    feira?.politicaPagamento ?? 'FIM_FEIRA',
  )
  const [almoco, setAlmoco] = useState(feira?.almocoPorPessoaDia ?? empresa?.almocoPadrao ?? 2500)
  const [dataPagamentoFixa, setDataPagamentoFixa] = useState(
    feira?.dataPagamentoFixa ?? somarDias(hojeISO(), 7),
  )
  const [modeloRecebimento, setModeloRecebimento] = useState<ModeloRecebimento>('TUDO_FIM')
  const [parcelas, setParcelas] = useState<ParcelaPlanejada[]>([])
  const [ocupado, setOcupado] = useState(false)
  const [apagando, setApagando] = useState(false)
  const [erros, setErros] = useState<Record<string, string>>({})

  const definirFase = (fase: Fase, periodo: PeriodoFase | null) =>
    setFases((atual) => ({ ...atual, [fase]: periodo }))

  /**
   * Ao ligar uma fase, sugere datas encostadas na fase anterior — é a ordem
   * natural do trabalho, e poupa ele de digitar duas datas do zero.
   */
  function sugestaoDaFase(fase: Fase): PeriodoFase {
    const montagem = fases.MONTAGEM
    const evento = fases.EVENTO
    if (fase === 'MONTAGEM') {
      return { inicio: hojeISO(), fim: somarDias(hojeISO(), 2) }
    }
    if (fase === 'EVENTO') {
      const base = montagem ? somarDias(montagem.fim, 1) : hojeISO()
      return { inicio: base, fim: somarDias(base, 3) }
    }
    const base = evento
      ? somarDias(evento.fim, 1)
      : montagem
        ? somarDias(montagem.fim, 1)
        : hojeISO()
    return { inicio: base, fim: base }
  }

  /** Primeiro e último dia entre todas as fases ligadas. */
  const intervalo = (() => {
    const datas = FASES.map((f) => fases[f.valor]).filter(Boolean) as PeriodoFase[]
    if (datas.length === 0) return null
    return {
      inicio: datas.map((d) => d.inicio).sort()[0],
      fim: datas.map((d) => d.fim).sort().at(-1)!,
    }
  })()

  function validar(): boolean {
    const e: Record<string, string> = {}
    if (nome.trim().length < 2) e.nome = 'Escreva o nome da feira'
    if (!intervalo) e.fases = 'Marque pelo menos uma parte do trabalho'
    for (const f of FASES) {
      const periodo = fases[f.valor]
      if (periodo && periodo.fim < periodo.inicio) {
        e[`fase_${f.valor}`] = 'O fim está antes do começo'
      }
    }
    if (modo === 'PACOTE' && pacoteValor <= 0) e.pacoteValor = 'Quanto você vai receber pelo pacote?'
    if (politica === 'DATA_FIXA' && !dataPagamentoFixa) e.dataPagamento = 'Escolha o dia do acerto'
    setErros(e)
    return Object.keys(e).length === 0
  }

  async function salvar() {
    if (!validar()) return
    setOcupado(true)
    try {
      let contratanteId = feira?.contratanteId ?? null
      const nomeContratante = contratante.trim()
      if (nomeContratante) {
        const existente = contratantes.find(
          (c) => c.nome.toLowerCase() === nomeContratante.toLowerCase(),
        )
        contratanteId = existente?.id ?? (await criarContratante(empresaId, nomeContratante))
      }

      const feiraId = await salvarFeira(
        empresaId,
        {
          nome: nome.trim(),
          local: local.trim() || null,
          cidade: empresa?.cidade ?? null,
          contratanteId,
          contratanteNome: nomeContratante || null,
          dataInicio: intervalo!.inicio,
          dataFim: intervalo!.fim,
          fases,
          modo,
          pacoteValor: modo === 'PACOTE' ? pacoteValor : null,
          pacoteM2: modo === 'PACOTE' ? Number(pacoteM2) || null : null,
          pacoteQtdStands: modo === 'PACOTE' ? Number(pacoteStands) || null : null,
          politicaPagamento: politica,
          dataPagamentoFixa: politica === 'DATA_FIXA' ? dataPagamentoFixa : null,
          almocoPorPessoaDia: almoco,
          encerrada: feira?.encerrada ?? false,
          origem: feira?.origem ?? {
            tipo: 'MANUAL',
            appOrigem: null,
            idExterno: null,
            importadoEm: null,
          },
        },
        feira?.id,
      )
      if (novo && parcelas.length > 0) {
        await criarRecebimentosDaFeira(
          empresaId,
          { id: feiraId, nome: nome.trim(), contratanteNome: nomeContratante || null },
          parcelas.filter((p) => p.valor > 0),
        )
      }

      toast(novo ? 'Feira cadastrada!' : 'Feira atualizada!')
      aoFechar()
      // Cadastrar a feira sozinha não serve de nada: o próximo passo é o que
      // dá valor a ela. Em vez de deixar ele procurar, o app leva.
      if (novo) aoCriar?.(feiraId, modo)
    } catch {
      toast('Não deu para salvar. Tente de novo.', 'erro')
      setOcupado(false)
    }
  }

  async function apagar() {
    if (!feira) return
    const confirmado = window.confirm(
      `Apagar a feira "${feira.nome}"?\n\nIsso remove os stands, a escala e os gastos dela. Não tem como desfazer.`,
    )
    if (!confirmado) return

    setApagando(true)
    try {
      await apagarFeira(empresaId, feira.id)
      toast('Feira apagada')
      aoFechar()
      navigate('/feiras', { replace: true })
    } catch (e) {
      toast((e as Error).message || 'Não deu para apagar.', 'erro')
      setApagando(false)
    }
  }

  return (
    <Sheet
      aberto
      aoFechar={aoFechar}
      titulo={novo ? 'Nova feira' : 'Editar feira'}
      subtitulo={novo ? 'Onde você vai trabalhar' : undefined}
      alturaTotal
      rodape={
        <button onClick={salvar} disabled={ocupado} className="btn-primary w-full">
          {ocupado ? <Loader2 size={20} className="animate-spin" /> : 'Salvar feira'}
        </button>
      }
    >
      <div className="space-y-5">
        <Campo
          rotulo="Nome da feira"
          placeholder="Ex.: Expo Construção 2026"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          erro={erros.nome}
          autoFocus={novo}
        />

        <div className="grid grid-cols-2 gap-3">
          <Campo
            rotulo="Pavilhão / local"
            placeholder="Ex.: Pavilhão Azul"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
          />
          <Campo
            rotulo="Quem contratou"
            placeholder="Nome da empresa"
            value={contratante}
            onChange={(e) => setContratante(e.target.value)}
            list="contratantes"
          />
          <datalist id="contratantes">
            {contratantes.map((c) => (
              <option key={c.id} value={c.nome} />
            ))}
          </datalist>
        </div>

        <div>
          <span className="label">Quando é cada parte do trabalho</span>
          <p className="text-[13px] text-muted mb-3 leading-relaxed -mt-1">
            Marque só as partes em que a sua equipe trabalha. Na hora de escalar, o app
            mostra apenas os dias de cada uma.
          </p>
          <div className="space-y-2.5">
            {FASES.map((f) => (
              <BlocoFase
                key={f.valor}
                rotulo={f.rotulo}
                emoji={f.emoji}
                descricao={
                  f.valor === 'MONTAGEM'
                    ? 'Antes da feira abrir'
                    : f.valor === 'EVENTO'
                      ? 'Com a feira acontecendo'
                      : 'Depois que a feira acaba'
                }
                periodo={fases[f.valor]}
                aoMudar={(periodo) => definirFase(f.valor, periodo)}
                sugestao={sugestaoDaFase(f.valor)}
                erro={erros[`fase_${f.valor}`]}
              />
            ))}
          </div>
          {erros.fases && (
            <span className="block mt-2 text-[13px] font-medium text-custo">{erros.fases}</span>
          )}
          {intervalo && (
            <p className="mt-3 text-[13px] text-muted">
              A feira vai de {dataCurta(intervalo.inicio)} a {dataCurta(intervalo.fim)}.
            </p>
          )}
        </div>

        <Selecao<ModoFeira>
          rotulo="Como foi fechado"
          opcoes={[
            {
              valor: 'POR_STAND',
              rotulo: 'Stand por stand',
              descricao: 'Cada stand tem seu valor',
              emoji: '🏗️',
            },
            {
              valor: 'PACOTE',
              rotulo: 'Pacote fechado',
              descricao: 'Um valor pela feira toda',
              emoji: '📦',
            },
          ]}
          valor={modo}
          onChange={setModo}
        />

        {modo === 'PACOTE' && (
          <div className="p-4 rounded-3xl bg-brand-soft/60 border border-brand/15 space-y-4 animate-fade-up">
            <CampoDinheiro
              rotulo="Valor total do pacote"
              valor={pacoteValor}
              onChange={setPacoteValor}
              erro={erros.pacoteValor}
            />
            <div className="grid grid-cols-2 gap-3">
              <Campo
                rotulo="Metros quadrados"
                type="number"
                inputMode="decimal"
                placeholder="3000"
                value={pacoteM2}
                onChange={(e) => setPacoteM2(e.target.value)}
                sufixo="m²"
              />
              <Campo
                rotulo="Quantos stands"
                type="number"
                inputMode="numeric"
                placeholder="40"
                value={pacoteStands}
                onChange={(e) => setPacoteStands(e.target.value)}
              />
            </div>
            <p className="text-[12.5px] text-brand-ink/75 leading-relaxed">
              No pacote fechado você não precisa cadastrar stand por stand. O app calcula seu
              resultado pela feira inteira.
            </p>
          </div>
        )}

        {novo && (
          <BlocoRecebimentos
            modelo={modeloRecebimento}
            aoMudarModelo={setModeloRecebimento}
            parcelas={parcelas}
            aoMudarParcelas={setParcelas}
            total={modo === 'PACOTE' ? pacoteValor : 0}
            inicioMontagem={fases.MONTAGEM?.inicio ?? null}
            fimFeira={intervalo?.fim ?? dataPagamentoFixa}
          />
        )}

        <Selecao<PoliticaPagamento>
          rotulo="Quando você paga a equipe"
          opcoes={POLITICAS.map((p) => ({
            valor: p.valor,
            rotulo: p.rotulo,
            descricao: p.descricao,
          }))}
          valor={politica}
          onChange={setPolitica}
          colunas={1}
        />

        {politica === 'DATA_FIXA' && (
          <Campo
            rotulo="Dia do acerto com a equipe"
            type="date"
            value={dataPagamentoFixa}
            onChange={(e) => setDataPagamentoFixa(e.target.value)}
            erro={erros.dataPagamento}
            dica="É a data que o funcionário vê como previsão de pagamento"
          />
        )}

        <CampoDinheiro
          rotulo="Almoço por pessoa, por dia"
          valor={almoco}
          onChange={setAlmoco}
          dica="Entra automático quando você marcar presença"
        />

        {!novo && (
          <div className="pt-4 border-t border-line">
            <button
              onClick={apagar}
              disabled={ocupado || apagando}
              className="btn w-full bg-custo-soft text-custo"
            >
              {apagando ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <Trash2 size={18} /> Apagar esta feira
                </>
              )}
            </button>
            <p className="mt-2 text-[12.5px] text-faint text-center leading-relaxed">
              Apaga também os stands, a escala e os gastos dela. Feira com diária já paga
              não pode ser apagada.
            </p>
          </div>
        )}
      </div>
    </Sheet>
  )
}
