import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { Check, Copy, Loader2, QrCode, Share2, TriangleAlert } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Avatar } from '@/components/ui/Avatar'
import { useToast } from '@/components/app/Toast'
import { gerarPixCopiaECola, validarChavePix } from '@/lib/pix'
import { moeda } from '@/lib/format'
import type { Centavos, Colaborador } from '@/types'

interface Props {
  colaborador: Colaborador
  valor: Centavos
  cidade: string
  descricao?: string
  aoFechar: () => void
  aoConfirmarPago: () => Promise<void>
}

/**
 * O momento do pagamento.
 *
 * O código é montado no aparelho, sem internet e sem banco. O que o app NÃO
 * consegue saber é se o PIX foi pago — por isso o "Já paguei" é um botão que
 * ele aperta, e não uma confirmação automática.
 */
export function SheetPix({
  colaborador,
  valor,
  cidade,
  descricao,
  aoFechar,
  aoConfirmarPago,
}: Props) {
  const toast = useToast()
  const [copiado, setCopiado] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [mostrandoQr, setMostrandoQr] = useState(false)
  const [confirmando, setConfirmando] = useState(false)

  const erroChave = useMemo(() => {
    if (!colaborador.chavePix || !colaborador.chavePixTipo) return 'sem-chave'
    return validarChavePix(colaborador.chavePix, colaborador.chavePixTipo)
  }, [colaborador])

  const payload = useMemo(() => {
    if (erroChave) return null
    return gerarPixCopiaECola({
      chave: colaborador.chavePix!,
      tipoChave: colaborador.chavePixTipo!,
      nomeRecebedor: colaborador.nomeRecebedor ?? colaborador.nome,
      cidade,
      valor,
      txid: `DIARIA${Date.now().toString(36).toUpperCase()}`,
      descricao,
    })
  }, [erroChave, colaborador, cidade, valor, descricao])

  useEffect(() => {
    if (!payload || !mostrandoQr) return
    QRCode.toDataURL(payload, { width: 480, margin: 1, errorCorrectionLevel: 'M' })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null))
  }, [payload, mostrandoQr])

  async function copiar() {
    if (!payload) return
    try {
      await navigator.clipboard.writeText(payload)
    } catch {
      // Alguns navegadores bloqueiam a área de transferência — plano B manual
      const campo = document.createElement('textarea')
      campo.value = payload
      document.body.appendChild(campo)
      campo.select()
      document.execCommand('copy')
      campo.remove()
    }
    setCopiado(true)
    toast('Código copiado! Cole no seu banco.')
    setTimeout(() => setCopiado(false), 2500)
  }

  async function compartilhar() {
    if (!payload) return
    const texto = `PIX de ${moeda(valor)} para ${colaborador.nome}:\n\n${payload}`
    if (navigator.share) {
      try {
        await navigator.share({ text: texto })
        return
      } catch {
        /* pessoa cancelou */
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
  }

  async function confirmar() {
    setConfirmando(true)
    try {
      await aoConfirmarPago()
      toast('Pagamento registrado!')
      aoFechar()
    } catch {
      toast('Não deu para registrar. Tente de novo.', 'erro')
      setConfirmando(false)
    }
  }

  return (
    <Sheet aberto aoFechar={aoFechar} titulo="Pagar pelo PIX">
      <div className="space-y-5">
        {/* Quem e quanto */}
        <div className="flex flex-col items-center text-center py-2">
          <Avatar nome={colaborador.nome} fotoUrl={colaborador.fotoUrl} tamanho="lg" />
          <div className="mt-3 text-[17px] font-bold">{colaborador.nome}</div>
          <div className="tnum text-[38px] font-extrabold text-lucro leading-none mt-1.5">
            {moeda(valor)}
          </div>
        </div>

        {erroChave ? (
          <div className="p-4 rounded-3xl bg-alerta-soft border border-alerta/20">
            <div className="flex items-start gap-2.5">
              <TriangleAlert size={20} className="shrink-0 text-alerta mt-0.5" />
              <div>
                <div className="font-bold text-[15px] text-alerta">
                  {erroChave === 'sem-chave' ? 'Sem chave PIX cadastrada' : 'Chave PIX com problema'}
                </div>
                <p className="text-[13.5px] text-muted mt-1 leading-relaxed">
                  {erroChave === 'sem-chave'
                    ? `Cadastre a chave PIX de ${colaborador.nome.split(' ')[0]} na aba Equipe para gerar o código automaticamente.`
                    : erroChave}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <button onClick={copiar} className="btn-primary w-full">
              {copiado ? (
                <>
                  <Check size={20} /> Código copiado!
                </>
              ) : (
                <>
                  <Copy size={19} /> Copiar código PIX
                </>
              )}
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={() => setMostrandoQr((v) => !v)} className="btn-ghost">
                <QrCode size={18} /> {mostrandoQr ? 'Esconder' : 'Ver QR'}
              </button>
              <button onClick={compartilhar} className="btn-ghost">
                <Share2 size={18} /> Enviar
              </button>
            </div>

            {mostrandoQr && (
              <div className="flex flex-col items-center gap-3 p-5 rounded-3xl bg-white animate-fade-up">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Code do PIX" className="w-56 h-56" />
                ) : (
                  <div className="w-56 h-56 grid place-items-center">
                    <Loader2 size={28} className="animate-spin text-slate-400" />
                  </div>
                )}
                <p className="text-[13px] text-slate-500 text-center">
                  Mostre esse código para a pessoa escanear no banco dela
                </p>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-raised">
              <div className="text-[12px] font-bold text-faint uppercase tracking-wide mb-1.5">
                Como funciona
              </div>
              <ol className="text-[13.5px] text-muted space-y-1.5 leading-relaxed list-decimal list-inside">
                <li>Toque em "Copiar código PIX"</li>
                <li>Abra o app do seu banco</li>
                <li>Escolha PIX → Copia e Cola e cole</li>
                <li>Volte aqui e toque em "Já paguei"</li>
              </ol>
            </div>
          </>
        )}

        <button
          onClick={confirmar}
          disabled={confirmando}
          className="btn w-full bg-lucro-soft text-lucro"
        >
          {confirmando ? <Loader2 size={20} className="animate-spin" /> : <><Check size={19} /> Já paguei</>}
        </button>

        <p className="text-[12.5px] text-faint text-center leading-relaxed">
          O app não consegue ver se o PIX caiu — quem confirma é você.
        </p>
      </div>
    </Sheet>
  )
}
