import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Campo, CampoDinheiro, Selecao } from '@/components/ui/Campo'
import { useToast } from '@/components/app/Toast'
import { apagarCusto, salvarCusto } from '@/lib/acoes'
import { hojeISO } from '@/lib/format'
import { CATEGORIAS_CUSTO, type CategoriaCusto, type Custo } from '@/types'
import { useFluxo } from '@/hooks/useTelemetria'

interface Props {
  empresaId: string
  feiraId: string
  custo: Custo | null
  aoFechar: () => void
}

export function FormCusto({ empresaId, feiraId, custo, aoFechar }: Props) {
  // Mede quem abre este formulário e sai sem terminar.
  const concluir = useFluxo('novo_custo')
  const toast = useToast()
  const novo = !custo

  const [categoria, setCategoria] = useState<CategoriaCusto>(custo?.categoria ?? 'COMBUSTIVEL')
  const [valor, setValor] = useState(custo?.valor ?? 0)
  const [descricao, setDescricao] = useState(custo?.descricao ?? '')
  const [data, setData] = useState(custo?.data ?? hojeISO())
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function salvar() {
    if (valor <= 0) {
      setErro('Quanto você gastou?')
      return
    }
    setOcupado(true)
    try {
      await salvarCusto(
        empresaId,
        {
          feiraId,
          standId: custo?.standId ?? null,
          categoria,
          descricao: descricao.trim() || null,
          valor,
          data,
          comprovanteUrl: custo?.comprovanteUrl ?? null,
        },
        custo?.id,
      )
      toast(novo ? 'Gasto lançado!' : 'Gasto atualizado!')
      concluir()
      aoFechar()
    } catch {
      toast('Não deu para salvar. Tente de novo.', 'erro')
      setOcupado(false)
    }
  }

  async function remover() {
    if (!custo) return
    setOcupado(true)
    try {
      await apagarCusto(empresaId, custo.id)
      toast('Gasto apagado')
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
      titulo={novo ? 'Novo gasto' : 'Editar gasto'}
      subtitulo={novo ? 'O que saiu do seu bolso nessa feira' : undefined}
      rodape={
        <button onClick={salvar} disabled={ocupado} className="btn-primary w-full">
          {ocupado ? <Loader2 size={20} className="animate-spin" /> : 'Salvar gasto'}
        </button>
      }
    >
      <div className="space-y-5">
        <CampoDinheiro
          rotulo="Quanto foi"
          valor={valor}
          onChange={(v) => {
            setValor(v)
            setErro(null)
          }}
          erro={erro}
          autoFocus={novo}
          grande
        />

        <Selecao<CategoriaCusto>
          rotulo="Com o quê"
          opcoes={CATEGORIAS_CUSTO.map((c) => ({
            valor: c.valor,
            rotulo: c.rotulo,
            emoji: c.emoji,
          }))}
          valor={categoria}
          onChange={setCategoria}
          colunas={2}
        />

        <Campo
          rotulo="Anotação (opcional)"
          placeholder="Ex.: gasolina da van"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />

        <Campo rotulo="Dia" type="date" value={data} onChange={(e) => setData(e.target.value)} />

        {!novo && (
          <button onClick={remover} disabled={ocupado} className="btn w-full bg-custo-soft text-custo">
            <Trash2 size={18} /> Apagar gasto
          </button>
        )}
      </div>
    </Sheet>
  )
}
