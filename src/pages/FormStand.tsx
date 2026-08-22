import { useMemo, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Campo, CampoDinheiro, Selecao } from '@/components/ui/Campo'
import { useToast } from '@/components/app/Toast'
import { apagarStand, salvarStand } from '@/lib/acoes'
import { moeda } from '@/lib/format'
import type { Stand, TipoCobranca } from '@/types'

interface Props {
  empresaId: string
  feiraId: string
  stand: Stand | null
  aoFechar: () => void
}

export function FormStand({ empresaId, feiraId, stand, aoFechar }: Props) {
  const toast = useToast()
  const novo = !stand

  const [nome, setNome] = useState(stand?.nome ?? '')
  const [m2, setM2] = useState(String(stand?.m2 ?? ''))
  const [tipo, setTipo] = useState<TipoCobranca>(stand?.tipoCobranca ?? 'POR_M2')
  const [valorM2, setValorM2] = useState(stand?.valorM2 ?? 0)
  const [valorTotal, setValorTotal] = useState(stand?.valorTotal ?? 0)
  const [ocupado, setOcupado] = useState(false)
  const [erros, setErros] = useState<Record<string, string>>({})

  const metros = Number(m2.replace(',', '.')) || 0

  // O empreiteiro pensa dos dois jeitos — o app mostra o outro lado na hora.
  const previa = useMemo(() => {
    if (tipo === 'POR_M2') return Math.round(valorM2 * metros)
    return metros > 0 ? Math.round(valorTotal / metros) : 0
  }, [tipo, valorM2, valorTotal, metros])

  function validar(): boolean {
    const e: Record<string, string> = {}
    if (nome.trim().length < 2) e.nome = 'Escreva o nome do cliente ou do stand'
    if (metros <= 0) e.m2 = 'Quantos metros quadrados?'
    if (tipo === 'POR_M2' && valorM2 <= 0) e.valorM2 = 'Quanto você recebe por m²?'
    if (tipo === 'VALOR_FECHADO' && valorTotal <= 0) e.valorTotal = 'Quanto você recebe no total?'
    setErros(e)
    return Object.keys(e).length === 0
  }

  async function salvar() {
    if (!validar()) return
    setOcupado(true)
    try {
      await salvarStand(
        empresaId,
        {
          feiraId,
          nome: nome.trim(),
          m2: metros,
          tipoCobranca: tipo,
          valorM2: tipo === 'POR_M2' ? valorM2 : null,
          valorTotal: tipo === 'VALOR_FECHADO' ? valorTotal : null,
          contratanteId: stand?.contratanteId ?? null,
          origem: stand?.origem ?? {
            tipo: 'MANUAL',
            appOrigem: null,
            idExterno: null,
            importadoEm: null,
          },
        },
        stand?.id,
      )
      toast(novo ? 'Stand cadastrado!' : 'Stand atualizado!')
      aoFechar()
    } catch {
      toast('Não deu para salvar. Tente de novo.', 'erro')
      setOcupado(false)
    }
  }

  async function remover() {
    if (!stand) return
    setOcupado(true)
    try {
      await apagarStand(empresaId, stand.id)
      toast('Stand apagado')
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
      titulo={novo ? 'Novo stand' : 'Editar stand'}
      rodape={
        <button onClick={salvar} disabled={ocupado} className="btn-primary w-full">
          {ocupado ? <Loader2 size={20} className="animate-spin" /> : 'Salvar stand'}
        </button>
      }
    >
      <div className="space-y-5">
        <Campo
          rotulo="Cliente / nome do stand"
          placeholder="Ex.: Stand Alfa Móveis"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          erro={erros.nome}
          autoFocus={novo}
        />

        <Campo
          rotulo="Tamanho"
          type="number"
          inputMode="decimal"
          placeholder="50"
          value={m2}
          onChange={(e) => setM2(e.target.value)}
          sufixo="m²"
          erro={erros.m2}
        />

        <Selecao<TipoCobranca>
          rotulo="Como você cobrou"
          opcoes={[
            { valor: 'POR_M2', rotulo: 'Por metro', descricao: 'Preço × m²', emoji: '📐' },
            { valor: 'VALOR_FECHADO', rotulo: 'Valor fechado', descricao: 'Um preço só', emoji: '🤝' },
          ]}
          valor={tipo}
          onChange={setTipo}
        />

        {tipo === 'POR_M2' ? (
          <CampoDinheiro
            rotulo="Valor por m²"
            valor={valorM2}
            onChange={setValorM2}
            erro={erros.valorM2}
          />
        ) : (
          <CampoDinheiro
            rotulo="Valor total do contrato"
            valor={valorTotal}
            onChange={setValorTotal}
            erro={erros.valorTotal}
          />
        )}

        {metros > 0 && previa > 0 && (
          <div className="p-4 rounded-2xl bg-lucro-soft animate-fade-up">
            <div className="text-[12.5px] font-bold text-lucro uppercase tracking-wide">
              {tipo === 'POR_M2' ? 'Você vai receber' : 'Isso dá por metro'}
            </div>
            <div className="tnum text-[26px] font-extrabold text-lucro mt-0.5">
              {moeda(previa)}
              {tipo === 'VALOR_FECHADO' && <span className="text-[15px] font-bold"> / m²</span>}
            </div>
          </div>
        )}

        {!novo && (
          <button onClick={remover} disabled={ocupado} className="btn w-full bg-custo-soft text-custo">
            <Trash2 size={18} /> Apagar stand
          </button>
        )}
      </div>
    </Sheet>
  )
}
