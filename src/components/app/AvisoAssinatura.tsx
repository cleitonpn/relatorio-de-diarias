import { AlertTriangle, Clock } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { mostraCobranca } from '@/lib/platform'

/**
 * Faixa de aviso do teste grátis / assinatura.
 *
 * No build Android ela some: a política do Google Play trata como "steering"
 * qualquer chamada para pagar fora do app.
 */
export function AvisoAssinatura() {
  const { empresa } = useAuth()
  if (!empresa) return null

  const { status, fimTeste } = empresa.assinatura

  if (status === 'TESTE' && fimTeste) {
    const diasRestantes = Math.ceil(
      (fimTeste.toDate().getTime() - Date.now()) / 86_400_000,
    )
    // Só incomoda na última semana — antes disso, deixa a pessoa usar em paz.
    if (diasRestantes > 7 || diasRestantes < 0) return null
    return (
      <Faixa tom="alerta" icone={<Clock size={17} />}>
        {diasRestantes <= 0
          ? 'Seu teste grátis terminou.'
          : `Faltam ${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'} do seu teste grátis.`}
        {mostraCobranca && ' Assine para continuar lançando.'}
      </Faixa>
    )
  }

  if (status === 'SOMENTE_LEITURA') {
    return (
      <Faixa tom="custo" icone={<AlertTriangle size={17} />}>
        Assinatura inativa. Você continua vendo tudo, mas não dá para lançar coisa nova.
        {!mostraCobranca && ' Fale com o suporte.'}
      </Faixa>
    )
  }

  if (status === 'PENDENTE') {
    return (
      <Faixa tom="alerta" icone={<AlertTriangle size={17} />}>
        Não conseguimos cobrar sua assinatura. Você tem alguns dias para regularizar.
      </Faixa>
    )
  }

  return null
}

function Faixa({
  tom,
  icone,
  children,
}: {
  tom: 'alerta' | 'custo'
  icone: React.ReactNode
  children: React.ReactNode
}) {
  const cores =
    tom === 'alerta' ? 'bg-alerta-soft text-alerta' : 'bg-custo-soft text-custo'
  return (
    <div className={`${cores} px-4 py-2.5 safe-top`}>
      <div className="max-w-2xl mx-auto flex items-center gap-2 text-[13.5px] font-semibold leading-snug">
        <span className="shrink-0">{icone}</span>
        <span>{children}</span>
      </div>
    </div>
  )
}
