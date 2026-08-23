import { useMemo, useState } from 'react'
import {
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock,
  HandCoins,
  Loader2,
  LogOut,
  Wallet,
} from 'lucide-react'
import { doc, getDoc } from 'firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { useMeusPagamentos, useMeusVales, useMinhasDiarias, useFeiras } from '@/hooks/useDados'
import { useIndice } from '@/hooks/useColecao'
import { colColaboradores } from '@/lib/db'
import { CarregandoTela, EstadoVazio } from '@/components/ui/Estados'
import { Avatar } from '@/components/ui/Avatar'
import { Sheet } from '@/components/ui/Sheet'
import { CampoDinheiro, Campo, Selecao } from '@/components/ui/Campo'
import { useToast } from '@/components/app/Toast'
import { cn } from '@/lib/cn'
import { valorDaDiaria, dataPrevistaPagamento } from '@/lib/calc'
import { criarVale, salvarColaborador } from '@/lib/acoes'
import { validarChavePix } from '@/lib/pix'
import { dataPorExtenso, distanciaDeHoje, hojeISO, moeda } from '@/lib/format'
import type { Colaborador, Diaria, TipoChavePix } from '@/types'
import { useEffect } from 'react'

const TIPOS_CHAVE: { valor: TipoChavePix; rotulo: string; emoji: string }[] = [
  { valor: 'TELEFONE', rotulo: 'Celular', emoji: '📱' },
  { valor: 'CPF', rotulo: 'CPF', emoji: '🪪' },
  { valor: 'EMAIL', rotulo: 'E-mail', emoji: '✉️' },
  { valor: 'ALEATORIA', rotulo: 'Aleatória', emoji: '🔑' },
]

/**
 * A tela do funcionário.
 *
 * Uma pergunta só: quanto eu tenho a receber e quando. Tudo mais é secundário.
 * Ele não vê o contrato da feira nem o lucro do patrão — e isso não é detalhe:
 * é a condição para o empreiteiro aceitar dar acesso à equipe.
 */
export function MinhaConta() {
  const { perfil, empresa, sair } = useAuth()
  const colaboradorId = perfil?.colaboradorId ?? null

  const { dados: diarias, carregando } = useMinhasDiarias(colaboradorId)
  const { dados: pagamentos } = useMeusPagamentos(colaboradorId)
  const { dados: vales } = useMeusVales(colaboradorId)
  const { dados: feiras } = useFeiras()
  const indiceFeiras = useIndice(feiras)

  const [ficha, setFicha] = useState<Colaborador | null>(null)
  const [pedindo, setPedindo] = useState(false)
  const [editandoDados, setEditandoDados] = useState(false)

  useEffect(() => {
    if (!perfil?.empresaId || !colaboradorId) return
    getDoc(doc(colColaboradores(perfil.empresaId), colaboradorId)).then((snap) => {
      if (snap.exists()) setFicha({ ...snap.data(), id: snap.id } as Colaborador)
    })
  }, [perfil?.empresaId, colaboradorId, editandoDados])

  const resumo = useMemo(() => {
    const trabalhadas = diarias.filter((d) => d.presenca === 'PRESENTE')
    const aReceber = trabalhadas.filter((d) => !d.pagamentoId)
    const valesAbertos = vales.filter((v) => v.status === 'APROVADO' && !v.pagamentoId)
    const bruto = aReceber.reduce((t, d) => t + valorDaDiaria(d), 0)
    const descontos = valesAbertos.reduce((t, v) => t + v.valor, 0)

    // A data mais próxima entre as feiras em que ele tem dia a receber.
    const datas = aReceber
      .map((d) => {
        const feira = indiceFeiras[d.feiraId]
        return feira ? dataPrevistaPagamento(feira, d.data) : null
      })
      .filter(Boolean)
      .sort() as string[]

    return {
      diasTrabalhados: trabalhadas.length,
      diasAReceber: aReceber.length,
      bruto,
      descontos,
      liquido: Math.max(0, bruto - descontos),
      recebido: pagamentos
        .filter((p) => p.status === 'PAGO')
        .reduce((t, p) => t + p.valorLiquido, 0),
      previsao: datas[0] ?? null,
      valePendente: vales.some((v) => v.status === 'SOLICITADO'),
    }
  }, [diarias, vales, pagamentos, indiceFeiras])

  if (!perfil) return <CarregandoTela />

  if (!colaboradorId) {
    return (
      <div className="min-h-dvh bg-canvas grid place-items-center px-6">
        <EstadoVazio
          icone={<Wallet size={34} />}
          titulo="Acesso ainda não ligado à sua ficha"
          descricao="Peça para quem te convidou gerar um link novo pela lista da equipe."
          acao={
            <button onClick={sair} className="btn-ghost w-full">
              <LogOut size={18} /> Sair
            </button>
          }
        />
      </div>
    )
  }

  const proximas = diarias
    .filter((d) => d.data >= hojeISO() && d.presenca !== 'FALTOU')
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(0, 6)

  return (
    <div className="min-h-dvh bg-canvas pb-10">
      {/* Cabeçalho */}
      <header className="safe-top px-4 pt-6 pb-2 max-w-2xl lg:max-w-3xl mx-auto flex items-center gap-3">
        <button onClick={() => setEditandoDados(true)} className="shrink-0">
          <Avatar nome={perfil.nome} fotoUrl={ficha?.fotoUrl} tamanho="md" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[13.5px] text-muted truncate">{empresa?.nome}</div>
          <h1 className="text-[20px] font-extrabold leading-tight truncate">{perfil.nome}</h1>
        </div>
        <button
          onClick={sair}
          className="shrink-0 w-11 h-11 grid place-items-center rounded-full text-muted hover:bg-raised transition"
          aria-label="Sair"
        >
          <LogOut size={19} />
        </button>
      </header>

      <main className="max-w-2xl lg:max-w-3xl mx-auto px-4 space-y-4">
        {carregando ? (
          <CarregandoTela />
        ) : (
          <>
            {/* O número que ele abriu o app para ver */}
            <div
              className="p-6 rounded-3xl text-white shadow-lift"
              style={{ backgroundImage: 'linear-gradient(140deg, #059669 0%, #047857 100%)' }}
            >
              <div className="text-[13px] font-semibold uppercase tracking-wider text-white/75">
                Você tem a receber
              </div>
              <div className="tnum text-[clamp(30px,10vw,44px)] font-extrabold leading-none mt-1.5 whitespace-nowrap">
                {moeda(resumo.liquido)}
              </div>
              <div className="text-[14px] text-white/85 mt-2">
                {resumo.diasAReceber} {resumo.diasAReceber === 1 ? 'dia trabalhado' : 'dias trabalhados'}
                {resumo.descontos > 0 && ` · vale de ${moeda(resumo.descontos)} descontado`}
              </div>

              {resumo.previsao && (
                <div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-2">
                  <Clock size={17} className="shrink-0 text-white/80" />
                  <span className="text-[14.5px]">
                    Previsto para <strong>{dataPorExtenso(resumo.previsao)}</strong>{' '}
                    <span className="text-white/70">({distanciaDeHoje(resumo.previsao)})</span>
                  </span>
                </div>
              )}
            </div>

            {/* Pedir adiantamento */}
            <button
              onClick={() => setPedindo(true)}
              disabled={resumo.valePendente}
              className="btn-primary w-full"
            >
              <HandCoins size={19} />
              {resumo.valePendente ? 'Pedido enviado, aguarde' : 'Pedir adiantamento'}
            </button>

            {/* Números do trabalho */}
            <div className="grid grid-cols-2 gap-2.5">
              <Caixa rotulo="Dias trabalhados" valor={String(resumo.diasTrabalhados)} />
              <Caixa rotulo="Já recebido" valor={moeda(resumo.recebido)} tom="lucro" />
            </div>

            {/* Próximos dias */}
            <section className="card overflow-hidden">
              <div className="px-4 py-3.5 border-b border-line flex items-center gap-2">
                <CalendarDays size={17} className="text-muted" />
                <span className="font-bold text-[15px]">Seus próximos dias</span>
              </div>
              {proximas.length === 0 ? (
                <p className="p-5 text-center text-[14.5px] text-muted">
                  Nenhum dia marcado por enquanto.
                </p>
              ) : (
                <div className="divide-y divide-line">
                  {proximas.map((d) => (
                    <LinhaDia key={d.id} diaria={d} feiraNome={indiceFeiras[d.feiraId]?.nome} />
                  ))}
                </div>
              )}
            </section>

            {/* Recebimentos */}
            {pagamentos.length > 0 && (
              <section className="card overflow-hidden">
                <div className="px-4 py-3.5 border-b border-line flex items-center gap-2">
                  <CheckCircle2 size={17} className="text-muted" />
                  <span className="font-bold text-[15px]">O que você já recebeu</span>
                </div>
                <div className="divide-y divide-line">
                  {[...pagamentos]
                    .sort((a, b) => (b.dataPagamento ?? '').localeCompare(a.dataPagamento ?? ''))
                    .slice(0, 10)
                    .map((p) => (
                      <div key={p.id} className="p-3.5 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-[15px] truncate">
                            {p.feiraNome ?? 'Acerto'}
                          </div>
                          <div className="text-[13px] text-muted">
                            {p.dataPagamento
                              ? new Date(p.dataPagamento + 'T12:00').toLocaleDateString('pt-BR')
                              : 'sem data'}
                          </div>
                        </div>
                        <span className="tnum text-[16px] font-bold text-lucro shrink-0">
                          {moeda(p.valorLiquido)}
                        </span>
                      </div>
                    ))}
                </div>
              </section>
            )}

            <button
              onClick={() => setEditandoDados(true)}
              className="btn-ghost w-full"
            >
              <Camera size={18} /> Minha foto e minha chave PIX
            </button>

            <p className="text-center text-[12.5px] text-faint leading-relaxed px-4">
              Conferir sua própria chave PIX evita erro no pagamento. Só você e{' '}
              {empresa?.nome ?? 'seu chefe'} veem esses dados.
            </p>
          </>
        )}
      </main>

      {pedindo && ficha && (
        <PedirAdiantamento
          empresaId={perfil.empresaId}
          colaboradorId={colaboradorId}
          nome={perfil.nome}
          aoFechar={() => setPedindo(false)}
        />
      )}

      {editandoDados && ficha && (
        <MeusDados
          empresaId={perfil.empresaId}
          ficha={ficha}
          aoFechar={() => setEditandoDados(false)}
        />
      )}
    </div>
  )
}

function Caixa({ rotulo, valor, tom }: { rotulo: string; valor: string; tom?: 'lucro' }) {
  return (
    <div className="card p-3.5">
      <div className="text-[11.5px] font-bold text-faint uppercase tracking-wide">{rotulo}</div>
      <div className={cn('tnum text-[19px] font-extrabold mt-1', tom === 'lucro' && 'text-lucro')}>
        {valor}
      </div>
    </div>
  )
}

function LinhaDia({ diaria, feiraNome }: { diaria: Diaria; feiraNome?: string }) {
  const hoje = diaria.data === hojeISO()
  return (
    <div className="p-3.5 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[15px]">{dataPorExtenso(diaria.data)}</span>
          {hoje && (
            <span className="px-2 py-0.5 rounded-lg bg-brand text-white text-[10.5px] font-bold uppercase tracking-wide">
              Hoje
            </span>
          )}
        </div>
        <div className="text-[13px] text-muted truncate">{feiraNome ?? 'Feira'}</div>
      </div>
      <span className="tnum text-[15.5px] font-bold shrink-0">{moeda(valorDaDiaria(diaria))}</span>
    </div>
  )
}

/* --------------------------- Pedir adiantamento --------------------------- */

function PedirAdiantamento({
  empresaId,
  colaboradorId,
  nome,
  aoFechar,
}: {
  empresaId: string
  colaboradorId: string
  nome: string
  aoFechar: () => void
}) {
  const toast = useToast()
  const [valor, setValor] = useState(0)
  const [motivo, setMotivo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function enviar() {
    if (valor <= 0) {
      setErro('Quanto você precisa?')
      return
    }
    setOcupado(true)
    try {
      await criarVale(empresaId, {
        colaboradorId,
        colaboradorNome: nome,
        feiraId: null,
        valor,
        data: hojeISO(),
        status: 'SOLICITADO',
        origemPedido: 'COLABORADOR',
        observacao: motivo.trim() || null,
        pagamentoId: null,
      })
      toast('Pedido enviado! Aguarde a resposta.')
      aoFechar()
    } catch {
      toast('Não deu para enviar. Tente de novo.', 'erro')
      setOcupado(false)
    }
  }

  return (
    <Sheet
      aberto
      aoFechar={aoFechar}
      titulo="Pedir adiantamento"
      subtitulo="O valor será descontado no acerto"
      rodape={
        <button onClick={enviar} disabled={ocupado} className="btn-primary w-full">
          {ocupado ? <Loader2 size={20} className="animate-spin" /> : 'Enviar pedido'}
        </button>
      }
    >
      <div className="space-y-5">
        <CampoDinheiro
          rotulo="Quanto você precisa"
          valor={valor}
          onChange={(v) => {
            setValor(v)
            setErro(null)
          }}
          erro={erro}
          autoFocus
          grande
        />
        <Campo
          rotulo="Para quê (opcional)"
          placeholder="Ex.: remédio, mercado"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
        <p className="text-[13px] text-muted leading-relaxed">
          Quem decide é o seu chefe. Se ele aprovar, o valor sai do que você tem a receber no
          próximo acerto.
        </p>
      </div>
    </Sheet>
  )
}

/* ------------------------------- Meus dados ------------------------------- */

function MeusDados({
  empresaId,
  ficha,
  aoFechar,
}: {
  empresaId: string
  ficha: Colaborador
  aoFechar: () => void
}) {
  const toast = useToast()
  const [tipoChave, setTipoChave] = useState<TipoChavePix | null>(ficha.chavePixTipo)
  const [chave, setChave] = useState(ficha.chavePix ?? '')
  const [telefone, setTelefone] = useState(ficha.telefone ?? '')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function salvar() {
    if (chave.trim() && tipoChave) {
      const problema = validarChavePix(chave, tipoChave)
      if (problema) {
        setErro(problema)
        return
      }
    }
    setOcupado(true)
    try {
      await salvarColaborador(
        empresaId,
        {
          ...ficha,
          telefone: telefone.replace(/\D/g, '') || null,
          chavePixTipo: chave.trim() ? tipoChave : null,
          chavePix: chave.trim() || null,
        },
        ficha.id,
      )
      toast('Dados salvos!')
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
      titulo="Meus dados"
      subtitulo="Confira sua chave PIX"
      rodape={
        <button onClick={salvar} disabled={ocupado} className="btn-primary w-full">
          {ocupado ? <Loader2 size={20} className="animate-spin" /> : 'Salvar'}
        </button>
      }
    >
      <div className="space-y-5">
        <div className="flex justify-center py-1">
          <Avatar nome={ficha.nome} fotoUrl={ficha.fotoUrl} tamanho="xl" />
        </div>

        <Campo
          rotulo="Seu celular"
          type="tel"
          inputMode="tel"
          placeholder="(11) 99999-9999"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
        />

        <div>
          <h3 className="text-[15px] font-bold mb-1">Sua chave PIX</h3>
          <p className="text-[13px] text-muted mb-4 leading-relaxed">
            É para esta chave que o pagamento vai. Confira com atenção.
          </p>
          <div className="space-y-4">
            <Selecao opcoes={TIPOS_CHAVE} valor={tipoChave} onChange={setTipoChave} colunas={4} />
            <Campo
              placeholder="Cole ou digite sua chave"
              value={chave}
              onChange={(e) => {
                setChave(e.target.value)
                setErro(null)
              }}
              erro={erro}
            />
          </div>
        </div>
      </div>
    </Sheet>
  )
}
