import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarDays, ChevronRight, MapPin, Plus, Package } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useFeiras } from '@/hooks/useDados'
import { BarraTopo, EspacoBarra } from '@/components/app/Navegacao'
import { CarregandoLista, EstadoVazio } from '@/components/ui/Estados'
import { hojeISO, periodo } from '@/lib/format'
import { FormFeira } from './FormFeira'
import type { Feira } from '@/types'

export function Feiras() {
  const navigate = useNavigate()
  const { perfil } = useAuth()
  const { dados: feiras, carregando } = useFeiras()
  const [criando, setCriando] = useState(false)

  const { emAndamento, futuras, passadas } = useMemo(() => {
    const hoje = hojeISO()
    return {
      emAndamento: feiras.filter((f) => !f.encerrada && f.dataInicio <= hoje && f.dataFim >= hoje),
      futuras: feiras.filter((f) => !f.encerrada && f.dataInicio > hoje),
      passadas: feiras.filter((f) => f.encerrada || f.dataFim < hoje),
    }
  }, [feiras])

  return (
    <>
      <BarraTopo
        titulo="Minhas feiras"
        subtitulo={`${feiras.length} ${feiras.length === 1 ? 'feira' : 'feiras'}`}
        acao={
          <button
            onClick={() => setCriando(true)}
            className="shrink-0 w-11 h-11 grid place-items-center rounded-full bg-brand text-white active:scale-95 transition"
            aria-label="Nova feira"
          >
            <Plus size={22} />
          </button>
        }
      />

      <main className="max-w-2xl lg:max-w-3xl mx-auto px-4 pt-4">
        {carregando ? (
          <CarregandoLista linhas={3} />
        ) : feiras.length === 0 ? (
          <EstadoVazio
            icone={<CalendarDays size={34} />}
            titulo="Cadastre sua primeira feira"
            descricao="Coloque o nome da feira, as datas e quanto você vai receber. O app cuida do resto."
            acao={
              <button onClick={() => setCriando(true)} className="btn-primary w-full">
                <Plus size={19} /> Nova feira
              </button>
            }
          />
        ) : (
          <div className="space-y-6">
            <Grupo titulo="Acontecendo agora" feiras={emAndamento} destaque />
            <Grupo titulo="Vem aí" feiras={futuras} />
            <Grupo titulo="Já passaram" feiras={passadas} />
          </div>
        )}

        <EspacoBarra />
      </main>

      {criando && perfil && (
        <FormFeira
          empresaId={perfil.empresaId}
          feira={null}
          aoFechar={() => setCriando(false)}
          aoCriar={(feiraId, modo) =>
            navigate(`/feiras/${feiraId}?comecar=${modo === 'PACOTE' ? 'equipe' : 'stands'}`)
          }
        />
      )}
    </>
  )
}

function Grupo({ titulo, feiras, destaque }: { titulo: string; feiras: Feira[]; destaque?: boolean }) {
  if (feiras.length === 0) return null
  return (
    <section>
      <h2 className="px-1 pb-2.5 text-[13px] font-bold text-faint uppercase tracking-wide">
        {titulo}
      </h2>
      <div className="space-y-2.5">
        {feiras.map((f) => (
          <CartaoFeira key={f.id} feira={f} destaque={destaque} />
        ))}
      </div>
    </section>
  )
}

function CartaoFeira({ feira, destaque }: { feira: Feira; destaque?: boolean }) {
  return (
    <Link
      to={`/feiras/${feira.id}`}
      className={`block card p-4 active:scale-[.99] transition ${
        destaque ? 'ring-2 ring-brand/30' : ''
      } ${feira.encerrada ? 'opacity-65' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`shrink-0 w-12 h-12 rounded-2xl grid place-items-center ${
            destaque ? 'bg-brand text-white' : 'bg-brand-soft text-brand-ink'
          }`}
        >
          {feira.modo === 'PACOTE' ? <Package size={22} /> : <CalendarDays size={22} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-bold text-[16.5px] leading-tight truncate">{feira.nome}</div>
          <div className="mt-0.5 text-[13.5px] text-muted truncate">
            {periodo(feira.dataInicio, feira.dataFim)}
          </div>
          {(feira.local || feira.contratanteNome) && (
            <div className="mt-1 flex items-center gap-1 text-[12.5px] text-faint truncate">
              <MapPin size={13} className="shrink-0" />
              {[feira.local, feira.contratanteNome].filter(Boolean).join(' · ')}
            </div>
          )}
          {feira.modo === 'PACOTE' && (
            <span className="inline-block mt-2 px-2.5 py-1 rounded-lg bg-raised text-[11.5px] font-bold text-muted uppercase tracking-wide">
              Pacote fechado
              {feira.pacoteQtdStands ? ` · ${feira.pacoteQtdStands} stands` : ''}
            </span>
          )}
        </div>

        <ChevronRight size={20} className="shrink-0 text-faint mt-3" />
      </div>
    </Link>
  )
}
