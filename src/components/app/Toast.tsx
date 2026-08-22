import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

type Tipo = 'ok' | 'erro' | 'info'
interface Aviso {
  id: number
  tipo: Tipo
  texto: string
}

const Ctx = createContext<(texto: string, tipo?: Tipo) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([])

  const mostrar = useCallback((texto: string, tipo: Tipo = 'ok') => {
    const id = Date.now() + Math.random()
    setAvisos((a) => [...a, { id, tipo, texto }])
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), 3200)
  }, [])

  return (
    <Ctx.Provider value={mostrar}>
      {children}
      {createPortal(
        <div className="fixed top-0 inset-x-0 z-[60] flex flex-col items-center gap-2 p-4 pointer-events-none safe-top">
          {avisos.map((a) => (
            <div
              key={a.id}
              className={cn(
                'flex items-center gap-2.5 max-w-md w-fit px-4 py-3 rounded-2xl shadow-lift',
                'text-[15px] font-semibold animate-fade-up text-white',
                a.tipo === 'ok' && 'bg-lucro',
                a.tipo === 'erro' && 'bg-custo',
                a.tipo === 'info' && 'bg-brand-deep',
              )}
            >
              {a.tipo === 'ok' && <CheckCircle2 size={20} />}
              {a.tipo === 'erro' && <XCircle size={20} />}
              {a.tipo === 'info' && <Info size={20} />}
              <span>{a.texto}</span>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </Ctx.Provider>
  )
}

export function useToast() {
  return useContext(Ctx)
}
