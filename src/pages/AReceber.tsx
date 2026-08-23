import { useMemo, useState } from 'react'
import { AlertTriangle, Check, Loader2, Plus, Trash2, Wallet } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useFeiras, useRecebimentos } from '@/hooks/useDados'
import { EstadoVazio } from '@/components/ui/Estados'
import { Sheet } from '@/components/ui/Sheet'
import { Campo, CampoDinheiro, Selecao } from '@/components/ui/Campo'
import { useToast } from '@/components/app/Toast'
import { apagarRecebimento, registrarRecebimento, salvarRecebimento } from '@/lib/acoes'
import { cn } from '@/lib/cn'
import { dataPorExtenso, distanciaDeHoje, hojeISO, moeda, somarDias } from '@/lib/format'
import type { Recebimento } from '@/types'

export function AReceber() {
  const { perfil } = useAuth()
  const { dados: recebimentos, carregando } = useRecebimentos()
  const [registrando, setRegistrando] = useState<Recebimento | null>(null)
  const [criando, setCriando] = useState(false)

  const hoje = hojeISO()
  const { atrasados, abertos, recebidos, totais } = useMemo(() => {
    const pendentes = recebimentos.filter((r) => r.status !== 'RECEBIDO')
    return {
      atrasados: pendentes
        .filter((r) => r.dataPrevista < hoje)
        .sort((a, b) => a.dataPrevista.localeCompare(b.dataPrevista)),
      abertos: pendentes
        .filter((r) => r.dataPrevista >= hoje)
        .sort((a, b) => a.dataPrevista.localeCompare(b.dataPrevista)),
      recebidos: recebimentos
        .filter((r) => r.status === 'RECEBIDO')
        .sort((a, b) => (b.dataRecebimento ?? '').localeCompare(a.dataRecebimento ?? '')),
      totais: {
        aReceber: pendentes.reduce((t, r) => t + r.valorPrevisto, 0),
        atrasado: pendentes
          .filter((r) => r.dataPrevista < hoje)
          .reduce((t, r) => t + r.valorPrevisto, 0),
      },
    }
  }, [recebimentos, hoje])

  if (carregando || !perfil) return null

  return (
    <div className="space-y-4 animate-fade-up">
      <button onClick={() => setCriando(true)} className="btn-ghost w-full">
        <Plus size={18} /> Lançar um recebimento
      </button>

      {recebimentos.length === 0 ? (
        <EstadoVazio
          icone={<Wallet size={34} />}
          titulo="Nada a receber cadastrado"
          descricao="Ao cadastrar uma feira, informe quando a contratante te paga. As parcelas aparecem aqui e o app avisa no dia."
        />
      ) : (
        <>
          <div
            className="p-5 rounded-3xl text-white shadow-lift"
            style={{ backgroundImage: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}
          >
            <div className="text-[13px] font-semibold uppercase tracking-wider text-white/75">
              Você tem a receber
            </div>
            <div className="tnum text-[clamp(28px,9vw,38px)] font-extrabold leading-none mt-1 whitespace-nowrap">
              {moeda(totais.aReceber)}
            </div>
            {totais.atrasado > 0 && (
              <div className="text-[13.5px] text-white/85 mt-1.5">
                {moeda(totais.atrasado)} já passou da data
              </div>
            )}
          </div>

          <Grupo titulo="Passou da data" itens={atrasados} aoRegistrar={setRegistrando} alerta />
          <Grupo titulo="Vem por aí" itens={abertos} aoRegistrar={setRegistrando} />
          <Grupo titulo="Já caiu" itens={recebidos.slice(0, 15)} aoRegistrar={setRegistrando} />
        </>
      )}

      {registrando && (
        <RegistrarRecebimento
          empresaId={perfil.empresaId}
          parcela={registrando}
          aoFechar={() => setRegistrando(null)}
        />
      )}

      {criando && (
        <NovoRecebimento empresaId={perfil.empresaId} aoFechar={() => setCriando(false)} />
      )}
    </div>
  )
}

function Grupo({
  titulo,
  itens,
  aoRegistrar,
  alerta,
}: {
  titulo: string
  itens: Recebimento[]
  aoRegistrar: (r: Recebimento) => void
  alerta?: boolean
}) {
  if (itens.length === 0) return null
  return (
    <section>
      <h2
        className={cn(
          'px-1 pb-2 text-[13px] font-bold uppercase tracking-wide',
          alerta ? 'text-custo' : 'text-faint',
        )}
      >
        {titulo}
      </h2>
      <div className="space-y-2.5">
        {itens.map((r) => (
          <Cartao key={r.id} parcela={r} aoRegistrar={() => aoRegistrar(r)} />
        ))}
      </div>
    </section>
  )
}

function Cartao({ parcela, aoRegistrar }: { parcela: Recebimento; aoRegistrar: () => void }) {
  const recebido = parcela.status === 'RECEBIDO'
  const atrasado = !recebido && parcela.dataPrevista < hojeISO()

  return (
    <div className={cn('card p-4', recebido && 'opacity-70')}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[15.5px] truncate">{parcela.feiraNome}</div>
          <div className="text-[13px] text-muted truncate">{parcela.descricao}</div>
          <div className={cn('text-[12.5px] mt-1', atrasado ? 'text-custo font-semibold' : 'text-faint')}>
            {recebido && parcela.dataRecebimento
              ? `Caiu em ${dataPorExtenso(parcela.dataRecebimento)}`
              : `Previsto para ${dataPorExtenso(parcela.dataPrevista)} · ${distanciaDeHoje(parcela.dataPrevista)}`}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className={cn('tnum text-[18px] font-extrabold', recebido ? 'text-lucro' : 'text-ink')}>
            {moeda(recebido ? parcela.valorRecebido : parcela.valorPrevisto)}
          </div>
          {parcela.status === 'PARCIAL' && (
            <div className="text-[11px] font-bold uppercase tracking-wide text-alerta">parcial</div>
          )}
        </div>
      </div>

      {!recebido && (
        <button onClick={aoRegistrar} className="btn-primary w-full h-12 mt-3.5 text-[14.5px]">
          <Check size={18} /> Registrar recebimento
        </button>
      )}
    </div>
  )
}

/* --------------------------- Registrar recebimento --------------------------- */

/**
 * O que caiu de verdade.
 *
 * O caso que o empreiteiro descreveu: o financeiro liga dizendo que só vai
 * pagar uma parte agora e o resto depois. Então a pergunta não é "recebeu?",
 * é "quanto caiu?" — e o saldo vira automaticamente uma nova parcela, com a
 * data que ele acertou, para não sumir do controle.
 */
function RegistrarRecebimento({
  empresaId,
  parcela,
  aoFechar,
}: {
  empresaId: string
  parcela: Recebimento
  aoFechar: () => void
}) {
  const toast = useToast()
  const [modo, setModo] = useState<'INTEGRAL' | 'PARCIAL'>('INTEGRAL')
  const [valor, setValor] = useState(parcela.valorPrevisto)
  const [data, setData] = useState(hojeISO())
  const [dataDoResto, setDataDoResto] = useState(somarDias(hojeISO(), 15))
  const [observacao, setObservacao] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const efetivo = modo === 'INTEGRAL' ? parcela.valorPrevisto : valor
  const resto = Math.max(0, parcela.valorPrevisto - efetivo)

  async function confirmar() {
    setOcupado(true)
    try {
      const { resto: sobrou } = await registrarRecebimento(empresaId, parcela, {
        valorRecebido: efetivo,
        data,
        dataDoResto: resto > 0 ? dataDoResto : null,
        observacao: observacao.trim() || null,
      })
      toast(
        sobrou > 0
          ? `Registrado! ${moeda(sobrou)} viraram uma nova parcela.`
          : 'Recebimento registrado!',
      )
      aoFechar()
    } catch {
      toast('Não deu para registrar. Tente de novo.', 'erro')
      setOcupado(false)
    }
  }

  async function remover() {
    if (!window.confirm('Apagar essa parcela?')) return
    setOcupado(true)
    try {
      await apagarRecebimento(empresaId, parcela.id)
      toast('Parcela apagada')
      aoFechar()
    } catch {
      toast('Não deu certo.', 'erro')
      setOcupado(false)
    }
  }

  return (
    <Sheet
      aberto
      aoFechar={aoFechar}
      titulo="Quanto caiu na conta?"
      subtitulo={`${parcela.feiraNome} · ${parcela.descricao}`}
      rodape={
        <button onClick={confirmar} disabled={ocupado || efetivo <= 0} className="btn-primary w-full">
          {ocupado ? <Loader2 size={20} className="animate-spin" /> : 'Confirmar'}
        </button>
      }
    >
      <div className="space-y-5">
        <div className="p-4 rounded-2xl bg-raised text-center">
          <div className="text-[12.5px] font-bold text-faint uppercase tracking-wide">
            Era para cair
          </div>
          <div className="tnum text-[28px] font-extrabold mt-0.5">
            {moeda(parcela.valorPrevisto)}
          </div>
        </div>

        <Selecao
          opcoes={[
            { valor: 'INTEGRAL', rotulo: 'Caiu tudo', descricao: 'Valor cheio', emoji: '✅' },
            { valor: 'PARCIAL', rotulo: 'Caiu só parte', descricao: 'Pagaram menos', emoji: '⚠️' },
          ]}
          valor={modo}
          onChange={(v) => setModo(v as 'INTEGRAL' | 'PARCIAL')}
        />

        {modo === 'PARCIAL' && (
          <div className="space-y-4 animate-fade-up">
            <CampoDinheiro rotulo="Quanto caiu" valor={valor} onChange={setValor} grande autoFocus />

            {resto > 0 && (
              <>
                <div className="p-4 rounded-2xl bg-alerta-soft border border-alerta/20 flex items-start gap-2.5">
                  <AlertTriangle size={19} className="shrink-0 text-alerta mt-0.5" />
                  <div className="text-[13.5px] leading-relaxed">
                    <strong className="text-ink">Faltam {moeda(resto)}.</strong>{' '}
                    <span className="text-muted">
                      O app cria uma parcela nova com esse valor, para você não perder de vista.
                    </span>
                  </div>
                </div>
                <Campo
                  rotulo="Quando prometeram o resto"
                  type="date"
                  value={dataDoResto}
                  onChange={(e) => setDataDoResto(e.target.value)}
                />
              </>
            )}
          </div>
        )}

        <Campo rotulo="Dia que caiu" type="date" value={data} onChange={(e) => setData(e.target.value)} />

        <Campo
          rotulo="Anotação (opcional)"
          placeholder="Ex.: financeiro pediu prazo"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />

        <button onClick={remover} disabled={ocupado} className="btn w-full bg-custo-soft text-custo">
          <Trash2 size={18} /> Apagar essa parcela
        </button>
      </div>
    </Sheet>
  )
}

/* ---------------------------- Recebimento avulso ---------------------------- */

function NovoRecebimento({ empresaId, aoFechar }: { empresaId: string; aoFechar: () => void }) {
  const toast = useToast()
  const { dados: feiras } = useFeiras()
  const [feiraId, setFeiraId] = useState<string | null>(feiras[0]?.id ?? null)
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState(0)
  const [data, setData] = useState(somarDias(hojeISO(), 15))
  const [ocupado, setOcupado] = useState(false)

  async function salvar() {
    const feira = feiras.find((f) => f.id === feiraId)
    if (!feira || valor <= 0) return
    setOcupado(true)
    try {
      await salvarRecebimento(empresaId, {
        feiraId: feira.id,
        feiraNome: feira.nome,
        contratanteNome: feira.contratanteNome,
        descricao: descricao.trim() || 'Pagamento',
        valorPrevisto: valor,
        dataPrevista: data,
        status: 'PREVISTO',
        valorRecebido: 0,
        dataRecebimento: null,
        observacao: null,
        origemParcial: null,
      })
      toast('Recebimento lançado!')
      aoFechar()
    } catch {
      toast('Não deu para salvar.', 'erro')
      setOcupado(false)
    }
  }

  return (
    <Sheet
      aberto
      aoFechar={aoFechar}
      titulo="Lançar recebimento"
      subtitulo="Uma parcela que a contratante te deve"
      alturaTotal
      rodape={
        <button onClick={salvar} disabled={ocupado || !feiraId || valor <= 0} className="btn-primary w-full">
          {ocupado ? <Loader2 size={20} className="animate-spin" /> : 'Lançar'}
        </button>
      }
    >
      <div className="space-y-5">
        {feiras.length === 0 ? (
          <p className="py-8 text-center text-[15px] text-muted">
            Cadastre uma feira primeiro.
          </p>
        ) : (
          <>
            <CampoDinheiro rotulo="Quanto você vai receber" valor={valor} onChange={setValor} grande autoFocus />
            <Selecao
              rotulo="De qual feira"
              opcoes={feiras.slice(0, 12).map((f) => ({ valor: f.id, rotulo: f.nome }))}
              valor={feiraId}
              onChange={setFeiraId}
              colunas={1}
            />
            <Campo
              rotulo="Descrição"
              placeholder="Ex.: Entrada, Saldo, Parcela 2"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
            <Campo
              rotulo="Data prevista"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </>
        )}
      </div>
    </Sheet>
  )
}
