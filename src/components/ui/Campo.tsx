import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { mascaraMoeda, paraCentavos } from '@/lib/format'
import type { Centavos } from '@/types'

/* ------------------------------ Campo simples ------------------------------ */

interface CampoProps extends InputHTMLAttributes<HTMLInputElement> {
  rotulo?: string
  erro?: string | null
  dica?: string
  prefixo?: ReactNode
  sufixo?: ReactNode
}

export const Campo = forwardRef<HTMLInputElement, CampoProps>(function Campo(
  { rotulo, erro, dica, prefixo, sufixo, className, ...props },
  ref,
) {
  return (
    <label className="block">
      {rotulo && <span className="label">{rotulo}</span>}
      <div className="relative flex items-center">
        {prefixo && (
          <span className="absolute left-4 text-muted font-semibold pointer-events-none">{prefixo}</span>
        )}
        <input
          ref={ref}
          className={cn(
            'field',
            prefixo && 'pl-12',
            sufixo && 'pr-14',
            erro && 'border-custo focus:border-custo focus:ring-custo/15',
            className,
          )}
          {...props}
        />
        {sufixo && <span className="absolute right-4 text-muted font-semibold">{sufixo}</span>}
      </div>
      {erro ? (
        <span className="block mt-1.5 text-[13px] font-medium text-custo">{erro}</span>
      ) : dica ? (
        <span className="block mt-1.5 text-[13px] text-faint">{dica}</span>
      ) : null}
    </label>
  )
})

/* ----------------------------- Campo de dinheiro ---------------------------- */

interface CampoDinheiroProps {
  rotulo?: string
  valor: Centavos
  onChange: (centavos: Centavos) => void
  erro?: string | null
  dica?: string
  placeholder?: string
  autoFocus?: boolean
  grande?: boolean
}

/**
 * Teclado numérico e máscara progressiva: digitando 20000 vira 200,00.
 * Quem usa isso digita com o polegar, em pé, dentro de um pavilhão.
 */
export function CampoDinheiro({
  rotulo,
  valor,
  onChange,
  erro,
  dica,
  placeholder = '0,00',
  autoFocus,
  grande,
}: CampoDinheiroProps) {
  const texto = valor > 0 ? mascaraMoeda(String(valor)) : ''

  return (
    <label className="block">
      {rotulo && <span className="label">{rotulo}</span>}
      <div className="relative flex items-center">
        <span
          className={cn(
            'absolute left-4 font-bold text-muted pointer-events-none',
            grande ? 'text-[22px]' : 'text-[17px]',
          )}
        >
          R$
        </span>
        <input
          inputMode="numeric"
          autoFocus={autoFocus}
          value={texto}
          placeholder={placeholder}
          onChange={(e) => onChange(paraCentavos(mascaraMoeda(e.target.value)))}
          className={cn(
            'field tnum font-bold pl-14',
            grande && 'h-20 text-[30px]',
            erro && 'border-custo focus:border-custo focus:ring-custo/15',
          )}
        />
      </div>
      {erro ? (
        <span className="block mt-1.5 text-[13px] font-medium text-custo">{erro}</span>
      ) : dica ? (
        <span className="block mt-1.5 text-[13px] text-faint">{dica}</span>
      ) : null}
    </label>
  )
}

/* -------------------------- Seleção em botões grandes ------------------------ */

interface OpcaoSelecao<T> {
  valor: T
  rotulo: string
  descricao?: string
  emoji?: string
}

interface SelecaoProps<T extends string | number> {
  rotulo?: string
  opcoes: OpcaoSelecao<T>[]
  valor: T | null
  onChange: (valor: T) => void
  colunas?: 1 | 2 | 3 | 4
}

/** Botão grande em vez de <select>: menos toque, menos erro, mais legível. */
export function Selecao<T extends string | number>({
  rotulo,
  opcoes,
  valor,
  onChange,
  colunas = 2,
}: SelecaoProps<T>) {
  const grid = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' }[colunas]
  return (
    <div>
      {rotulo && <span className="label">{rotulo}</span>}
      <div className={cn('grid gap-2', grid)}>
        {opcoes.map((o) => {
          const ativo = o.valor === valor
          return (
            <button
              key={String(o.valor)}
              type="button"
              onClick={() => onChange(o.valor)}
              className={cn(
                'min-h-14 px-3 py-3 rounded-2xl border-2 text-left transition active:scale-[.98]',
                ativo
                  ? 'border-brand bg-brand-soft text-brand-ink'
                  : 'border-line bg-raised text-ink hover:border-brand/40',
              )}
            >
              <span className="flex items-center gap-2">
                {o.emoji && <span className="text-[18px]">{o.emoji}</span>}
                <span className="font-semibold text-[15px] leading-tight">{o.rotulo}</span>
              </span>
              {o.descricao && (
                <span className={cn('block text-[12px] mt-0.5', ativo ? 'text-brand-ink/70' : 'text-faint')}>
                  {o.descricao}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
