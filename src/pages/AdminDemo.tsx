import { useState } from 'react'
import { Eraser, Loader2, Sparkles } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/app/Toast'
import { criarDadosDemo, limparDadosDemo } from '@/lib/demo'

/**
 * Modo demonstração.
 *
 * Enche a SUA conta com uma feira realista — equipe, stands, escala com
 * presença variada, gastos e vales — para você conferir todas as telas cheias
 * sem digitar nada, e para mostrar o app funcionando a um empreiteiro novo.
 *
 * Tudo que entra aqui tem id começando com "demo_", então a limpeza não
 * encosta em nenhum dado real.
 */
export function PainelDemo() {
  const { perfil } = useAuth()
  const toast = useToast()
  const [ocupado, setOcupado] = useState<'criar' | 'limpar' | null>(null)

  if (!perfil) return null

  async function criar() {
    setOcupado('criar')
    try {
      const { criados } = await criarDadosDemo(perfil!.empresaId)
      toast(`${criados} registros de teste criados na sua conta`)
    } catch {
      toast('Não deu para criar os dados de teste.', 'erro')
    } finally {
      setOcupado(null)
    }
  }

  async function limpar() {
    setOcupado('limpar')
    try {
      const apagados = await limparDadosDemo(perfil!.empresaId)
      toast(apagados > 0 ? `${apagados} registros de teste apagados` : 'Não havia dados de teste')
    } catch {
      toast('Não deu para limpar.', 'erro')
    } finally {
      setOcupado(null)
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-1">
        <div className="shrink-0 w-11 h-11 rounded-2xl bg-brand-soft text-brand-ink grid place-items-center">
          <Sparkles size={20} />
        </div>
        <div>
          <div className="font-bold text-[16px]">Modo demonstração</div>
          <div className="text-[13.5px] text-muted">Enche a sua conta para testar as telas</div>
        </div>
      </div>

      <p className="text-[13px] text-muted leading-relaxed mt-3">
        Cria uma feira acontecendo agora com 6 pessoas, 3 stands, presença já marcada, gastos e
        vales — e uma feira antiga de pacote fechado no histórico. Serve tanto para conferir o
        app quanto para mostrar a um empreiteiro novo.
      </p>

      <div className="grid grid-cols-2 gap-2.5 mt-4">
        <button onClick={criar} disabled={!!ocupado} className="btn-primary h-12 text-[14.5px]">
          {ocupado === 'criar' ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              <Sparkles size={17} /> Criar dados
            </>
          )}
        </button>
        <button onClick={limpar} disabled={!!ocupado} className="btn-ghost h-12 text-[14.5px]">
          {ocupado === 'limpar' ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              <Eraser size={17} /> Limpar
            </>
          )}
        </button>
      </div>
    </div>
  )
}
