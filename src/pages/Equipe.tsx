import { useMemo, useState } from 'react'
import { Plus, Search, UserPlus, Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useColaboradores } from '@/hooks/useDados'
import { BarraTopo, EspacoBarra } from '@/components/app/Navegacao'
import { Avatar } from '@/components/ui/Avatar'
import { CarregandoLista, EstadoVazio } from '@/components/ui/Estados'
import { moeda, nomeCurto, telefoneFormatado } from '@/lib/format'
import { FichaColaborador } from './FichaColaborador'
import type { Colaborador } from '@/types'

export function Equipe() {
  const { perfil } = useAuth()
  const { dados: colaboradores, carregando } = useColaboradores(false)
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState<Colaborador | 'novo' | null>(null)

  const { ativos, inativos } = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const filtrados = termo
      ? colaboradores.filter(
          (c) =>
            c.nome.toLowerCase().includes(termo) ||
            (c.apelido ?? '').toLowerCase().includes(termo) ||
            (c.funcao ?? '').toLowerCase().includes(termo),
        )
      : colaboradores
    return {
      ativos: filtrados.filter((c) => c.ativo),
      inativos: filtrados.filter((c) => !c.ativo),
    }
  }, [colaboradores, busca])

  return (
    <>
      <BarraTopo
        titulo="Minha equipe"
        subtitulo={`${colaboradores.filter((c) => c.ativo).length} pessoas`}
        acao={
          <button
            onClick={() => setEditando('novo')}
            className="shrink-0 w-11 h-11 grid place-items-center rounded-full bg-brand text-white active:scale-95 transition"
            aria-label="Adicionar pessoa"
          >
            <Plus size={22} />
          </button>
        }
      />

      <main className="max-w-2xl lg:max-w-3xl mx-auto px-4 pt-4">
        {colaboradores.length > 4 && (
          <div className="relative mb-4">
            <Search size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Procurar pessoa"
              className="field pl-12"
            />
          </div>
        )}

        {carregando ? (
          <CarregandoLista linhas={4} />
        ) : colaboradores.length === 0 ? (
          <EstadoVazio
            icone={<Users size={34} />}
            titulo="Cadastre sua equipe"
            descricao="Coloque aqui todo mundo que trabalha com você. Depois é só escolher quem vai para cada feira."
            acao={
              <button onClick={() => setEditando('novo')} className="btn-primary w-full">
                <UserPlus size={19} /> Cadastrar primeira pessoa
              </button>
            }
          />
        ) : (
          <div className="space-y-2.5">
            {ativos.map((c) => (
              <CartaoPessoa key={c.id} colaborador={c} aoTocar={() => setEditando(c)} />
            ))}

            {inativos.length > 0 && (
              <>
                <h2 className="pt-6 pb-1 text-[13px] font-bold text-faint uppercase tracking-wide">
                  Fora da equipe
                </h2>
                {inativos.map((c) => (
                  <CartaoPessoa key={c.id} colaborador={c} aoTocar={() => setEditando(c)} apagado />
                ))}
              </>
            )}
          </div>
        )}

        <EspacoBarra />
      </main>

      {editando && perfil && (
        <FichaColaborador
          empresaId={perfil.empresaId}
          colaborador={editando === 'novo' ? null : editando}
          aoFechar={() => setEditando(null)}
        />
      )}
    </>
  )
}

function CartaoPessoa({
  colaborador,
  aoTocar,
  apagado,
}: {
  colaborador: Colaborador
  aoTocar: () => void
  apagado?: boolean
}) {
  return (
    <button
      onClick={aoTocar}
      className={`w-full card p-4 flex items-center gap-3.5 text-left active:scale-[.99] transition ${
        apagado ? 'opacity-55' : ''
      }`}
    >
      <Avatar nome={colaborador.nome} fotoUrl={colaborador.fotoUrl} tamanho="md" />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[16px] truncate">
          {nomeCurto(colaborador.nome, colaborador.apelido)}
          {colaborador.apelido && (
            <span className="ml-1.5 font-normal text-[13px] text-faint truncate">
              {colaborador.nome.split(' ')[0]}
            </span>
          )}
        </div>
        <div className="text-[13px] text-muted truncate">
          {colaborador.funcao || 'Sem função'}
          {colaborador.telefone && ` · ${telefoneFormatado(colaborador.telefone)}`}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="tnum text-[15px] font-bold">{moeda(colaborador.diariaPadrao)}</div>
        <div className="text-[11px] text-faint uppercase tracking-wide">por dia</div>
      </div>
    </button>
  )
}
