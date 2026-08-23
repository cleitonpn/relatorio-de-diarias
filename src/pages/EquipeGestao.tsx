import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { Eye, EyeOff, HardHat, Loader2, UserMinus, UserPlus } from 'lucide-react'
import { db } from '@/lib/firebase'
import { Sheet } from '@/components/ui/Sheet'
import { Avatar } from '@/components/ui/Avatar'
import { EstadoVazio } from '@/components/ui/Estados'
import { useToast } from '@/components/app/Toast'
import { ConviteAcesso } from '@/components/app/ConviteAcesso'
import { definirAcessoFinanceiro, desativarUsuario } from '@/lib/acoes'
import { cn } from '@/lib/cn'
import type { Empresa, Usuario } from '@/types'

/**
 * Quem tem acesso de gestão: o dono e os encarregados.
 *
 * A chave do painel financeiro fica aqui de propósito. O encarregado vendo o
 * lucro por stand gera atrito real na obra ("o chefe ganhou R$ 3.000 e me
 * pagou R$ 600"), então quem decide isso é o dono, encarregado por encarregado.
 */
export function EquipeGestao({ empresa, aoFechar }: { empresa: Empresa; aoFechar: () => void }) {
  const toast = useToast()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [carregando, setCarregando] = useState(true)
  const [ocupado, setOcupado] = useState<string | null>(null)

  useEffect(() => {
    const consulta = query(collection(db, 'usuarios'), where('empresaId', '==', empresa.id))
    return onSnapshot(
      consulta,
      (snap) => {
        setUsuarios(
          snap.docs
            .map((d) => ({ ...d.data(), id: d.id }) as Usuario)
            .filter((u) => u.papel !== 'COLABORADOR')
            .sort((a, b) => (a.papel === 'DONO' ? -1 : b.papel === 'DONO' ? 1 : 0)),
        )
        setCarregando(false)
      },
      () => setCarregando(false),
    )
  }, [empresa.id])

  async function alternarFinanceiro(u: Usuario) {
    setOcupado(u.id)
    try {
      await definirAcessoFinanceiro(u.id, !u.vePainelFinanceiro)
      toast(u.vePainelFinanceiro ? 'Financeiro escondido' : 'Financeiro liberado')
    } catch {
      toast('Não deu certo.', 'erro')
    } finally {
      setOcupado(null)
    }
  }

  async function remover(u: Usuario) {
    if (!window.confirm(`Tirar o acesso de ${u.nome}?`)) return
    setOcupado(u.id)
    try {
      await desativarUsuario(u.id, false)
      toast('Acesso removido')
    } catch {
      toast('Não deu certo.', 'erro')
    } finally {
      setOcupado(null)
    }
  }

  const encarregados = usuarios.filter((u) => u.papel === 'ENCARREGADO' && u.ativo)

  return (
    <Sheet
      aberto
      aoFechar={aoFechar}
      titulo="Quem ajuda na gestão"
      subtitulo="Encarregados com acesso ao app"
      alturaTotal
    >
      <div className="space-y-5">
        {carregando ? (
          <div className="py-10 grid place-items-center">
            <Loader2 size={24} className="animate-spin text-muted" />
          </div>
        ) : (
          <>
            <div className="space-y-2.5">
              {usuarios
                .filter((u) => u.ativo)
                .map((u) => (
                  <div key={u.id} className="card p-4">
                    <div className="flex items-center gap-3.5">
                      <Avatar nome={u.nome} tamanho="md" />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[15.5px] truncate">{u.nome}</div>
                        <div className="text-[13px] text-muted truncate">
                          {u.papel === 'DONO' ? 'Dono' : 'Encarregado'}
                          {u.email && ` · ${u.email}`}
                        </div>
                      </div>
                    </div>

                    {u.papel === 'ENCARREGADO' && (
                      <div className="mt-3.5 space-y-2.5">
                        <button
                          onClick={() => alternarFinanceiro(u)}
                          disabled={ocupado === u.id}
                          className={cn(
                            'btn w-full h-12 text-[14.5px]',
                            u.vePainelFinanceiro
                              ? 'bg-lucro-soft text-lucro'
                              : 'bg-raised text-muted border border-line',
                          )}
                        >
                          {u.vePainelFinanceiro ? <Eye size={17} /> : <EyeOff size={17} />}
                          {u.vePainelFinanceiro ? 'Vê receita e lucro' : 'Não vê receita e lucro'}
                        </button>
                        <button
                          onClick={() => remover(u)}
                          disabled={ocupado === u.id}
                          className="w-full h-10 text-[13.5px] font-semibold text-custo"
                        >
                          <UserMinus size={15} className="inline mr-1.5 -mt-0.5" />
                          Tirar acesso
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>

            {encarregados.length === 0 && (
              <EstadoVazio
                icone={<HardHat size={34} />}
                titulo="Nenhum encarregado ainda"
                descricao="O encarregado marca presença e cuida da equipe na feira, sem precisar de você no celular."
              />
            )}

            <div className="pt-2 border-t border-line">
              <h3 className="text-[15px] font-bold mt-4 mb-1 flex items-center gap-2">
                <UserPlus size={18} /> Chamar um encarregado
              </h3>
              <p className="text-[13px] text-muted mb-4 leading-relaxed">
                Ele vai poder escalar equipe, marcar presença e lançar gastos. Receita e lucro
                ficam escondidos até você liberar.
              </p>
              <ConviteAcesso
                empresaId={empresa.id}
                empresaNome={empresa.nome}
                papel="ENCARREGADO"
                destinatario="seu encarregado"
              />
            </div>
          </>
        )}
      </div>
    </Sheet>
  )
}
