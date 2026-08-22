import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Tela vazia que ensina o próximo passo em vez de só dizer "nada aqui". */
export function EstadoVazio({
  icone,
  titulo,
  descricao,
  acao,
}: {
  icone: ReactNode
  titulo: string
  descricao: string
  acao?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-14 animate-fade-up">
      <div className="w-20 h-20 rounded-3xl bg-brand-soft text-brand-ink grid place-items-center mb-5">
        {icone}
      </div>
      <h3 className="text-[19px] font-bold">{titulo}</h3>
      <p className="text-[15px] text-muted mt-1.5 max-w-xs leading-relaxed">{descricao}</p>
      {acao && <div className="mt-6 w-full max-w-xs">{acao}</div>}
    </div>
  )
}

export function Esqueleto({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-2xl bg-raised', className)}>
      <div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/5"
        style={{ animation: 'shimmer 1.4s infinite' }}
      />
    </div>
  )
}

export function CarregandoLista({ linhas = 3 }: { linhas?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: linhas }).map((_, i) => (
        <Esqueleto key={i} className="h-20" />
      ))}
    </div>
  )
}

export function CarregandoTela() {
  return (
    <div className="min-h-[60vh] grid place-items-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-[3px] border-line border-t-brand animate-spin" />
        <span className="text-[14px] text-muted">Carregando…</span>
      </div>
    </div>
  )
}
