import { NavLink, useNavigate } from 'react-router-dom'
import { ArrowLeft, CalendarDays, HandCoins, Home, Settings, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/* --------------------------------- Topo --------------------------------- */

export function BarraTopo({
  titulo,
  subtitulo,
  voltarPara,
  acao,
}: {
  titulo: string
  subtitulo?: string
  voltarPara?: string | number
  acao?: ReactNode
}) {
  const navigate = useNavigate()
  return (
    <header className="sticky top-0 z-30 bg-canvas/85 backdrop-blur-xl border-b border-line/70 safe-top">
      <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-3">
        {voltarPara !== undefined && (
          <button
            onClick={() => (typeof voltarPara === 'number' ? navigate(voltarPara) : navigate(voltarPara))}
            className="shrink-0 -ml-2 w-11 h-11 grid place-items-center rounded-full text-ink hover:bg-raised transition active:scale-95"
            aria-label="Voltar"
          >
            <ArrowLeft size={22} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-[19px] font-bold leading-tight truncate">{titulo}</h1>
          {subtitulo && <p className="text-[13px] text-muted truncate">{subtitulo}</p>}
        </div>
        {acao}
      </div>
    </header>
  )
}

/* ------------------------------ Barra inferior ----------------------------- */

const ABAS = [
  { para: '/', rotulo: 'Hoje', Icone: Home },
  { para: '/feiras', rotulo: 'Feiras', Icone: CalendarDays },
  { para: '/equipe', rotulo: 'Equipe', Icone: Users },
  { para: '/pagamentos', rotulo: 'Pagar', Icone: HandCoins },
  { para: '/ajustes', rotulo: 'Ajustes', Icone: Settings },
]

export function BarraInferior({ aviso }: { aviso?: number }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur-xl border-t border-line safe-bottom">
      <div className="max-w-2xl mx-auto grid grid-cols-5">
        {ABAS.map(({ para, rotulo, Icone }) => (
          <NavLink
            key={para}
            to={para}
            end={para === '/'}
            className={({ isActive }) =>
              cn(
                'relative flex flex-col items-center justify-center gap-1 h-[68px] transition',
                isActive ? 'text-brand' : 'text-faint',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className="relative">
                  <Icone size={23} strokeWidth={isActive ? 2.5 : 2} />
                  {para === '/pagamentos' && !!aviso && aviso > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-custo text-white text-[11px] font-bold grid place-items-center">
                      {aviso > 9 ? '9+' : aviso}
                    </span>
                  )}
                </span>
                <span className={cn('text-[11px]', isActive ? 'font-bold' : 'font-medium')}>{rotulo}</span>
                {isActive && (
                  <span className="absolute top-0 w-8 h-[3px] rounded-b-full bg-brand" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

/** Espaço para o conteúdo não ficar embaixo da barra. */
export function EspacoBarra() {
  return <div className="h-[84px]" aria-hidden />
}
