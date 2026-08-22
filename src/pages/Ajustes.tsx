import { useState } from 'react'
import {
  Building2,
  ChevronRight,
  Copy,
  Gift,
  LogOut,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { BarraTopo, EspacoBarra } from '@/components/app/Navegacao'
import { useToast } from '@/components/app/Toast'
import { mostraCobranca } from '@/lib/platform'
import { plano, PLANOS, PREMIOS_INDICACAO } from '@/lib/planos'
import { moeda } from '@/lib/format'
import { Sheet } from '@/components/ui/Sheet'
import { cn } from '@/lib/cn'

export function Ajustes() {
  const { perfil, empresa, sair, ehAdmin } = useAuth()
  const toast = useToast()
  const [vendoPlanos, setVendoPlanos] = useState(false)

  if (!perfil || !empresa) return null

  const meuPlano = plano(empresa.assinatura.plano)
  const diasTeste = empresa.assinatura.fimTeste
    ? Math.ceil((empresa.assinatura.fimTeste.toDate().getTime() - Date.now()) / 86_400_000)
    : null

  async function copiarCodigo() {
    try {
      await navigator.clipboard.writeText(empresa!.codigoIndicacao)
      toast('Código copiado!')
    } catch {
      toast('Não deu para copiar', 'erro')
    }
  }

  return (
    <>
      <BarraTopo titulo="Ajustes" />

      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* Identidade */}
        <div className="card p-5">
          <div className="flex items-center gap-3.5">
            <div className="shrink-0 w-14 h-14 rounded-2xl bg-brand-soft text-brand-ink grid place-items-center">
              <Building2 size={26} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[17px] truncate">{empresa.nome}</div>
              <div className="text-[13.5px] text-muted truncate">
                {[empresa.ramo, empresa.cidade].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-line text-[13.5px] text-muted">
            Entrou como <span className="font-semibold text-ink">{perfil.nome}</span>
            {perfil.email && <> · {perfil.email}</>}
          </div>
        </div>

        {/* Assinatura — escondida no build Android por política do Google Play */}
        {mostraCobranca && (
          <button onClick={() => setVendoPlanos(true)} className="w-full card p-5 text-left active:scale-[.99] transition">
            <div className="flex items-center gap-3">
              <div className="shrink-0 w-11 h-11 rounded-2xl bg-brand text-white grid place-items-center">
                <Sparkles size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[16px]">Plano {meuPlano.nome}</div>
                <div className="text-[13.5px] text-muted">
                  {empresa.assinatura.status === 'TESTE' && diasTeste !== null
                    ? diasTeste > 0
                      ? `Teste grátis — faltam ${diasTeste} ${diasTeste === 1 ? 'dia' : 'dias'}`
                      : 'Teste grátis terminou'
                    : `${moeda(meuPlano.precoMensal)} por mês`}
                </div>
              </div>
              <ChevronRight size={20} className="shrink-0 text-faint" />
            </div>
          </button>
        )}

        {/* Indicação */}
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="shrink-0 w-11 h-11 rounded-2xl bg-lucro-soft text-lucro grid place-items-center">
              <Gift size={20} />
            </div>
            <div>
              <div className="font-bold text-[16px]">Indique e ganhe</div>
              <div className="text-[13.5px] text-muted">Quem entrar pelo seu código ganha 50%</div>
            </div>
          </div>

          <button
            onClick={copiarCodigo}
            className="w-full flex items-center justify-between gap-3 p-4 rounded-2xl bg-raised border-2 border-dashed border-line active:scale-[.99] transition"
          >
            <span className="tnum text-[24px] font-extrabold tracking-[0.2em]">
              {empresa.codigoIndicacao}
            </span>
            <Copy size={20} className="shrink-0 text-brand" />
          </button>

          <div className="mt-4 space-y-2">
            {PREMIOS_INDICACAO.map((p) => (
              <div key={p.aPartirDe} className="flex items-center gap-3 text-[13.5px]">
                <span className="shrink-0 w-7 h-7 rounded-full bg-brand-soft text-brand-ink grid place-items-center font-bold text-[12px]">
                  {p.aPartirDe}
                </span>
                <span className="text-muted">{p.premio}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Painel da plataforma — só aparece para a administração */}
        {ehAdmin && (
          <Link to="/admin" className="block card p-5 active:scale-[.99] transition">
            <div className="flex items-center gap-3">
              <div className="shrink-0 w-11 h-11 rounded-2xl bg-ink text-canvas grid place-items-center">
                <Wrench size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[16px]">Administração</div>
                <div className="text-[13.5px] text-muted">Contas, planos e modo demonstração</div>
              </div>
              <ChevronRight size={20} className="shrink-0 text-faint" />
            </div>
          </Link>
        )}

        {/* Privacidade */}
        <div className="card p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck size={20} className="shrink-0 text-lucro mt-0.5" />
            <div className="text-[13.5px] text-muted leading-relaxed">
              Os dados da sua equipe são seus. Ninguém além de você e de quem você autorizar
              enxerga suas feiras, seus valores ou seu lucro.
            </div>
          </div>
        </div>

        <button onClick={sair} className="btn-ghost w-full text-custo">
          <LogOut size={18} /> Sair da conta
        </button>

        <p className="text-center text-[12px] text-faint pt-2">Empreita · versão 0.1</p>

        <EspacoBarra />
      </main>

      {vendoPlanos && (
        <Sheet
          aberto
          aoFechar={() => setVendoPlanos(false)}
          titulo="Planos"
          subtitulo="Menos de meia diária por mês"
          alturaTotal
        >
          <div className="space-y-3">
            {PLANOS.map((p) => (
              <div
                key={p.id}
                className={cn(
                  'p-5 rounded-3xl border-2',
                  p.id === empresa.assinatura.plano
                    ? 'border-brand bg-brand-soft'
                    : p.recomendado
                      ? 'border-lucro/40 bg-lucro-soft/40'
                      : 'border-line bg-raised',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[18px]">{p.nome}</span>
                      {p.recomendado && (
                        <span className="px-2 py-0.5 rounded-lg bg-lucro text-white text-[10.5px] font-bold uppercase tracking-wide">
                          Mais escolhido
                        </span>
                      )}
                    </div>
                    <p className="text-[13.5px] text-muted mt-1 leading-snug">{p.destaque}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="tnum text-[20px] font-extrabold">{moeda(p.precoMensal)}</div>
                    <div className="text-[11.5px] text-faint uppercase tracking-wide">por mês</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-line/60 text-[13px] text-muted">
                  Até {p.limiteEquipe > 999 ? 'equipe ilimitada' : `${p.limiteEquipe} pessoas`}
                  {p.limiteEncarregados > 0 &&
                    ` · ${p.limiteEncarregados} ${p.limiteEncarregados === 1 ? 'encarregado' : 'encarregados'}`}
                  {' · acesso do funcionário incluído'}
                </div>
              </div>
            ))}

            <div className="p-4 rounded-2xl bg-raised text-[13px] text-muted leading-relaxed">
              No plano anual você paga 10 meses e usa 12. A cobrança pelo cartão ou PIX entra
              em breve — durante o teste, tudo liberado.
            </div>
          </div>
        </Sheet>
      )}
    </>
  )
}
