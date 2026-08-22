import { useMemo, useState } from 'react'
import { Check, HandCoins, Loader2, Plus, X } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Campo, CampoDinheiro, Selecao } from '@/components/ui/Campo'
import { Avatar } from '@/components/ui/Avatar'
import { EstadoVazio } from '@/components/ui/Estados'
import { useToast } from '@/components/app/Toast'
import { useColaboradores, useVales } from '@/hooks/useDados'
import { useIndice } from '@/hooks/useColecao'
import { criarVale, responderVale } from '@/lib/acoes'
import { cn } from '@/lib/cn'
import { hojeISO, moeda, nomeCurto } from '@/lib/format'
import type { Vale } from '@/types'

/**
 * Vale/adiantamento.
 *
 * É universal no ramo: o cara pede R$ 100 na quarta e desconta no acerto de
 * sexta. Sem isso, a conta do pagamento sai errada e o app perde a confiança
 * na primeira semana.
 */
export function PainelVales({ empresaId }: { empresaId: string }) {
  const { dados: vales, carregando } = useVales()
  const { dados: equipe } = useColaboradores(false)
  const indice = useIndice(equipe)
  const [criando, setCriando] = useState(false)

  const { pendentes, abertos, historico } = useMemo(
    () => ({
      pendentes: vales.filter((v) => v.status === 'SOLICITADO'),
      abertos: vales.filter((v) => v.status === 'APROVADO' && !v.pagamentoId),
      historico: vales.filter((v) => v.status === 'DESCONTADO' || v.status === 'NEGADO'),
    }),
    [vales],
  )

  if (carregando) return null

  return (
    <div className="space-y-4 animate-fade-up">
      <button onClick={() => setCriando(true)} className="btn-primary w-full">
        <Plus size={19} /> Lançar vale
      </button>

      {vales.length === 0 ? (
        <EstadoVazio
          icone={<HandCoins size={34} />}
          titulo="Nenhum vale ainda"
          descricao="Quando você adiantar dinheiro para alguém, lance aqui. O app desconta sozinho no acerto."
        />
      ) : (
        <>
          {pendentes.length > 0 && (
            <Secao titulo="Pedidos esperando você">
              {pendentes.map((v) => (
                <CartaoVale
                  key={v.id}
                  vale={v}
                  fotoUrl={indice[v.colaboradorId]?.fotoUrl}
                  empresaId={empresaId}
                  decidir
                />
              ))}
            </Secao>
          )}

          {abertos.length > 0 && (
            <Secao titulo="Vão descontar no próximo acerto">
              {abertos.map((v) => (
                <CartaoVale key={v.id} vale={v} fotoUrl={indice[v.colaboradorId]?.fotoUrl} empresaId={empresaId} />
              ))}
            </Secao>
          )}

          {historico.length > 0 && (
            <Secao titulo="Já resolvidos">
              {historico.map((v) => (
                <CartaoVale
                  key={v.id}
                  vale={v}
                  fotoUrl={indice[v.colaboradorId]?.fotoUrl}
                  empresaId={empresaId}
                  apagado
                />
              ))}
            </Secao>
          )}
        </>
      )}

      {criando && <FormVale empresaId={empresaId} aoFechar={() => setCriando(false)} />}
    </div>
  )
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="px-1 pb-2 text-[13px] font-bold text-faint uppercase tracking-wide">{titulo}</h2>
      <div className="space-y-2.5">{children}</div>
    </section>
  )
}

function CartaoVale({
  vale,
  fotoUrl,
  empresaId,
  decidir,
  apagado,
}: {
  vale: Vale
  fotoUrl?: string | null
  empresaId: string
  decidir?: boolean
  apagado?: boolean
}) {
  const toast = useToast()
  const [ocupado, setOcupado] = useState(false)

  async function responder(status: 'APROVADO' | 'NEGADO') {
    setOcupado(true)
    try {
      await responderVale(empresaId, vale.id, status)
      toast(status === 'APROVADO' ? 'Vale aprovado' : 'Pedido negado')
    } catch {
      toast('Não deu certo. Tente de novo.', 'erro')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className={cn('card p-4', apagado && 'opacity-60')}>
      <div className="flex items-center gap-3.5">
        <Avatar nome={vale.colaboradorNome} fotoUrl={fotoUrl} tamanho="md" />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[15.5px] truncate">{vale.colaboradorNome}</div>
          <div className="text-[13px] text-muted truncate">
            {new Date(vale.data + 'T12:00').toLocaleDateString('pt-BR')}
            {vale.observacao && ` · ${vale.observacao}`}
          </div>
        </div>
        <div className="tnum text-[18px] font-extrabold text-alerta shrink-0">
          {moeda(vale.valor)}
        </div>
      </div>

      {decidir && (
        <div className="grid grid-cols-2 gap-2.5 mt-3.5">
          <button
            onClick={() => responder('NEGADO')}
            disabled={ocupado}
            className="btn h-12 bg-custo-soft text-custo"
          >
            <X size={18} /> Negar
          </button>
          <button
            onClick={() => responder('APROVADO')}
            disabled={ocupado}
            className="btn h-12 bg-lucro text-white"
          >
            {ocupado ? <Loader2 size={18} className="animate-spin" /> : <><Check size={18} /> Aprovar</>}
          </button>
        </div>
      )}

      {vale.status === 'DESCONTADO' && (
        <div className="mt-2.5 text-[12.5px] font-semibold text-lucro">
          Já descontado em um acerto
        </div>
      )}
      {vale.status === 'NEGADO' && (
        <div className="mt-2.5 text-[12.5px] font-semibold text-custo">Pedido negado</div>
      )}
    </div>
  )
}

function FormVale({ empresaId, aoFechar }: { empresaId: string; aoFechar: () => void }) {
  const toast = useToast()
  const { dados: equipe } = useColaboradores()
  const [colaboradorId, setColaboradorId] = useState<string | null>(null)
  const [valor, setValor] = useState(0)
  const [observacao, setObservacao] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function salvar() {
    if (!colaboradorId) {
      setErro('Escolha quem recebeu o vale')
      return
    }
    if (valor <= 0) {
      setErro('Quanto você adiantou?')
      return
    }
    const pessoa = equipe.find((p) => p.id === colaboradorId)
    if (!pessoa) return

    setOcupado(true)
    try {
      await criarVale(empresaId, {
        colaboradorId,
        colaboradorNome: nomeCurto(pessoa.nome, pessoa.apelido),
        feiraId: null,
        valor,
        data: hojeISO(),
        // Lançado pelo dono já nasce aprovado — ele mesmo entregou o dinheiro.
        status: 'APROVADO',
        origemPedido: 'DONO',
        observacao: observacao.trim() || null,
        pagamentoId: null,
      })
      toast('Vale lançado! Vai descontar no próximo acerto.')
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
      titulo="Lançar vale"
      subtitulo="Dinheiro adiantado, descontado no acerto"
      rodape={
        <button onClick={salvar} disabled={ocupado} className="btn-primary w-full">
          {ocupado ? <Loader2 size={20} className="animate-spin" /> : 'Lançar vale'}
        </button>
      }
    >
      <div className="space-y-5">
        <CampoDinheiro
          rotulo="Quanto você adiantou"
          valor={valor}
          onChange={(v) => {
            setValor(v)
            setErro(null)
          }}
          autoFocus
          grande
        />

        <Selecao
          rotulo="Para quem"
          opcoes={equipe.map((p) => ({
            valor: p.id,
            rotulo: nomeCurto(p.nome, p.apelido),
          }))}
          valor={colaboradorId}
          onChange={(v) => {
            setColaboradorId(v)
            setErro(null)
          }}
          colunas={2}
        />

        <Campo
          rotulo="Anotação (opcional)"
          placeholder="Ex.: pediu para o mercado"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />

        {erro && (
          <div className="px-4 py-3 rounded-2xl bg-custo-soft text-custo text-[14px] font-medium">
            {erro}
          </div>
        )}
      </div>
    </Sheet>
  )
}
