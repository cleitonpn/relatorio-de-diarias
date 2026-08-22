import { cn } from '@/lib/cn'
import { corDoNome, iniciais } from '@/lib/format'

interface Props {
  nome: string
  fotoUrl?: string | null
  tamanho?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  anel?: boolean
}

const TAMANHOS = {
  sm: 'w-9 h-9 text-[12px]',
  md: 'w-12 h-12 text-[15px]',
  lg: 'w-16 h-16 text-[20px]',
  xl: 'w-24 h-24 text-[30px]',
}

/** Reconhecer rosto é mais rápido que ler nome — por isso foto vem primeiro. */
export function Avatar({ nome, fotoUrl, tamanho = 'md', className, anel }: Props) {
  const base = cn(
    'shrink-0 rounded-full grid place-items-center font-bold text-white overflow-hidden select-none',
    TAMANHOS[tamanho],
    anel && 'ring-2 ring-surface',
    className,
  )

  if (fotoUrl) {
    return <img src={fotoUrl} alt={nome} className={cn(base, 'object-cover')} loading="lazy" />
  }

  return (
    <div className={cn(base, corDoNome(nome))} aria-label={nome}>
      {iniciais(nome)}
    </div>
  )
}
