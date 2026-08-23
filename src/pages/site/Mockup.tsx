/**
 * O aparelho da página inicial.
 *
 * Não é ilustração genérica: é o cartão de resultado do app de verdade, com os
 * números do caso real que a gente usou para calibrar tudo — stand de 50 m² a
 * R$ 60 o metro. Mostrar o produto vende melhor que descrever o produto.
 */
export function Mockup() {
  return (
    <div className="relative w-[280px] sm:w-[320px] select-none">
      {/* brilho atrás do aparelho */}
      <div
        className="absolute -inset-10 rounded-[80px] blur-3xl opacity-60"
        style={{ background: 'radial-gradient(circle at 50% 30%, #6366F1 0%, transparent 70%)' }}
        aria-hidden
      />

      <div className="relative rounded-[42px] bg-[#0B0D14] p-2.5 shadow-2xl ring-1 ring-white/15">
        <div className="rounded-[34px] overflow-hidden bg-[#090B12]">
          {/* barra de status */}
          <div className="flex items-center justify-between px-6 pt-3.5 pb-2 text-[11px] font-semibold text-white/60">
            <span>9:41</span>
            <span className="flex gap-1 items-center">
              <span className="w-3.5 h-2 rounded-[2px] bg-white/50" />
              <span className="w-4 h-2 rounded-[2px] bg-white/70" />
            </span>
          </div>

          <div className="px-4 pb-5 space-y-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                Expo Construção
              </div>
              <div className="text-[17px] font-bold text-white">Stand Alfa Móveis</div>
            </div>

            {/* o cartão de resultado */}
            <div
              className="relative overflow-hidden rounded-2xl p-4 text-white"
              style={{ backgroundImage: 'linear-gradient(140deg, #4F46E5 0%, #3730A3 55%, #312E81 100%)' }}
            >
              <div className="absolute -top-12 -right-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" aria-hidden />
              <div className="relative">
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                  Sobrou pra você 👍
                </div>
                <div className="tnum text-[30px] font-extrabold leading-none mt-1">R$ 825,00</div>
                <div className="text-[11px] text-white/75 mt-1">O lucro está dentro do normal.</div>
                <div className="mt-3 h-1.5 rounded-full bg-white/20 overflow-hidden">
                  <div className="h-full w-[72%] rounded-full bg-white/85" />
                </div>
                <div className="mt-2.5 flex justify-between text-[10px]">
                  <span className="text-white/60">VOCÊ RECEBE</span>
                  <span className="text-white/60">VOCÊ GASTOU</span>
                </div>
                <div className="flex justify-between text-[13px] font-bold">
                  <span>R$ 3.000,00</span>
                  <span>R$ 2.175,00</span>
                </div>
              </div>
            </div>

            {/* linhas da conta */}
            <div className="rounded-2xl bg-white/[0.04] ring-1 ring-white/10 px-3.5 py-2.5 space-y-2">
              {[
                ['💰', 'Você recebe', 'R$ 3.000,00', 'text-emerald-400'],
                ['👷', 'Diárias da equipe', '− R$ 1.800,00', 'text-rose-400'],
                ['🍚', 'Comida', '− R$ 225,00', 'text-rose-400'],
              ].map(([emoji, rotulo, valor, cor]) => (
                <div key={rotulo} className="flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-2 text-white/60">
                    <span>{emoji}</span>
                    {rotulo}
                  </span>
                  <span className={`tnum font-bold ${cor}`}>{valor}</span>
                </div>
              ))}
            </div>

            {/* presença */}
            <div className="rounded-2xl bg-white/[0.04] ring-1 ring-white/10 overflow-hidden">
              <div className="px-3.5 py-2 text-[11px] font-bold text-white/50 border-b border-white/[0.07]">
                QUEM TRABALHOU HOJE
              </div>
              {[
                ['ZB', 'Zé Baiano', 'bg-cyan-500', true],
                ['TI', 'Tico', 'bg-amber-500', true],
                ['MA', 'Maria', 'bg-fuchsia-500', false],
              ].map(([sigla, nome, cor, presente]) => (
                <div key={nome as string} className="px-3.5 py-2 flex items-center gap-2.5">
                  <span
                    className={`w-7 h-7 rounded-full grid place-items-center text-[10px] font-bold text-white ${cor}`}
                  >
                    {sigla}
                  </span>
                  <span className="flex-1 text-[13px] font-semibold text-white">{nome}</span>
                  <span
                    className={`w-7 h-7 rounded-lg grid place-items-center text-[13px] font-bold ${
                      presente ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/30'
                    }`}
                  >
                    ✓
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
