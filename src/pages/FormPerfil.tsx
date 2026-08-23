import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { updateDoc } from 'firebase/firestore'
import { Sheet } from '@/components/ui/Sheet'
import { Campo, CampoDinheiro, Selecao } from '@/components/ui/Campo'
import { useToast } from '@/components/app/Toast'
import { docEmpresa, docUsuario } from '@/lib/db'
import type { Empresa, Usuario } from '@/types'

const RAMOS = [
  { valor: 'Tapeçaria', rotulo: 'Tapeçaria', emoji: '🧵' },
  { valor: 'Marcenaria', rotulo: 'Marcenaria', emoji: '🪚' },
  { valor: 'Elétrica', rotulo: 'Elétrica', emoji: '💡' },
  { valor: 'Vidraçaria', rotulo: 'Vidraçaria', emoji: '🪟' },
  { valor: 'Serralheria', rotulo: 'Serralheria', emoji: '🔧' },
  { valor: 'Limpeza', rotulo: 'Limpeza', emoji: '🧹' },
  { valor: 'Pintura', rotulo: 'Pintura', emoji: '🎨' },
  { valor: 'Outro', rotulo: 'Outro', emoji: '📦' },
]

interface Props {
  perfil: Usuario
  empresa: Empresa
  ehDono: boolean
  aoFechar: () => void
}

/**
 * Meus dados e dados do negócio.
 *
 * O nome da pessoa é dela, não da conta Google: muito empreiteiro usa o e-mail
 * no nome da empresa, do filho, ou sem nome nenhum.
 */
export function FormPerfil({ perfil, empresa, ehDono, aoFechar }: Props) {
  const toast = useToast()

  const [nome, setNome] = useState(perfil.nome)
  const [telefone, setTelefone] = useState(perfil.telefone ?? '')
  const [nomeEmpresa, setNomeEmpresa] = useState(empresa.nome)
  const [ramo, setRamo] = useState<string | null>(empresa.ramo)
  const [cidade, setCidade] = useState(empresa.cidade ?? '')
  const [almoco, setAlmoco] = useState(empresa.almocoPadrao)
  const [valorM2, setValorM2] = useState(empresa.valorM2Padrao ?? 0)
  const [ocupado, setOcupado] = useState(false)
  const [erros, setErros] = useState<Record<string, string>>({})

  async function salvar() {
    const novos: Record<string, string> = {}
    if (nome.trim().length < 2) novos.nome = 'Escreva seu nome'
    if (ehDono && nomeEmpresa.trim().length < 2) novos.nomeEmpresa = 'Escreva o nome do negócio'
    setErros(novos)
    if (Object.keys(novos).length > 0) return

    setOcupado(true)
    try {
      await updateDoc(docUsuario(perfil.id), {
        nome: nome.trim(),
        telefone: telefone.replace(/\D/g, '') || null,
      })

      if (ehDono) {
        await updateDoc(docEmpresa(empresa.id), {
          nome: nomeEmpresa.trim(),
          ramo: ramo ?? null,
          cidade: cidade.trim() || null,
          almocoPadrao: almoco,
          valorM2Padrao: valorM2 > 0 ? valorM2 : null,
        })
      }

      toast('Dados salvos!')
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
      titulo="Meus dados"
      alturaTotal
      rodape={
        <button onClick={salvar} disabled={ocupado} className="btn-primary w-full">
          {ocupado ? <Loader2 size={20} className="animate-spin" /> : 'Salvar'}
        </button>
      }
    >
      <div className="space-y-5">
        <Campo
          rotulo="Seu nome"
          placeholder="Como você quer ser chamado"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          erro={erros.nome}
          autoComplete="name"
        />

        <Campo
          rotulo="Seu celular"
          type="tel"
          inputMode="tel"
          placeholder="(11) 99999-9999"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
        />

        {perfil.email && (
          <div className="px-4 py-3 rounded-2xl bg-raised text-[13.5px] text-muted">
            Você entra com <span className="font-semibold text-ink">{perfil.email}</span>
          </div>
        )}

        {ehDono && (
          <div className="pt-4 border-t border-line space-y-5">
            <h3 className="text-[15px] font-bold">Meu negócio</h3>

            <Campo
              rotulo="Nome do negócio"
              placeholder="Ex.: Tapeçaria do Zé"
              value={nomeEmpresa}
              onChange={(e) => setNomeEmpresa(e.target.value)}
              erro={erros.nomeEmpresa}
              dica="É o nome que aparece nos seus relatórios"
            />

            <Selecao rotulo="O que você faz" opcoes={RAMOS} valor={ramo} onChange={setRamo} colunas={2} />

            <Campo
              rotulo="Sua cidade"
              placeholder="Ex.: São Paulo"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              dica="Usada também no PIX que você gera"
            />

            <CampoDinheiro
              rotulo="Quanto você cobra por m²"
              valor={valorM2}
              onChange={setValorM2}
              dica="Seu preço de tabela. A calculadora compara as propostas com ele."
            />

            <CampoDinheiro
              rotulo="Almoço padrão por pessoa/dia"
              valor={almoco}
              onChange={setAlmoco}
              dica="Sugerido quando você cadastrar uma feira nova"
            />
          </div>
        )}
      </div>
    </Sheet>
  )
}
