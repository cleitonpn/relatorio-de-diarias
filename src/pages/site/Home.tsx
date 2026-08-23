import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Calculator,
  CalendarClock,
  Check,
  ChevronDown,
  FileSpreadsheet,
  Menu,
  QrCode,
  Users,
  WifiOff,
  X,
} from 'lucide-react'
import { PLANOS } from '@/lib/planos'
import { moeda } from '@/lib/format'
import { Mockup } from './Mockup'
import { MARCA, SimboloMarca } from '@/lib/marca'

/**
 * A página que vende o produto.
 *
 * O público é empreiteiro: a página não pode falar como software, tem que
 * falar como quem já esteve no pavilhão. Por isso a seção do problema vem
 * antes da de recursos — ele precisa se reconhecer antes de se interessar.
 */
export function Home() {
  return (
    <div className="relative min-h-dvh bg-[#07080F] text-white antialiased overflow-x-hidden">
      <Fundo />
      {/* O fundo é fixo e fica na camada 0; o conteúdo sobe para a 10, senão
          o próprio fundo opaco do container cobriria o brilho. */}
      <div className="relative z-10">
        <Cabecalho />
        <Hero />
        <Reconhecimento />
        <Recursos />
        <ComoFunciona />
        <NumeroReal />
        <Planos />
        <Perguntas />
        <ChamadaFinal />
        <Rodape />
      </div>
    </div>
  )
}

/* ------------------------------ Fundo vivo ------------------------------ */

function Fundo() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden>
      <div
        className="absolute -top-56 left-1/2 -translate-x-1/2 w-[1100px] h-[1000px] rounded-full opacity-[0.42] blur-[130px]"
        style={{ background: 'radial-gradient(circle, #6366F1 0%, #4338CA 40%, transparent 70%)' }}
      />
      <div
        className="absolute top-[80vh] -left-40 w-[600px] h-[600px] rounded-full opacity-[0.16] blur-[120px]"
        style={{ background: 'radial-gradient(circle, #059669 0%, transparent 70%)' }}
      />
      <div
        className="absolute top-[160vh] -right-40 w-[700px] h-[700px] rounded-full opacity-[0.14] blur-[120px]"
        style={{ background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)' }}
      />
      {/* malha sutil, dá textura de produto técnico */}
      <div
        className="absolute inset-0 opacity-100"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse 90% 55% at 50% 0%, #000 25%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 55% at 50% 0%, #000 25%, transparent 100%)',
        }}
      />
    </div>
  )
}

/* ------------------------------- Cabeçalho ------------------------------- */

function Cabecalho() {
  const [aberto, setAberto] = useState(false)
  const [rolou, setRolou] = useState(false)

  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 16)
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
  }, [])

  const links = [
    ['Recursos', '#recursos'],
    ['Como funciona', '#como-funciona'],
    ['Planos', '#planos'],
    ['Dúvidas', '#duvidas'],
  ]

  return (
    <header
      className={`sticky top-0 z-50 transition-all ${
        rolou ? 'bg-[#07080F]/80 backdrop-blur-xl border-b border-white/[0.07]' : ''
      }`}
    >
      <div className="max-w-6xl mx-auto px-5 h-[68px] flex items-center gap-3 sm:gap-6 whitespace-nowrap">
        <Logo />

        <nav className="hidden lg:flex items-center gap-1 ml-4">
          {links.map(([texto, href]) => (
            <a
              key={href}
              href={href}
              className="px-3.5 py-2 rounded-xl text-[14.5px] font-medium text-white/60 hover:text-white hover:bg-white/[0.06] transition"
            >
              {texto}
            </a>
          ))}
        </nav>

        <div className="flex-1" />

        <Link
          to="/entrar"
          className="px-3 sm:px-4 py-2.5 rounded-xl text-[14.5px] font-semibold text-white/80 hover:text-white transition"
        >
          Entrar
        </Link>
        <Link to="/entrar" className="hidden lg:block">
          <BotaoBrilho pequeno>Testar grátis</BotaoBrilho>
        </Link>

        <button
          onClick={() => setAberto((v) => !v)}
          className="lg:hidden w-10 h-10 grid place-items-center rounded-xl text-white/80 hover:bg-white/[0.06]"
          aria-label="Menu"
        >
          {aberto ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {aberto && (
        <div className="lg:hidden border-t border-white/[0.07] bg-[#07080F]/95 backdrop-blur-xl px-5 py-4 space-y-1">
          {links.map(([texto, href]) => (
            <a
              key={href}
              href={href}
              onClick={() => setAberto(false)}
              className="block px-3 py-3 rounded-xl text-[15px] font-medium text-white/70 hover:bg-white/[0.06]"
            >
              {texto}
            </a>
          ))}
          <Link to="/entrar" className="block pt-2">
            <BotaoBrilho largura>Testar 30 dias grátis</BotaoBrilho>
          </Link>
        </div>
      )}
    </header>
  )
}

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 shrink-0">
      <span
        className="w-9 h-9 rounded-xl grid place-items-center"
        style={{ backgroundImage: 'linear-gradient(135deg, #6366F1 0%, #312E81 100%)' }}
      >
<SimboloMarca className="w-5 h-5 text-white" />
      </span>
      <span className="text-[19px] font-extrabold tracking-tight">{MARCA.nome}</span>
    </Link>
  )
}

function BotaoBrilho({
  children,
  pequeno,
  largura,
}: {
  children: ReactNode
  pequeno?: boolean
  largura?: boolean
}) {
  return (
    <span
      className={`relative inline-flex items-center justify-center gap-2 rounded-2xl font-bold text-white
        transition active:scale-[.98] ${pequeno ? 'h-11 px-5 text-[14.5px]' : 'h-14 px-7 text-[16.5px]'}
        ${largura ? 'w-full' : ''}`}
      style={{
        backgroundImage: 'linear-gradient(135deg, #6366F1 0%, #4338CA 100%)',
        boxShadow: '0 10px 40px -10px rgba(99,102,241,.7), inset 0 1px 0 rgba(255,255,255,.2)',
      }}
    >
      {children}
    </span>
  )
}

/* ---------------------------------- Hero ---------------------------------- */

function Hero() {
  return (
    <section className="relative max-w-6xl mx-auto px-5 pt-14 pb-20 sm:pt-24 sm:pb-28">
      <div className="grid lg:grid-cols-[1.1fr_.9fr] gap-14 items-center">
        <div>
          <Etiqueta>Feito para empreiteiro de feira e stand</Etiqueta>

          <h1 className="mt-6 text-[clamp(38px,7vw,68px)] font-extrabold leading-[1.02] tracking-[-0.03em]">
            Quanto{' '}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(100deg, #A5B4FC 0%, #818CF8 45%, #34D399 100%)' }}
            >
              sobra pra você
            </span>{' '}
            no fim da feira?
          </h1>

          <p className="mt-6 text-[clamp(16px,2.2vw,20px)] text-white/60 leading-relaxed max-w-xl">
            O {MARCA.nome} controla suas feiras, sua equipe e o seu dinheiro. Você vê o lucro de cada
            stand, sabe quanto pagar a cada um e paga por PIX sem errar valor.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row gap-3">
            <Link to="/entrar">
              <BotaoBrilho largura>
                Testar 30 dias grátis <ArrowRight size={19} />
              </BotaoBrilho>
            </Link>
            <a
              href="#como-funciona"
              className="h-14 px-7 inline-flex items-center justify-center rounded-2xl font-semibold text-[16.5px]
                         text-white/80 bg-white/[0.06] ring-1 ring-white/10 hover:bg-white/[0.1] transition"
            >
              Ver como funciona
            </a>
          </div>

          <p className="mt-5 text-[14px] text-white/40">
            Não pedimos cartão. Cancele quando quiser.
          </p>
        </div>

        <div className="flex justify-center lg:justify-end">
          <Mockup />
        </div>
      </div>
    </section>
  )
}

function Etiqueta({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] ring-1 ring-white/10 text-[13px] font-semibold text-white/70">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
      {children}
    </span>
  )
}

/* ------------------------------ Reconhecimento ------------------------------ */

function Reconhecimento() {
  const casos = [
    'Terminou a feira sem saber se ganhou ou perdeu dinheiro',
    'Pagou alguém duas vezes porque perdeu a conta',
    'Aceitou serviço no telefone e depois viu que não fechava',
    'Anotou tudo num caderno e o contador pediu tudo de novo',
  ]

  return (
    <Secao>
      <div className="max-w-3xl">
        <Titulo>Já passou por isso?</Titulo>
        <div className="mt-8 grid sm:grid-cols-2 gap-3">
          {casos.map((caso) => (
            <div
              key={caso}
              className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.07]"
            >
              <span className="shrink-0 w-6 h-6 rounded-lg bg-rose-500/15 text-rose-400 grid place-items-center text-[13px] font-bold">
                ✕
              </span>
              <span className="text-[15px] text-white/70 leading-relaxed">{caso}</span>
            </div>
          ))}
        </div>
        <p className="mt-8 text-[17px] text-white/80 leading-relaxed">
          Não é falta de trabalho. É falta de <strong className="text-white">número na mão</strong>{' '}
          na hora certa.
        </p>
      </div>
    </Secao>
  )
}

/* -------------------------------- Recursos -------------------------------- */

function Recursos() {
  return (
    <Secao id="recursos">
      <Titulo>Tudo que o caderno não faz</Titulo>
      <p className="mt-4 text-[17px] text-white/55 max-w-2xl leading-relaxed">
        Cada tela responde uma pergunta que você já faz de cabeça — só que sem errar a conta.
      </p>

      <div className="mt-10 grid md:grid-cols-6 gap-4">
        <Cartao
          className="md:col-span-4"
          icone={<Calculator size={22} />}
          titulo="Vale a pena pegar?"
          texto="O gerente liga oferecendo um valor e você tem trinta segundos para responder. Coloque a metragem, os dias e quantas pessoas: o app diz se dá para trabalhar — e, se não der, já calcula quanto você deve pedir."
          destaque
        >
          <div className="mt-5 rounded-2xl bg-black/40 ring-1 ring-white/10 p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Apertado ⚠️
            </div>
            <div className="tnum text-[26px] font-extrabold mt-0.5">R$ 3.000,00</div>
            <div className="text-[13px] text-white/50">sobra pra você · 6,7%</div>
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                Peça este valor
              </div>
              <div className="tnum text-[22px] font-extrabold text-indigo-300">R$ 60.000,00</div>
            </div>
          </div>
        </Cartao>

        <Cartao
          className="md:col-span-2"
          icone={<QrCode size={22} />}
          titulo="PIX sem errar"
          texto="O app monta o código copia e cola com o valor certo de cada um. É só colar no banco."
        >
          <div className="mt-5 rounded-2xl bg-black/40 ring-1 ring-white/10 p-3.5">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-white/50">Zé Baiano</span>
              <span className="tnum font-bold text-emerald-400">R$ 600,00</span>
            </div>
            <div className="mt-2.5 font-mono text-[9.5px] leading-[1.45] text-indigo-300/70 break-all">
              00020126360014BR.GOV.BCB.PIX0114+5511987654321520400005303986540
              6600.005802BR5913JOSE DA SILVA6009SAO PAULO6304
            </div>
            <div className="mt-2.5 h-9 rounded-xl bg-indigo-500 grid place-items-center text-[12.5px] font-bold">
              Código copiado ✓
            </div>
          </div>
        </Cartao>

        <Cartao
          className="md:col-span-2"
          icone={<CalendarClock size={22} />}
          titulo="Agenda do dinheiro"
          texto="O que entra e o que sai, dia a dia. Você vê que paga na sexta e só recebe na terça — antes do aperto acontecer."
        />

        <Cartao
          className="md:col-span-2"
          icone={<Users size={22} />}
          titulo="Sua equipe no app"
          texto="Cada um vê os próprios dias e quanto tem a receber, confere a própria chave PIX e pede adiantamento. Ninguém vê seu lucro."
        />

        <Cartao
          className="md:col-span-2"
          icone={<FileSpreadsheet size={22} />}
          titulo="Pronto pro contador"
          texto="Planilha com tudo que entrou, tudo que saiu e cada pagamento com data. Chega de mandar áudio."
        />

        <Cartao
          className="md:col-span-6"
          icone={<WifiOff size={22} />}
          titulo="Funciona sem sinal"
          texto="Pavilhão de feira não tem internet, e é ali que você mais precisa marcar presença. O {MARCA.nome} grava no seu celular e sincroniza sozinho quando o sinal volta."
        />
      </div>
    </Secao>
  )
}

function Cartao({
  icone,
  titulo,
  texto,
  className = '',
  destaque,
  children,
}: {
  icone: ReactNode
  titulo: string
  texto: string
  className?: string
  destaque?: boolean
  children?: ReactNode
}) {
  return (
    <div
      className={`group relative p-6 rounded-3xl ring-1 transition ${
        destaque
          ? 'bg-gradient-to-br from-indigo-500/[0.14] to-transparent ring-indigo-400/25'
          : 'bg-white/[0.03] ring-white/[0.07] hover:bg-white/[0.05] hover:ring-white/[0.12]'
      } ${className}`}
    >
      <div
        className={`w-11 h-11 rounded-2xl grid place-items-center ${
          destaque ? 'bg-indigo-500 text-white' : 'bg-white/[0.07] text-indigo-300'
        }`}
      >
        {icone}
      </div>
      <h3 className="mt-4 text-[19px] font-bold tracking-tight">{titulo}</h3>
      <p className="mt-2 text-[15px] text-white/55 leading-relaxed">{texto}</p>
      {children}
    </div>
  )
}

/* ------------------------------ Como funciona ------------------------------ */

function ComoFunciona() {
  const passos = [
    {
      n: '1',
      titulo: 'Cadastre sua equipe',
      texto: 'Nome, apelido, quanto cada um ganha por dia e a chave PIX. Uma vez só.',
    },
    {
      n: '2',
      titulo: 'Abra a feira',
      texto: 'Quanto você recebe, quando é montagem, evento e desmontagem, e quem vai trabalhar.',
    },
    {
      n: '3',
      titulo: 'Marque quem veio',
      texto: 'Dois botões grandes, todo dia. Disso sai o custo, o pagamento e o relatório.',
    },
    {
      n: '4',
      titulo: 'Pague e veja o que sobrou',
      texto: 'O PIX de cada um sai pronto e o lucro da feira aparece na hora.',
    },
  ]

  return (
    <Secao id="como-funciona">
      <Titulo>Quatro passos. Só isso.</Titulo>
      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {passos.map((p, i) => (
          <div key={p.n} className="relative p-6 rounded-3xl bg-white/[0.03] ring-1 ring-white/[0.07]">
            <div
              className="w-11 h-11 rounded-2xl grid place-items-center text-[18px] font-extrabold"
              style={{
                backgroundImage: 'linear-gradient(135deg, #6366F1 0%, #4338CA 100%)',
                boxShadow: '0 8px 24px -8px rgba(99,102,241,.6)',
              }}
            >
              {p.n}
            </div>
            <h3 className="mt-4 text-[17px] font-bold">{p.titulo}</h3>
            <p className="mt-1.5 text-[14.5px] text-white/55 leading-relaxed">{p.texto}</p>
            {i < passos.length - 1 && (
              <ArrowRight
                size={18}
                className="hidden lg:block absolute top-9 -right-[26px] text-white/15"
              />
            )}
          </div>
        ))}
      </div>
    </Secao>
  )
}

/* ------------------------------- Número real ------------------------------- */

function NumeroReal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const alvo = ref.current
    if (!alvo) return
    const observador = new IntersectionObserver(
      ([entrada]) => entrada.isIntersecting && setVisivel(true),
      { threshold: 0.35 },
    )
    observador.observe(alvo)
    return () => observador.disconnect()
  }, [])

  const linhas = [
    ['Stand de 50 m², a R$ 60 o metro', 'R$ 3.000,00', 'text-emerald-400'],
    ['3 pessoas × 3 dias de montagem', '− R$ 1.800,00', 'text-rose-400'],
    ['Almoço da equipe', '− R$ 225,00', 'text-rose-400'],
    ['Combustível e estacionamento', '− R$ 150,00', 'text-rose-400'],
  ]

  return (
    <Secao>
      <div ref={ref} className="grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <Titulo>A conta que ninguém faz direito</Titulo>
          <p className="mt-5 text-[17px] text-white/55 leading-relaxed">
            Um stand de tapeçaria de 50 m². Parece que sobrou bastante — até somar a comida, o
            combustível e o dia a mais que a equipe ficou.
          </p>
          <p className="mt-4 text-[17px] text-white/80 leading-relaxed">
            <strong className="text-white">Margem apertada não se enxerga de cabeça.</strong> Um
            ajudante a mais ou um dia esticado derruba um terço do seu lucro.
          </p>
        </div>

        <div className="p-7 rounded-3xl bg-white/[0.04] ring-1 ring-white/10 backdrop-blur">
          {linhas.map(([rotulo, valor, cor], i) => (
            <div
              key={rotulo}
              className="flex items-center justify-between gap-4 py-3.5 border-b border-white/[0.07]"
              style={{
                opacity: visivel ? 1 : 0,
                transform: visivel ? 'none' : 'translateY(8px)',
                transition: `all .5s cubic-bezier(.2,.8,.2,1) ${i * 0.09}s`,
              }}
            >
              <span className="text-[14.5px] text-white/55">{rotulo}</span>
              <span className={`tnum text-[16px] font-bold shrink-0 ${cor}`}>{valor}</span>
            </div>
          ))}
          <div
            className="flex items-center justify-between gap-4 pt-5"
            style={{
              opacity: visivel ? 1 : 0,
              transform: visivel ? 'none' : 'translateY(8px)',
              transition: 'all .5s cubic-bezier(.2,.8,.2,1) .45s',
            }}
          >
            <span className="text-[17px] font-bold">Sobrou pra você</span>
            <span className="tnum text-[30px] font-extrabold text-emerald-400">R$ 825,00</span>
          </div>
          <div className="mt-1 text-right text-[13px] text-white/40">27,5% do que você recebeu</div>
        </div>
      </div>
    </Secao>
  )
}

/* --------------------------------- Planos --------------------------------- */

function Planos() {
  const [anual, setAnual] = useState(false)

  return (
    <Secao id="planos">
      <div className="text-center max-w-2xl mx-auto">
        <Titulo centro>Menos que meia diária por mês</Titulo>
        <p className="mt-4 text-[17px] text-white/55 leading-relaxed">
          Só de não errar um pagamento, o plano já se paga. Todos os planos incluem o acesso da
          sua equipe.
        </p>

        <div className="mt-7 inline-flex p-1 rounded-2xl bg-white/[0.06] ring-1 ring-white/10">
          {[
            ['Mensal', false],
            ['Anual · 2 meses grátis', true],
          ].map(([texto, valor]) => (
            <button
              key={String(valor)}
              onClick={() => setAnual(valor as boolean)}
              className={`px-4 sm:px-5 h-11 rounded-xl text-[14px] font-semibold transition ${
                anual === valor ? 'bg-white text-[#07080F]' : 'text-white/60 hover:text-white'
              }`}
            >
              {texto as string}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PLANOS.map((p) => (
          <div
            key={p.id}
            className={`relative p-6 rounded-3xl ring-1 flex flex-col ${
              p.recomendado
                ? 'bg-gradient-to-b from-indigo-500/[0.16] to-transparent ring-indigo-400/35'
                : 'bg-white/[0.03] ring-white/[0.07]'
            }`}
          >
            {p.recomendado && (
              <span className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-indigo-500 text-[11.5px] font-bold uppercase tracking-wide">
                Mais escolhido
              </span>
            )}
            <h3 className="text-[20px] font-extrabold">{p.nome}</h3>
            <p className="mt-1.5 text-[14px] text-white/50 leading-snug min-h-[40px]">
              {p.destaque}
            </p>

            <div className="mt-5 flex items-end gap-1.5">
              <span className="tnum text-[34px] font-extrabold leading-none">
                {moeda(anual ? Math.round(p.precoAnual / 12) : p.precoMensal)}
              </span>
              <span className="mb-1 text-[14px] text-white/45">/mês</span>
            </div>
            {anual && (
              <div className="mt-1 text-[13px] text-emerald-400 font-semibold">
                {moeda(p.precoAnual)} por ano
              </div>
            )}

            <ul className="mt-5 space-y-2.5 flex-1">
              <Item>
                {p.limiteEquipe > 999 ? 'Equipe ilimitada' : `Até ${p.limiteEquipe} pessoas`}
              </Item>
              <Item>
                {p.limiteEncarregados === 0
                  ? 'Só você na gestão'
                  : `${p.limiteEncarregados} ${p.limiteEncarregados === 1 ? 'encarregado' : 'encarregados'}`}
              </Item>
              <Item>Acesso do funcionário incluído</Item>
              <Item>PIX, relatórios e contador</Item>
            </ul>

            <Link to="/entrar" className="mt-6">
              {p.recomendado ? (
                <BotaoBrilho largura>Começar grátis</BotaoBrilho>
              ) : (
                <span className="w-full h-14 inline-flex items-center justify-center rounded-2xl font-bold text-[16px] bg-white/[0.07] ring-1 ring-white/10 hover:bg-white/[0.11] transition">
                  Começar grátis
                </span>
              )}
            </Link>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-[14px] text-white/40">
        30 dias grátis em qualquer plano. Sem cartão, sem fidelidade.
      </p>
    </Secao>
  )
}

function Item({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-[14.5px] text-white/70">
      <Check size={17} className="shrink-0 mt-0.5 text-emerald-400" />
      {children}
    </li>
  )
}

/* -------------------------------- Perguntas -------------------------------- */

function Perguntas() {
  const itens = [
    {
      p: 'Meu funcionário vai ver o quanto eu ganho?',
      r: 'Não. Ele vê só os dias que trabalhou e o quanto tem a receber. Valor de contrato e lucro nunca aparecem para ele. O encarregado só vê o financeiro se você liberar.',
    },
    {
      p: 'Funciona sem internet no pavilhão?',
      r: 'Funciona. O app grava tudo no seu celular e sincroniza sozinho quando o sinal volta. Você marca presença normalmente no meio da montagem.',
    },
    {
      p: 'O app manda o PIX sozinho?',
      r: `Ele monta o código copia e cola com o valor certo, e você cola no app do seu banco. O dinheiro nunca passa pelo ${MARCA.nome} — quem paga é você, no seu banco.`,
    },
    {
      p: 'Preciso de cartão para testar?',
      r: 'Não. São 30 dias completos sem pedir cartão. Se não gostar, é só parar de usar.',
    },
    {
      p: 'E se eu não tiver cartão de crédito?',
      r: 'Também dá para assinar no PIX. A gente sabe que boa parte dos empreiteiros trabalha só com conta digital.',
    },
    {
      p: 'Meus dados somem se eu atrasar?',
      r: 'Nunca. Assinatura vencida bloqueia lançar coisa nova, mas você continua enxergando todo o histórico.',
    },
  ]

  return (
    <Secao id="duvidas">
      <Titulo>Perguntas que todo mundo faz</Titulo>
      <div className="mt-9 max-w-3xl space-y-3">
        {itens.map((item) => (
          <Pergunta key={item.p} pergunta={item.p} resposta={item.r} />
        ))}
      </div>
    </Secao>
  )
}

function Pergunta({ pergunta, resposta }: { pergunta: string; resposta: string }) {
  const [aberta, setAberta] = useState(false)
  return (
    <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.07] overflow-hidden">
      <button
        onClick={() => setAberta((v) => !v)}
        className="w-full px-5 py-4 flex items-center gap-4 text-left"
      >
        <span className="flex-1 text-[16px] font-semibold">{pergunta}</span>
        <ChevronDown
          size={20}
          className={`shrink-0 text-white/40 transition-transform ${aberta ? 'rotate-180' : ''}`}
        />
      </button>
      {aberta && (
        <p className="px-5 pb-5 -mt-1 text-[15px] text-white/60 leading-relaxed">{resposta}</p>
      )}
    </div>
  )
}

/* ------------------------------ Chamada final ------------------------------ */

function ChamadaFinal() {
  return (
    <Secao>
      <div
        className="relative overflow-hidden rounded-[32px] px-7 py-14 sm:px-14 sm:py-20 text-center ring-1 ring-white/10"
        style={{ backgroundImage: 'linear-gradient(140deg, #312E81 0%, #1E1B4B 55%, #0B0D14 100%)' }}
      >
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(circle, #6366F1 0%, transparent 70%)' }}
          aria-hidden
        />
        <div className="relative">
          <h2 className="text-[clamp(28px,4.5vw,44px)] font-extrabold tracking-tight leading-tight">
            Comece pela próxima feira.
          </h2>
          <p className="mt-4 text-[17px] text-white/60 max-w-lg mx-auto leading-relaxed">
            Cadastre sua equipe hoje e, quando a montagem começar, você já sabe quanto vai sobrar.
          </p>
          <Link to="/entrar" className="inline-block mt-9">
            <BotaoBrilho>
              Testar 30 dias grátis <ArrowRight size={19} />
            </BotaoBrilho>
          </Link>
        </div>
      </div>
    </Secao>
  )
}

/* --------------------------------- Rodapé --------------------------------- */

function Rodape() {
  return (
    <footer className="border-t border-white/[0.07] mt-10">
      <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col sm:flex-row items-center justify-between gap-5">
        <Logo />
        <div className="flex items-center gap-5 text-[14px] text-white/45">
          <Link to="/termos" className="hover:text-white/80 transition">
            Termos e Privacidade
          </Link>
          <Link to="/entrar" className="hover:text-white/80 transition">
            Entrar
          </Link>
        </div>
        <p className="text-[13px] text-white/30">{MARCA.nome} · seu trabalho no prumo</p>
      </div>
    </footer>
  )
}

/* --------------------------------- Base --------------------------------- */

function Secao({ children, id }: { children: ReactNode; id?: string }) {
  const ref = useRef<HTMLElement>(null)
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const alvo = ref.current
    if (!alvo) return
    // Sem suporte a IntersectionObserver, mostra tudo — nunca esconder conteúdo.
    if (!('IntersectionObserver' in window)) {
      setVisivel(true)
      return
    }
    const observador = new IntersectionObserver(
      ([e]) => e.isIntersecting && setVisivel(true),
      { rootMargin: '-60px' },
    )
    observador.observe(alvo)
    return () => observador.disconnect()
  }, [])

  return (
    <section
      ref={ref}
      id={id}
      className="scroll-mt-20 max-w-6xl mx-auto px-5 py-16 sm:py-24"
      style={{
        opacity: visivel ? 1 : 0,
        transform: visivel ? 'none' : 'translateY(20px)',
        transition: 'opacity .6s cubic-bezier(.2,.8,.2,1), transform .6s cubic-bezier(.2,.8,.2,1)',
      }}
    >
      {children}
    </section>
  )
}

function Titulo({ children, centro }: { children: ReactNode; centro?: boolean }) {
  return (
    <h2
      className={`text-[clamp(28px,4.5vw,46px)] font-extrabold tracking-[-0.025em] leading-[1.08] ${
        centro ? 'text-center' : ''
      }`}
    >
      {children}
    </h2>
  )
}
