import { useState } from 'react'
import { CalendarPlus, Loader2, Trash2 } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Campo, Selecao } from '@/components/ui/Campo'
import { useToast } from '@/components/app/Toast'
import { AvisoPerigo } from './Admin'
import {
  ajustarAssinatura,
  estenderTeste,
  excluirConta,
  type ResumoConta,
} from '@/lib/admin'
import { PLANOS } from '@/lib/planos'
import { moeda } from '@/lib/format'
import type { PlanoId, StatusAssinatura } from '@/types'

const STATUS: { valor: StatusAssinatura; rotulo: string }[] = [
  { valor: 'TESTE', rotulo: 'Teste' },
  { valor: 'ATIVA', rotulo: 'Ativa' },
  { valor: 'PENDENTE', rotulo: 'Pendente' },
  { valor: 'SOMENTE_LEITURA', rotulo: 'Bloqueada' },
  { valor: 'PAUSADA', rotulo: 'Pausada' },
  { valor: 'CANCELADA', rotulo: 'Cancelada' },
]

interface Props {
  conta: ResumoConta
  aoFechar: () => void
  aoMudar: () => Promise<void>
}

export function FichaConta({ conta, aoFechar, aoMudar }: Props) {
  const toast = useToast()
  const { empresa, usuarios } = conta
  const assinatura = empresa.assinatura

  const [plano, setPlano] = useState<PlanoId>(assinatura.plano)
  const [status, setStatus] = useState<StatusAssinatura>(assinatura.status)
  const [desconto, setDesconto] = useState(String(assinatura.descontoPercentual ?? ''))
  const [motivo, setMotivo] = useState(assinatura.descontoMotivo ?? '')
  const [vitalicio, setVitalicio] = useState(!assinatura.descontoAte)
  const [ocupado, setOcupado] = useState(false)

  const [confirmacao, setConfirmacao] = useState('')
  const [excluindo, setExcluindo] = useState(false)
  const [progresso, setProgresso] = useState<string | null>(null)

  const dono = usuarios.find((u) => u.papel === 'DONO')
  const podeExcluir = confirmacao.trim().toLowerCase() === empresa.nome.trim().toLowerCase()

  async function salvar() {
    setOcupado(true)
    try {
      const percentual = desconto.trim() ? Number(desconto) : null
      const validade = new Date()
      validade.setMonth(validade.getMonth() + 1)

      await ajustarAssinatura(empresa.id, assinatura, {
        plano,
        status,
        descontoPercentual: percentual,
        descontoMotivo: percentual ? motivo.trim() || 'Ajuste manual' : null,
        descontoAte: percentual && !vitalicio ? validade : null,
      })
      toast('Conta atualizada!')
      await aoMudar()
    } catch {
      toast('Não deu para salvar.', 'erro')
      setOcupado(false)
    }
  }

  async function maisDias(dias: number) {
    setOcupado(true)
    try {
      await estenderTeste(empresa.id, assinatura, dias)
      toast(`Teste estendido por ${dias} dias`)
      await aoMudar()
    } catch {
      toast('Não deu certo.', 'erro')
      setOcupado(false)
    }
  }

  /** Atalho para o combinado com o beta tester: Solo grátis para sempre. */
  async function betaTester() {
    setOcupado(true)
    try {
      await ajustarAssinatura(empresa.id, assinatura, {
        plano: 'SOLO',
        status: 'ATIVA',
        descontoPercentual: 100,
        descontoMotivo: 'Beta tester — cortesia vitalícia no Solo',
        descontoAte: null,
        fimTeste: null,
      })
      toast('Cortesia vitalícia aplicada!')
      await aoMudar()
    } catch {
      toast('Não deu certo.', 'erro')
      setOcupado(false)
    }
  }

  async function apagar() {
    if (!podeExcluir) return
    setExcluindo(true)
    try {
      const total = await excluirConta(empresa.id, (p) =>
        setProgresso(`apagando ${p.colecao}… (${p.apagados})`),
      )
      toast(`Conta excluída — ${total} registros apagados`)
      await aoMudar()
    } catch {
      toast('Não deu para excluir. Tente de novo.', 'erro')
      setExcluindo(false)
      setProgresso(null)
    }
  }

  return (
    <Sheet
      aberto
      aoFechar={aoFechar}
      titulo={empresa.nome}
      subtitulo={dono?.email ?? empresa.cidade ?? undefined}
      alturaTotal
      rodape={
        <button onClick={salvar} disabled={ocupado || excluindo} className="btn-primary w-full">
          {ocupado ? <Loader2 size={20} className="animate-spin" /> : 'Salvar alterações'}
        </button>
      }
    >
      <div className="space-y-6">
        {/* Retrato da conta */}
        <div className="card p-4 space-y-2 text-[13.5px]">
          <Linha rotulo="Código de indicação" valor={empresa.codigoIndicacao} />
          {empresa.indicadaPor && <Linha rotulo="Indicada por" valor={empresa.indicadaPor} />}
          <Linha rotulo="Ramo" valor={empresa.ramo ?? '—'} />
          <Linha rotulo="Pessoas com acesso" valor={String(usuarios.length)} />
          <Linha rotulo="Paga hoje" valor={moeda(conta.precoEfetivo)} />
          {conta.diasRestantesTeste !== null && (
            <Linha
              rotulo="Teste"
              valor={
                conta.diasRestantesTeste > 0
                  ? `${conta.diasRestantesTeste} dias restantes`
                  : 'expirado'
              }
            />
          )}
        </div>

        {/* Atalhos */}
        <div>
          <span className="label">Atalhos</span>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => maisDias(15)} disabled={ocupado} className="btn-ghost h-12 text-[14px]">
              <CalendarPlus size={17} /> +15 dias
            </button>
            <button onClick={() => maisDias(30)} disabled={ocupado} className="btn-ghost h-12 text-[14px]">
              <CalendarPlus size={17} /> +30 dias
            </button>
          </div>
          <button
            onClick={betaTester}
            disabled={ocupado}
            className="btn w-full h-12 mt-2 bg-lucro-soft text-lucro text-[14px]"
          >
            Cortesia vitalícia (beta tester)
          </button>
        </div>

        <Selecao<PlanoId>
          rotulo="Plano"
          opcoes={PLANOS.map((p) => ({ valor: p.id, rotulo: p.nome, descricao: moeda(p.precoMensal) }))}
          valor={plano}
          onChange={setPlano}
          colunas={2}
        />

        <Selecao<StatusAssinatura>
          rotulo="Situação"
          opcoes={STATUS}
          valor={status}
          onChange={setStatus}
          colunas={3}
        />

        <div className="space-y-3">
          <Campo
            rotulo="Desconto"
            type="number"
            inputMode="numeric"
            placeholder="0"
            sufixo="%"
            value={desconto}
            onChange={(e) => setDesconto(e.target.value)}
            dica="Vazio = sem desconto. 100 = cortesia total."
          />
          {!!desconto.trim() && (
            <>
              <Campo
                rotulo="Motivo do desconto"
                placeholder="Ex.: indicação, beta tester, promoção"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
              <Selecao
                rotulo="Duração"
                opcoes={[
                  { valor: 'sim', rotulo: 'Vitalício', descricao: 'Para sempre' },
                  { valor: 'nao', rotulo: '1 mês', descricao: 'Só na próxima' },
                ]}
                valor={vitalicio ? 'sim' : 'nao'}
                onChange={(v) => setVitalicio(v === 'sim')}
              />
            </>
          )}
        </div>

        {/* Exclusão */}
        <div className="pt-4 border-t border-line space-y-3">
          <h3 className="text-[15px] font-bold text-custo">Excluir esta conta</h3>

          <AvisoPerigo>
            Apaga a empresa, a equipe, as feiras, as diárias, os gastos e os pagamentos.
            <strong className="block mt-1">Não tem como desfazer.</strong>
          </AvisoPerigo>

          <Campo
            rotulo={`Digite "${empresa.nome}" para liberar`}
            placeholder={empresa.nome}
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
          />

          {progresso && (
            <div className="text-[13px] text-muted tnum">{progresso}</div>
          )}

          <button
            onClick={apagar}
            disabled={!podeExcluir || excluindo}
            className="btn w-full bg-custo text-white disabled:bg-custo-soft disabled:text-custo"
          >
            {excluindo ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <Trash2 size={18} /> Excluir conta para sempre
              </>
            )}
          </button>
        </div>
      </div>
    </Sheet>
  )
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{rotulo}</span>
      <span className="font-semibold text-right truncate">{valor}</span>
    </div>
  )
}
