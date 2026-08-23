import { useState } from 'react'
import { Loader2, Trash2, UserCheck } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Campo, CampoDinheiro, Selecao } from '@/components/ui/Campo'
import { Avatar } from '@/components/ui/Avatar'
import { useToast } from '@/components/app/Toast'
import { ConviteAcesso } from '@/components/app/ConviteAcesso'
import { useAuth } from '@/contexts/AuthContext'
import { desativarColaborador, reativarColaborador, salvarColaborador } from '@/lib/acoes'
import { validarChavePix } from '@/lib/pix'
import type { Colaborador, TipoChavePix } from '@/types'

function nomeCurtoDe(nome: string) {
  return nome.trim().split(' ')[0] || 'a pessoa'
}

const TIPOS_CHAVE: { valor: TipoChavePix; rotulo: string; emoji: string }[] = [
  { valor: 'TELEFONE', rotulo: 'Celular', emoji: '📱' },
  { valor: 'CPF', rotulo: 'CPF', emoji: '🪪' },
  { valor: 'EMAIL', rotulo: 'E-mail', emoji: '✉️' },
  { valor: 'ALEATORIA', rotulo: 'Aleatória', emoji: '🔑' },
]

interface Props {
  empresaId: string
  colaborador: Colaborador | null
  aoFechar: () => void
}

export function FichaColaborador({ empresaId, colaborador, aoFechar }: Props) {
  const toast = useToast()
  const { empresa } = useAuth()
  const novo = !colaborador

  const [nome, setNome] = useState(colaborador?.nome ?? '')
  const [apelido, setApelido] = useState(colaborador?.apelido ?? '')
  const [funcao, setFuncao] = useState(colaborador?.funcao ?? '')
  const [telefone, setTelefone] = useState(colaborador?.telefone ?? '')
  const [diaria, setDiaria] = useState(colaborador?.diariaPadrao ?? 0)
  const [tipoChave, setTipoChave] = useState<TipoChavePix | null>(colaborador?.chavePixTipo ?? null)
  const [chave, setChave] = useState(colaborador?.chavePix ?? '')
  const [ocupado, setOcupado] = useState(false)
  const [erros, setErros] = useState<Record<string, string>>({})

  function validar(): boolean {
    const novos: Record<string, string> = {}
    if (nome.trim().length < 2) novos.nome = 'Escreva o nome da pessoa'
    if (diaria <= 0) novos.diaria = 'Quanto essa pessoa ganha por dia?'
    if (chave.trim() && tipoChave) {
      const erro = validarChavePix(chave, tipoChave)
      if (erro) novos.chave = erro
    }
    if (chave.trim() && !tipoChave) novos.tipoChave = 'Escolha o tipo da chave'
    setErros(novos)
    return Object.keys(novos).length === 0
  }

  async function salvar() {
    if (!validar()) return
    setOcupado(true)
    try {
      await salvarColaborador(
        empresaId,
        {
          nome: nome.trim(),
          apelido: apelido.trim() || null,
          fotoUrl: colaborador?.fotoUrl ?? null,
          telefone: telefone.replace(/\D/g, '') || null,
          funcao: funcao.trim() || null,
          diariaPadrao: diaria,
          chavePixTipo: chave.trim() ? tipoChave : null,
          chavePix: chave.trim() || null,
          nomeRecebedor: colaborador?.nomeRecebedor ?? nome.trim(),
          ativo: colaborador?.ativo ?? true,
          tokenAcesso: colaborador?.tokenAcesso ?? null,
        },
        colaborador?.id,
      )
      toast(novo ? 'Pessoa cadastrada!' : 'Dados salvos!')
      aoFechar()
    } catch {
      toast('Não deu para salvar. Tente de novo.', 'erro')
      setOcupado(false)
    }
  }

  async function alternarAtivo() {
    if (!colaborador) return
    setOcupado(true)
    try {
      if (colaborador.ativo) {
        await desativarColaborador(empresaId, colaborador.id)
        toast('Pessoa saiu da equipe')
      } else {
        await reativarColaborador(empresaId, colaborador.id)
        toast('Pessoa voltou para a equipe')
      }
      aoFechar()
    } catch {
      toast('Não deu certo. Tente de novo.', 'erro')
      setOcupado(false)
    }
  }

  return (
    <Sheet
      aberto
      aoFechar={aoFechar}
      titulo={novo ? 'Nova pessoa' : nome || 'Editar pessoa'}
      subtitulo={novo ? 'Cadastre quem trabalha com você' : undefined}
      rodape={
        <button onClick={salvar} disabled={ocupado} className="btn-primary w-full">
          {ocupado ? <Loader2 size={20} className="animate-spin" /> : 'Salvar'}
        </button>
      }
    >
      <div className="space-y-5">
        {!novo && (
          <div className="flex justify-center pb-1">
            <Avatar nome={nome || 'x'} fotoUrl={colaborador?.fotoUrl} tamanho="xl" />
          </div>
        )}

        <Campo
          rotulo="Nome completo"
          placeholder="Ex.: José da Silva"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          erro={erros.nome}
          autoFocus={novo}
        />

        <Campo
          rotulo="Apelido (opcional)"
          placeholder="Ex.: Zé Baiano"
          value={apelido}
          onChange={(e) => setApelido(e.target.value)}
          dica="É esse nome que vai aparecer nas listas"
        />

        <div className="grid grid-cols-2 gap-3">
          <Campo
            rotulo="Função"
            placeholder="Ajudante"
            value={funcao}
            onChange={(e) => setFuncao(e.target.value)}
          />
          <Campo
            rotulo="Celular"
            type="tel"
            inputMode="tel"
            placeholder="(11) 99999-9999"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
          />
        </div>

        <CampoDinheiro
          rotulo="Quanto ganha por dia"
          valor={diaria}
          onChange={setDiaria}
          erro={erros.diaria}
          dica="Você pode mudar esse valor em cada feira"
        />

        <div className="pt-2 border-t border-line">
          <h3 className="text-[15px] font-bold mt-4 mb-1">Chave PIX</h3>
          <p className="text-[13px] text-muted mb-4 leading-relaxed">
            Com a chave cadastrada, o app monta o PIX copia e cola na hora de pagar. É opcional.
          </p>

          <div className="space-y-4">
            <Selecao
              opcoes={TIPOS_CHAVE}
              valor={tipoChave}
              onChange={(v) => setTipoChave(v)}
              colunas={4}
            />
            {erros.tipoChave && (
              <span className="block text-[13px] font-medium text-custo">{erros.tipoChave}</span>
            )}

            <Campo
              placeholder={
                tipoChave === 'CPF'
                  ? '000.000.000-00'
                  : tipoChave === 'TELEFONE'
                    ? '(11) 99999-9999'
                    : tipoChave === 'EMAIL'
                      ? 'pessoa@email.com'
                      : 'Cole a chave aqui'
              }
              value={chave}
              onChange={(e) => setChave(e.target.value)}
              erro={erros.chave}
              inputMode={tipoChave === 'CPF' || tipoChave === 'TELEFONE' ? 'numeric' : 'text'}
            />
          </div>
        </div>

        {!novo && colaborador && empresa && (
          <div className="pt-2 border-t border-line">
            <h3 className="text-[15px] font-bold mt-4 mb-1">Acesso ao app</h3>
            <p className="text-[13px] text-muted mb-4 leading-relaxed">
              Com o acesso, {nomeCurtoDe(nome)} vê os próprios dias e quanto tem a receber,
              confere a chave PIX e pede adiantamento. Ele não vê valores de contrato nem o
              seu lucro.
            </p>
            <ConviteAcesso
              empresaId={empresaId}
              empresaNome={empresa.nome}
              papel="COLABORADOR"
              colaboradorId={colaborador.id}
              colaboradorNome={apelido.trim() || nome}
              destinatario={nome}
            />
          </div>
        )}

        {!novo && (
          <button
            onClick={alternarAtivo}
            disabled={ocupado}
            className={`btn w-full ${
              colaborador?.ativo ? 'bg-custo-soft text-custo' : 'bg-lucro-soft text-lucro'
            }`}
          >
            {colaborador?.ativo ? (
              <>
                <Trash2 size={18} /> Tirar da equipe
              </>
            ) : (
              <>
                <UserCheck size={18} /> Colocar de volta na equipe
              </>
            )}
          </button>
        )}

        {!novo && colaborador?.ativo && (
          <p className="text-[12.5px] text-faint text-center leading-relaxed -mt-2">
            Tirar da equipe não apaga nada. O histórico de diárias e pagamentos continua guardado.
          </p>
        )}
      </div>
    </Sheet>
  )
}
