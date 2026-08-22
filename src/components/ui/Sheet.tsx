import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

interface Props {
  aberto: boolean
  aoFechar: () => void
  titulo?: string
  subtitulo?: string
  children: ReactNode
  rodape?: ReactNode
  alturaTotal?: boolean
}

/**
 * Folha que sobe de baixo — o gesto que todo mundo já conhece do celular.
 * Formulário em tela cheia dá sensação de "processo"; folha dá sensação de
 * "rapidinho", que é o que a gente quer para lançar presença e custo.
 */
export function Sheet({ aberto, aoFechar, titulo, subtitulo, children, rodape, alturaTotal }: Props) {
  useEffect(() => {
    if (!aberto) return
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    window.addEventListener('keydown', onEsc)
    return () => {
      document.body.style.overflow = anterior
      window.removeEventListener('keydown', onEsc)
    }
  }, [aberto, aoFechar])

  if (!aberto) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px] animate-scale-in"
        onClick={aoFechar}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-full sm:max-w-lg bg-surface rounded-t-4xl sm:rounded-4xl shadow-lift',
          'animate-sheet-up flex flex-col',
          alturaTotal ? 'h-[92vh]' : 'max-h-[92vh]',
        )}
      >
        <div className="shrink-0 pt-3 pb-1 grid place-items-center sm:hidden">
          <div className="w-10 h-1.5 rounded-full bg-line" />
        </div>

        {(titulo || subtitulo) && (
          <div className="shrink-0 flex items-start gap-3 px-5 pt-3 pb-4">
            <div className="flex-1 min-w-0">
              {titulo && <h2 className="text-[20px] font-bold leading-tight">{titulo}</h2>}
              {subtitulo && <p className="text-[14px] text-muted mt-0.5">{subtitulo}</p>}
            </div>
            <button
              onClick={aoFechar}
              className="shrink-0 w-10 h-10 -mr-1 grid place-items-center rounded-full text-muted hover:bg-raised transition"
              aria-label="Fechar"
            >
              <X size={22} />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 pb-4">{children}</div>

        {rodape && (
          <div className="shrink-0 px-5 py-4 border-t border-line bg-surface rounded-b-4xl safe-bottom">
            {rodape}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
