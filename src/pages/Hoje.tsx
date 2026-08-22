import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Check, Settings, Sun, Users, Wallet, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useColaboradores, useDiariasDoDia, useFeiras } from '@/hooks/useDados'
import { useIndice } from '@/hooks/useColecao'
import { EspacoBarra } from '@/components/app/Navegacao'
import { CarregandoLista, EstadoVazio } from '@/components/ui/Estados'
import { Avatar } from '@/components/ui/Avatar'
import { useToast } from '@/components/app/Toast'
import { marcarPresenca } from '@/lib/acoes'
import { valorDaDiaria } from '@/lib/calc'
import { cn } from '@/lib/cn'
import { dataPorExtenso, hojeISO, moeda } from '@/lib/format'
import type { Diaria } from '@/types'

/**
 * A tela que ele abre dentro do pavilhão, com o celular na mão.
 *
 * Uma pergunta só: quem trabalhou hoje? Cada toque vira custo, pagamento e
 * relatório automaticamente — ele nunca precisa ir num menu de "lançamentos".
 */
export function Hoje() {
  const { perfil, empresa } = useAuth()
  const hoje = hojeISO()
  const { dados: diarias, carregando } = useDiariasDoDia(hoje)
  const { dados: equipe } = useColaboradores(false)
  const { dados: feiras } = useFeiras()
  const indiceEquipe = useIndice(equipe)
  const indiceFeiras = useIndice(feiras)

  const porFeira = useMemo(() => {
    const mapa = new Map<string, Diaria[]>()
    for (const d of diarias) {
      const lista = mapa.get(d.feiraId) ?? []
      lista.push(d)
      mapa.set(d.feiraId, lista)
    }
    return [...mapa.entries()].map(([feiraId, itens]) => ({
      feiraId,
      itens: itens.sort((a, b) => a.colaboradorNome.localeCompare(b.colaboradorNome, 'pt-BR')),
    }))
  }, [diarias])

  const resumo = useMemo(() => {
    const presentes = diarias.filter((d) => d.presenca === 'PRESENTE')
    return {
      presentes: presentes.length,
      total: diarias.length,
      semMarcar: diarias.filter((d) => d.presenca === 'PREVISTO').length,
      custo: presentes.reduce((t, d) => t + valorDaDiaria(d) + d.valorAlmoco, 0),
    }
  }, [diarias])

  const primeiroNome = perfil?.nome?.split(' ')[0] ?? ''

  return (
    <>
      <header className="safe-top">
        <div className="max-w-2xl lg:max-w-3xl mx-auto px-4 pt-6 pb-2 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[13.5px] font-semibold text-muted">
              <Sun size={16} /> {dataPorExtenso(hoje)}
            </div>
            <h1 className="text-[27px] font-extrabold leading-tight mt-1">
              {saudacao()}
              {primeiroNome && `, ${primeiroNome}`}
            </h1>
          </div>
          <Link
            to="/ajustes"
            className="shrink-0 w-11 h-11 mt-1 grid place-items-center rounded-full text-muted hover:bg-raised transition"
            aria-label="Ajustes"
          >
            <Settings size={21} />
          </Link>
        </div>
      </header>

      <main className="max-w-2xl lg:max-w-3xl mx-auto px-4 pt-2">
        {carregando ? (
          <CarregandoLista linhas={3} />
        ) : diarias.length === 0 ? (
          <SemTrabalhoHoje temFeiras={feiras.length > 0} temEquipe={equipe.length > 0} />
        ) : (
          <div className="space-y-4 animate-fade-up">
            {/* Resumo do dia */}
            <div
              className="p-5 rounded-3xl text-white shadow-lift"
              style={{
                backgroundImage: 'linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)',
              }}
            >
              <div className="text-[13px] font-semibold uppercase tracking-wider text-white/75">
                Trabalhando hoje
              </div>
              <div className="flex items-end gap-2 mt-1">
                <span className="tnum text-[38px] font-extrabold leading-none">
                  {resumo.presentes}
                </span>
                <span className="mb-1 text-[16px] font-semibold text-white/75">
                  de {resumo.total} {resumo.total === 1 ? 'pessoa' : 'pessoas'}
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between">
                <span className="text-[14px] text-white/80">Custo do dia</span>
                <span className="tnum text-[20px] font-bold">{moeda(resumo.custo)}</span>
              </div>
            </div>

            {resumo.semMarcar > 0 && (
              <div className="px-4 py-3 rounded-2xl bg-alerta-soft text-alerta text-[14px] font-semibold">
                {resumo.semMarcar} {resumo.semMarcar === 1 ? 'pessoa ainda sem marcar' : 'pessoas ainda sem marcar'}
              </div>
            )}

            {/* Lista por feira */}
            {porFeira.map(({ feiraId, itens }) => {
              const feira = indiceFeiras[feiraId]
              return (
                <section key={feiraId} className="card overflow-hidden">
                  <Link
                    to={`/feiras/${feiraId}`}
                    className="block px-4 py-3.5 border-b border-line bg-raised/50"
                  >
                    <div className="font-bold text-[15.5px] truncate">
                      {feira?.nome ?? 'Feira'}
                    </div>
                    {feira?.local && (
                      <div className="text-[13px] text-muted truncate">{feira.local}</div>
                    )}
                  </Link>

                  <div className="divide-y divide-line">
                    {itens.map((d) => (
                      <LinhaHoje
                        key={d.id}
                        empresaId={perfil!.empresaId}
                        diaria={d}
                        fotoUrl={indiceEquipe[d.colaboradorId]?.fotoUrl}
                      />
                    ))}
                  </div>
                </section>
              )
            })}

            <div className="grid grid-cols-2 gap-2.5">
              <Link to="/pagamentos" className="btn-ghost">
                <Wallet size={18} /> A pagar
              </Link>
              <Link to="/dinheiro" className="btn-ghost">
                Meu dinheiro
              </Link>
            </div>

            {empresa && (
              <p className="text-center text-[12.5px] text-faint">
                Almoço de hoje já incluído no custo acima.
              </p>
            )}
          </div>
        )}

        <EspacoBarra />
      </main>
    </>
  )
}

function saudacao(): string {
  const hora = new Date().getHours()
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

function LinhaHoje({
  empresaId,
  diaria,
  fotoUrl,
}: {
  empresaId: string
  diaria: Diaria
  fotoUrl?: string | null
}) {
  const toast = useToast()

  async function definir(presenca: Diaria['presenca']) {
    try {
      await marcarPresenca(empresaId, diaria.id, presenca)
    } catch {
      toast('Não deu para salvar. Tente de novo.', 'erro')
    }
  }

  return (
    <div className="p-3.5 flex items-center gap-3">
      <Avatar nome={diaria.colaboradorNome} fotoUrl={fotoUrl} tamanho="md" />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[16px] truncate">{diaria.colaboradorNome}</div>
        <div className="text-[13px] text-muted">{moeda(valorDaDiaria(diaria))}</div>
      </div>
      <div className="shrink-0 flex gap-1.5">
        <button
          onClick={() => definir(diaria.presenca === 'PRESENTE' ? 'PREVISTO' : 'PRESENTE')}
          aria-label="Trabalhou"
          className={cn(
            'w-13 h-13 min-w-[52px] h-[52px] rounded-2xl grid place-items-center border-2 transition active:scale-90',
            diaria.presenca === 'PRESENTE'
              ? 'bg-lucro border-lucro text-white'
              : 'border-line bg-raised text-faint',
          )}
        >
          <Check size={22} strokeWidth={3} />
        </button>
        <button
          onClick={() => definir(diaria.presenca === 'FALTOU' ? 'PREVISTO' : 'FALTOU')}
          aria-label="Faltou"
          className={cn(
            'min-w-[52px] h-[52px] rounded-2xl grid place-items-center border-2 transition active:scale-90',
            diaria.presenca === 'FALTOU'
              ? 'bg-custo border-custo text-white'
              : 'border-line bg-raised text-faint',
          )}
        >
          <X size={22} strokeWidth={3} />
        </button>
      </div>
    </div>
  )
}

function SemTrabalhoHoje({ temFeiras, temEquipe }: { temFeiras: boolean; temEquipe: boolean }) {
  if (!temEquipe) {
    return (
      <EstadoVazio
        icone={<Users size={34} />}
        titulo="Comece pela sua equipe"
        descricao="Cadastre quem trabalha com você. Depois é só escolher quem vai para cada feira."
        acao={
          <Link to="/equipe" className="btn-primary w-full">
            Cadastrar equipe
          </Link>
        }
      />
    )
  }

  if (!temFeiras) {
    return (
      <EstadoVazio
        icone={<CalendarDays size={34} />}
        titulo="Cadastre uma feira"
        descricao="Coloque o nome, as datas e quanto você vai receber. O app calcula o resto."
        acao={
          <Link to="/feiras" className="btn-primary w-full">
            Nova feira
          </Link>
        }
      />
    )
  }

  return (
    <EstadoVazio
      icone={<Sun size={34} />}
      titulo="Ninguém trabalha hoje"
      descricao="Não há ninguém escalado para hoje. Abra a feira para escalar sua equipe."
      acao={
        <Link to="/feiras" className="btn-primary w-full">
          Ver minhas feiras
        </Link>
      }
    />
  )
}
