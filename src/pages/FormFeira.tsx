import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Campo, CampoDinheiro, Selecao } from '@/components/ui/Campo'
import { useToast } from '@/components/app/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useContratantes } from '@/hooks/useDados'
import { criarContratante, salvarFeira } from '@/lib/acoes'
import { hojeISO, somarDias } from '@/lib/format'
import { POLITICAS, type Feira, type ModoFeira, type PoliticaPagamento } from '@/types'

interface Props {
  empresaId: string
  feira: Feira | null
  aoFechar: () => void
}

export function FormFeira({ empresaId, feira, aoFechar }: Props) {
  const toast = useToast()
  const { empresa } = useAuth()
  const { dados: contratantes } = useContratantes()
  const novo = !feira

  const [nome, setNome] = useState(feira?.nome ?? '')
  const [local, setLocal] = useState(feira?.local ?? '')
  const [contratante, setContratante] = useState(feira?.contratanteNome ?? '')
  const [dataInicio, setDataInicio] = useState(feira?.dataInicio ?? hojeISO())
  const [dataFim, setDataFim] = useState(feira?.dataFim ?? somarDias(hojeISO(), 3))
  const [modo, setModo] = useState<ModoFeira>(feira?.modo ?? 'POR_STAND')
  const [pacoteValor, setPacoteValor] = useState(feira?.pacoteValor ?? 0)
  const [pacoteM2, setPacoteM2] = useState(String(feira?.pacoteM2 ?? ''))
  const [pacoteStands, setPacoteStands] = useState(String(feira?.pacoteQtdStands ?? ''))
  const [politica, setPolitica] = useState<PoliticaPagamento>(
    feira?.politicaPagamento ?? 'FIM_FEIRA',
  )
  const [almoco, setAlmoco] = useState(feira?.almocoPorPessoaDia ?? empresa?.almocoPadrao ?? 2500)
  const [ocupado, setOcupado] = useState(false)
  const [erros, setErros] = useState<Record<string, string>>({})

  function validar(): boolean {
    const e: Record<string, string> = {}
    if (nome.trim().length < 2) e.nome = 'Escreva o nome da feira'
    if (dataFim < dataInicio) e.dataFim = 'A data de fim é antes do começo'
    if (modo === 'PACOTE' && pacoteValor <= 0) e.pacoteValor = 'Quanto você vai receber pelo pacote?'
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

      await salvarFeira(
        empresaId,
        {
          nome: nome.trim(),
          local: local.trim() || null,
          cidade: empresa?.cidade ?? null,
          contratanteId,
          contratanteNome: nomeContratante || null,
          dataInicio,
          dataFim,
          modo,
          pacoteValor: modo === 'PACOTE' ? pacoteValor : null,
          pacoteM2: modo === 'PACOTE' ? Number(pacoteM2) || null : null,
          pacoteQtdStands: modo === 'PACOTE' ? Number(pacoteStands) || null : null,
          politicaPagamento: politica,
          dataPagamentoFixa: feira?.dataPagamentoFixa ?? null,
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
      toast(novo ? 'Feira cadastrada!' : 'Feira atualizada!')
      aoFechar()
    } catch {
      toast('Não deu para salvar. Tente de novo.', 'erro')
      setOcupado(false)
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

        <div className="grid grid-cols-2 gap-3">
          <Campo
            rotulo="Começa em"
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
          />
          <Campo
            rotulo="Termina em"
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            erro={erros.dataFim}
          />
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

        <CampoDinheiro
          rotulo="Almoço por pessoa, por dia"
          valor={almoco}
          onChange={setAlmoco}
          dica="Entra automático quando você marcar presença"
        />
      </div>
    </Sheet>
  )
}
