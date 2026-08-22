import { cn } from '@/lib/cn'
import { moeda } from '@/lib/format'
import type { Centavos } from '@/types'

interface Props {
  valor: Centavos
  /** Colore automaticamente: verde para positivo, vermelho para negativo. */
  semaforo?: boolean
  tamanho?: 'sm' | 'md' | 'lg' | 'xl' | 'hero'
  className?: string
  sinal?: boolean
}

const TAMANHOS = {
  sm: 'text-[14px]',
  md: 'text-[17px]',
  lg: 'text-[22px]',
  xl: 'text-[30px]',
  hero: 'text-[40px] leading-none',
}

export function Dinheiro({ valor, semaforo, tamanho = 'md', className, sinal }: Props) {
  const cor = semaforo ? (valor < 0 ? 'text-custo' : valor > 0 ? 'text-lucro' : 'text-muted') : undefined
  const prefixo = sinal && valor > 0 ? '+' : ''
  return (
    <span className={cn('tnum font-bold', TAMANHOS[tamanho], cor, className)}>
      {prefixo}
      {moeda(valor)}
    </span>
  )
}
