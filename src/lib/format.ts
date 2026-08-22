import type { Centavos, DataISO } from '@/types'

/** R$ 1.234,56 — dinheiro sempre em centavos, nunca float. */
export function moeda(centavos: Centavos, opcoes?: { semSimbolo?: boolean }): string {
  const bruto = centavos ?? 0
  const negativo = bruto < 0
  const texto = (Math.abs(bruto) / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  // Em português o sinal vem antes do símbolo: -R$ 750,00, nunca R$ -750,00.
  if (opcoes?.semSimbolo) return negativo ? `-${texto}` : texto
  return negativo ? `-R$ ${texto}` : `R$ ${texto}`
}

/** Versão curta para números grandes em cartões: R$ 3,2 mil / R$ 1,4 mi */
export function moedaCurta(centavos: Centavos): string {
  const v = Math.abs(centavos) / 100
  const sinal = centavos < 0 ? '-' : ''
  if (v >= 1_000_000) return `${sinal}R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  if (v >= 10_000) return `${sinal}R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  return moeda(centavos)
}

/** Converte o que a pessoa digitou ("1.200,50", "1200,5", "1200") em centavos. */
export function paraCentavos(texto: string): Centavos {
  if (!texto) return 0
  const limpo = texto.replace(/[^\d,.-]/g, '')
  // Se tem vírgula, ela é o separador decimal (padrão brasileiro)
  const normalizado = limpo.includes(',')
    ? limpo.replace(/\./g, '').replace(',', '.')
    : limpo
  const numero = Number.parseFloat(normalizado)
  return Number.isFinite(numero) ? Math.round(numero * 100) : 0
}

/** Máscara progressiva para o campo de dinheiro: digita 12345 → 123,45 */
export function mascaraMoeda(texto: string): string {
  const digitos = texto.replace(/\D/g, '').slice(0, 11)
  if (!digitos) return ''
  const centavos = Number.parseInt(digitos, 10)
  return (centavos / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function percentual(fracao: number): string {
  return `${(fracao * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
}

export function metrosQuadrados(m2: number): string {
  return `${m2.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} m²`
}

/* ------------------------------- Datas ---------------------------------- */

/** Hoje no fuso local, como 'YYYY-MM-DD'. */
export function hojeISO(): DataISO {
  const agora = new Date()
  return dataParaISO(agora)
}

export function dataParaISO(data: Date): DataISO {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

/** 'YYYY-MM-DD' → Date local (sem sofrer deslocamento de fuso). */
export function isoParaData(iso: DataISO): Date {
  const [ano, mes, dia] = iso.split('-').map(Number)
  return new Date(ano, mes - 1, dia)
}

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** 12 de março */
export function dataCurta(iso: DataISO): string {
  const d = isoParaData(iso)
  return `${d.getDate()} ${MESES[d.getMonth()]}`
}

/** Quarta, 12 de março */
export function dataPorExtenso(iso: DataISO): string {
  const d = isoParaData(iso)
  return `${DIAS_SEMANA[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`
}

/** 12/03 a 18/03 */
export function periodo(inicio: DataISO, fim: DataISO): string {
  return `${dataCurta(inicio)} a ${dataCurta(fim)}`
}

/** Lista de todos os dias entre duas datas, inclusive. */
export function diasEntre(inicio: DataISO, fim: DataISO): DataISO[] {
  const dias: DataISO[] = []
  const atual = isoParaData(inicio)
  const limite = isoParaData(fim)
  while (atual <= limite && dias.length < 400) {
    dias.push(dataParaISO(atual))
    atual.setDate(atual.getDate() + 1)
  }
  return dias
}

export function somarDias(iso: DataISO, dias: number): DataISO {
  const d = isoParaData(iso)
  d.setDate(d.getDate() + dias)
  return dataParaISO(d)
}

/** "faltam 3 dias" / "hoje" / "atrasado há 2 dias" */
export function distanciaDeHoje(iso: DataISO): string {
  const alvo = isoParaData(iso).getTime()
  const hoje = isoParaData(hojeISO()).getTime()
  const dias = Math.round((alvo - hoje) / 86_400_000)
  if (dias === 0) return 'hoje'
  if (dias === 1) return 'amanhã'
  if (dias === -1) return 'ontem'
  if (dias > 1) return `em ${dias} dias`
  return `há ${Math.abs(dias)} dias`
}

/* ------------------------------- Pessoas -------------------------------- */

/** O nome que aparece nas listas: apelido se tiver, senão o primeiro nome. */
export function nomeCurto(nome: string, apelido?: string | null): string {
  if (apelido?.trim()) return apelido.trim()
  return nome.trim().split(' ')[0]
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

/** Cor estável derivada do nome, para o avatar de quem não tem foto. */
export function corDoNome(nome: string): string {
  const paleta = [
    'bg-indigo-500', 'bg-violet-500', 'bg-sky-500', 'bg-teal-500',
    'bg-emerald-500', 'bg-amber-500', 'bg-orange-500', 'bg-rose-500',
    'bg-fuchsia-500', 'bg-cyan-500',
  ]
  let soma = 0
  for (let i = 0; i < nome.length; i++) soma = (soma + nome.charCodeAt(i) * (i + 1)) % 9973
  return paleta[soma % paleta.length]
}

export function telefoneFormatado(telefone: string): string {
  const d = telefone.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return telefone
}
