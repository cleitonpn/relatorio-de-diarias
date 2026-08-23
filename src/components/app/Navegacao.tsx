import { NavLink, useNavigate } from 'react-router-dom'
import { ArrowLeft, CalendarDays, HandCoins, Home, Settings, Users, Wallet } from 'lucide-react'
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
      <div className="max-w-2xl lg:max-w-3xl mx-auto px-4 h-16 flex items-center gap-3">
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

/**
 * Cinco abas é o limite do polegar. "Meu dinheiro" entrou no lugar de Ajustes,
 * que virou a engrenagem no topo — configuração se mexe uma vez, o resultado
 * ele quer ver toda semana.
 */
const ABAS = [
  { para: '/', rotulo: 'Hoje', Icone: Home },
  { para: '/feiras', rotulo: 'Feiras', Icone: CalendarDays },
  { para: '/dinheiro', rotulo: 'Dinheiro', Icone: Wallet },
  { para: '/equipe', rotulo: 'Equipe', Icone: Users },
  { para: '/pagamentos', rotulo: 'Pagar', Icone: HandCoins },
]

export function BarraInferior({ aviso, veFinanceiro = true }: { aviso?: number; veFinanceiro?: boolean }) {
  const abas = veFinanceiro ? ABAS : ABAS.filter((a) => a.para !== '/dinheiro')
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur-xl border-t border-line safe-bottom">
      <div
        className={cn(
          'max-w-2xl lg:max-w-3xl mx-auto grid',
          abas.length === 5 ? 'grid-cols-5' : 'grid-cols-4',
        )}
      >
        {abas.map(({ para, rotulo, Icone }) => (
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
  return <div className="h-[84px] lg:h-10" aria-hidden />
}

/* ------------------------------ Menu lateral ------------------------------ */

const ABAS_DESKTOP = [
  ...ABAS,
  { para: '/ajustes', rotulo: 'Ajustes', Icone: Settings },
]

/**
 * Em tela grande a barra de baixo não faz sentido: o polegar não está lá.
 * O mesmo conjunto de destinos vira um menu lateral fixo, com espaço para o
 * rótulo por extenso.
 */
export function MenuLateral({ veFinanceiro = true }: { veFinanceiro?: boolean }) {
  const abas = veFinanceiro
    ? ABAS_DESKTOP
    : ABAS_DESKTOP.filter((a) => a.para !== '/dinheiro')
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-line bg-surface z-40">
      <div className="px-6 py-6 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-2xl grid place-items-center"
          style={{ backgroundImage: 'linear-gradient(135deg, #6366F1 0%, #312E81 100%)' }}
        >
          <svg viewBox="0 0 64 64" className="w-6 h-6">
            <path d="M18 42V26l14-8 14 8v16" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M26 42v-9h12v9" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="text-[19px] font-extrabold">Empreita</span>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {abas.map(({ para, rotulo, Icone }) => (
          <NavLink
            key={para}
            to={para}
            end={para === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 h-12 px-3.5 rounded-2xl text-[15px] font-semibold transition',
                isActive ? 'bg-brand-soft text-brand-ink' : 'text-muted hover:bg-raised',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icone size={21} strokeWidth={isActive ? 2.5 : 2} />
                {rotulo}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
