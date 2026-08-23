import { BarraTopo } from '@/components/app/Navegacao'
import { TERMOS, VERSAO_TERMOS } from '@/lib/termos'

export function Termos({ semBarra }: { semBarra?: boolean }) {
  return (
    <>
      {!semBarra && (
        <BarraTopo titulo="Termos de Uso" subtitulo="e Política de Privacidade" voltarPara={-1} />
      )}
      <main className="max-w-2xl lg:max-w-3xl mx-auto px-4 py-5">
        <ConteudoTermos />
        <div className="h-16" />
      </main>
    </>
  )
}

/** Reaproveitado na folha de aceite do cadastro. */
export function ConteudoTermos() {
  return (
    <div className="space-y-6">
      <p className="text-[13px] text-faint">Versão {VERSAO_TERMOS}</p>
      {TERMOS.map((secao) => (
        <section key={secao.titulo}>
          <h2 className="text-[16px] font-bold mb-2">{secao.titulo}</h2>
          <div className="space-y-2.5">
            {secao.paragrafos.map((texto, i) => (
              <p key={i} className="text-[14.5px] text-muted leading-relaxed">
                {texto}
              </p>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
