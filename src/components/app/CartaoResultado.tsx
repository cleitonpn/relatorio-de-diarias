import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/cn'
import { moeda, percentual } from '@/lib/format'
import { saudeDoResultado, TEXTO_SAUDE } from '@/lib/calc'
import type { Resultado } from '@/types'

/**
 * O cartão que responde a única pergunta que importa: quanto sobrou pra mim.
 *
 * Regra de linguagem do app inteiro: nada de "receita bruta" ou "margem de
 * contribuição". É "você recebe", "você gastou", "sobrou pra você".
 */
export function CartaoResultado({
  resultado,
  titulo = 'Sobrou pra você',
  compacto,
}: {
  resultado: Resultado
  titulo?: string
  compacto?: boolean
}) {
  const saude = saudeDoResultado(resultado.margem, resultado.receita)
  const texto = TEXTO_SAUDE[saude]
  const positivo = resultado.lucro >= 0

  // Largura da barra: proporção do que foi gasto sobre o que se recebe
  const proporcaoGasto =
    resultado.receita > 0
      ? Math.min(100, (resultado.custoTotal / resultado.receita) * 100)
      : resultado.custoTotal > 0
        ? 100
        : 0

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl text-white shadow-lift',
        compacto ? 'p-5' : 'p-6',
      )}
      style={{
        backgroundImage: positivo
          ? 'linear-gradient(140deg, #4F46E5 0%, #3730A3 55%, #312E81 100%)'
          : 'linear-gradient(140deg, #E11D48 0%, #9F1239 60%, #881337 100%)',
      }}
    >
      {/* brilho decorativo */}
      <div className="absolute -top-24 -right-16 w-56 h-56 rounded-full bg-white/10 blur-2xl" aria-hidden />
      <div className="absolute -bottom-20 -left-10 w-44 h-44 rounded-full bg-white/[0.07] blur-2xl" aria-hidden />

      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold uppercase tracking-wider text-white/75">
            {titulo}
          </span>
          <span className="text-[15px]">{texto.emoji}</span>
        </div>

        <div className="mt-1.5 flex items-end gap-2.5">
          <span className={cn('tnum font-extrabold leading-none', compacto ? 'text-[34px]' : 'text-[42px]')}>
            {moeda(resultado.lucro)}
          </span>
          {resultado.receita > 0 && (
            <span className="mb-1 flex items-center gap-1 text-[14px] font-bold text-white/80">
              {positivo ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {percentual(resultado.margem)}
            </span>
          )}
        </div>

        {!compacto && <p className="mt-1.5 text-[14px] text-white/80">{texto.frase}</p>}

        {/* Barra: quanto do que ele recebe já foi embora em custo */}
        <div className="mt-5 h-2.5 rounded-full bg-white/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-white/85 transition-all duration-700"
            style={{ width: `${proporcaoGasto}%` }}
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Bloco rotulo="Você recebe" valor={moeda(resultado.receita)} />
          <Bloco rotulo="Você gastou" valor={moeda(resultado.custoTotal)} alinharDireita />
        </div>
      </div>
    </div>
  )
}

function Bloco({
  rotulo,
  valor,
  alinharDireita,
}: {
  rotulo: string
  valor: string
  alinharDireita?: boolean
}) {
  return (
    <div className={alinharDireita ? 'text-right' : undefined}>
      <div className="text-[12px] font-medium text-white/65 uppercase tracking-wide">{rotulo}</div>
      <div className="tnum text-[18px] font-bold">{valor}</div>
    </div>
  )
}

/** Linha de detalhe do resultado, usada abaixo do cartão. */
export function LinhaDetalhe({
  rotulo,
  valor,
  emoji,
  destaque,
}: {
  rotulo: string
  valor: string
  emoji?: string
  destaque?: 'lucro' | 'custo'
}) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-line last:border-0">
      <span className="flex items-center gap-2.5 text-[15px] text-muted">
        {emoji && <span className="text-[17px]">{emoji}</span>}
        {rotulo}
      </span>
      <span
        className={cn(
          'tnum text-[16px] font-bold',
          destaque === 'lucro' && 'text-lucro',
          destaque === 'custo' && 'text-custo',
        )}
      >
        {valor}
      </span>
    </div>
  )
}
