import { useState } from 'react'
import { Check, Copy, Link2, Loader2, Share2 } from 'lucide-react'
import { useToast } from '@/components/app/Toast'
import { criarConvite } from '@/lib/acoes'

interface Props {
  empresaId: string
  empresaNome: string
  papel: 'ENCARREGADO' | 'COLABORADOR'
  colaboradorId?: string | null
  colaboradorNome?: string | null
  /** Nome de quem vai receber, para montar a mensagem do WhatsApp. */
  destinatario: string
}

function montarLink(codigo: string) {
  return `${window.location.origin}/convite/${codigo}`
}

/**
 * Gera e compartilha o link de acesso.
 *
 * O caminho real é o WhatsApp: o empreiteiro manda o link, a pessoa abre e
 * entra com a conta Google do próprio celular. Copiar o código é o plano B
 * para quando o compartilhamento nativo não existe.
 */
export function ConviteAcesso({
  empresaId,
  empresaNome,
  papel,
  colaboradorId,
  colaboradorNome,
  destinatario,
}: Props) {
  const toast = useToast()
  const [codigo, setCodigo] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [copiado, setCopiado] = useState(false)

  async function gerar() {
    setOcupado(true)
    try {
      const novo = await criarConvite({
        empresaId,
        empresaNome,
        papel,
        colaboradorId,
        colaboradorNome,
      })
      setCodigo(novo)
      await compartilhar(novo)
    } catch {
      toast('Não deu para gerar o convite.', 'erro')
    } finally {
      setOcupado(false)
    }
  }

  async function compartilhar(cod: string) {
    const primeiro = destinatario.split(' ')[0]
    const texto =
      papel === 'COLABORADOR'
        ? `Oi ${primeiro}! Aqui você acompanha seus dias trabalhados e o quanto tem a receber na ${empresaNome}:\n\n${montarLink(cod)}\n\nÉ só abrir e entrar com sua conta Google.`
        : `Oi ${primeiro}! Você foi liberado como encarregado da ${empresaNome}. Acesse por aqui:\n\n${montarLink(cod)}`

    if (navigator.share) {
      try {
        await navigator.share({ text: texto })
        return
      } catch {
        /* cancelou */
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
  }

  async function copiar(cod: string) {
    try {
      await navigator.clipboard.writeText(montarLink(cod))
      setCopiado(true)
      toast('Link copiado!')
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      toast('Não deu para copiar', 'erro')
    }
  }

  if (!codigo) {
    return (
      <button onClick={gerar} disabled={ocupado} className="btn-ghost w-full">
        {ocupado ? (
          <Loader2 size={19} className="animate-spin" />
        ) : (
          <>
            <Link2 size={18} /> Dar acesso ao app
          </>
        )}
      </button>
    )
  }

  return (
    <div className="p-4 rounded-2xl bg-lucro-soft border border-lucro/20 space-y-3 animate-fade-up">
      <div className="text-[14px] font-bold text-lucro">Link criado!</div>
      <p className="text-[13px] text-muted leading-relaxed">
        Mande para {destinatario.split(' ')[0]} no WhatsApp. O link vale uma vez só.
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        <button onClick={() => compartilhar(codigo)} className="btn-primary h-12 text-[14.5px]">
          <Share2 size={17} /> Enviar
        </button>
        <button onClick={() => copiar(codigo)} className="btn-ghost h-12 text-[14.5px]">
          {copiado ? <Check size={17} /> : <Copy size={17} />}
          {copiado ? 'Copiado' : 'Copiar'}
        </button>
      </div>
    </div>
  )
}
