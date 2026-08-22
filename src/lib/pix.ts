/**
 * Gerador de "PIX Copia e Cola" (BR Code / EMV®QRCPS-MPM do Banco Central).
 *
 * Roda 100% no dispositivo: não depende de banco, de API nem de internet.
 * O que sai daqui é a mesma string que o app do banco lê quando você cola.
 */

import type { Centavos, TipoChavePix } from '@/types'

/* --------------------------- IDs do padrão EMV --------------------------- */
const ID_PAYLOAD_FORMAT = '00'
const ID_MERCHANT_ACCOUNT = '26'
const ID_MERCHANT_GUI = '00'
const ID_MERCHANT_CHAVE = '01'
const ID_MERCHANT_DESCRICAO = '02'
const ID_MERCHANT_CATEGORY = '52'
const ID_CURRENCY = '53'
const ID_AMOUNT = '54'
const ID_COUNTRY = '58'
const ID_MERCHANT_NAME = '59'
const ID_MERCHANT_CITY = '60'
const ID_ADDITIONAL_DATA = '62'
const ID_TXID = '05'
const ID_CRC = '63'

const GUI_PIX = 'BR.GOV.BCB.PIX'

/** Monta um campo EMV: id + tamanho (2 dígitos) + valor. */
function campo(id: string, valor: string): string {
  const tamanho = valor.length.toString().padStart(2, '0')
  return `${id}${tamanho}${valor}`
}

/**
 * CRC16/CCITT-FALSE — polinômio 0x1021, inicial 0xFFFF, sem reflexão.
 * É o checksum que o Banco Central exige no fim do payload.
 */
export function crc16(texto: string): string {
  let crc = 0xffff
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/** Remove acentos e caracteres que o padrão não aceita em nome/cidade. */
function sanitizarTexto(valor: string, tamanhoMax: number): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // tira acentos
    .replace(/[^A-Za-z0-9 ]/g, '') // só letras, números e espaço
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase()
    .slice(0, tamanhoMax)
}

/** O txid aceita apenas alfanumérico, até 25 caracteres. */
function sanitizarTxid(valor: string): string {
  const limpo = valor.replace(/[^A-Za-z0-9]/g, '').slice(0, 25)
  return limpo.length > 0 ? limpo : '***'
}

/**
 * Normaliza a chave conforme o tipo.
 * O banco recusa o código se a chave não vier no formato canônico.
 */
export function normalizarChavePix(chave: string, tipo: TipoChavePix): string {
  const bruta = chave.trim()
  switch (tipo) {
    case 'CPF':
    case 'CNPJ':
      return bruta.replace(/\D/g, '')
    case 'TELEFONE': {
      const digitos = bruta.replace(/\D/g, '')
      // Formato exigido: +55 + DDD + número
      const semPais = digitos.startsWith('55') && digitos.length > 11 ? digitos.slice(2) : digitos
      return `+55${semPais}`
    }
    case 'EMAIL':
      return bruta.toLowerCase()
    case 'ALEATORIA':
      return bruta.toLowerCase()
    default:
      return bruta
  }
}

/** Valida a chave antes de gerar — erro aqui é dinheiro indo para a pessoa errada. */
export function validarChavePix(chave: string, tipo: TipoChavePix): string | null {
  const valor = normalizarChavePix(chave, tipo)
  switch (tipo) {
    case 'CPF':
      return valor.length === 11 ? null : 'CPF precisa ter 11 números'
    case 'CNPJ':
      return valor.length === 14 ? null : 'CNPJ precisa ter 14 números'
    case 'TELEFONE':
      return /^\+55\d{10,11}$/.test(valor) ? null : 'Telefone precisa ter DDD + número'
    case 'EMAIL':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor) ? null : 'E-mail inválido'
    case 'ALEATORIA':
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(valor)
        ? null
        : 'Chave aleatória inválida (formato com traços)'
    default:
      return 'Escolha o tipo da chave'
  }
}

export interface DadosPix {
  chave: string
  tipoChave: TipoChavePix
  /** Nome de quem recebe — o padrão corta em 25 caracteres. */
  nomeRecebedor: string
  cidade: string
  /** Em centavos. Omitir/0 gera um código sem valor definido. */
  valor?: Centavos
  /** Identificador do pagamento (aparece no extrato). */
  txid?: string
  /** Texto livre curto que alguns bancos exibem. */
  descricao?: string
}

/**
 * Gera a string do "copia e cola".
 *
 * Observação honesta: este é um QR **estático com valor**. Os apps de banco
 * aceitam, mas alguns exibem o valor como sugestão editável — a confirmação
 * final é sempre de quem paga.
 */
export function gerarPixCopiaECola(dados: DadosPix): string {
  const chave = normalizarChavePix(dados.chave, dados.tipoChave)

  // Conta de merchant: GUI + chave (+ descrição, se couber nos 99 caracteres)
  let merchant = campo(ID_MERCHANT_GUI, GUI_PIX) + campo(ID_MERCHANT_CHAVE, chave)
  if (dados.descricao) {
    const descricao = sanitizarTexto(dados.descricao, 72)
    const comDescricao = merchant + campo(ID_MERCHANT_DESCRICAO, descricao)
    if (comDescricao.length <= 99) merchant = comDescricao
  }

  const nome = sanitizarTexto(dados.nomeRecebedor || 'RECEBEDOR', 25) || 'RECEBEDOR'
  const cidade = sanitizarTexto(dados.cidade || 'BRASIL', 15) || 'BRASIL'
  const txid = sanitizarTxid(dados.txid ?? '')

  let payload =
    campo(ID_PAYLOAD_FORMAT, '01') +
    campo(ID_MERCHANT_ACCOUNT, merchant) +
    campo(ID_MERCHANT_CATEGORY, '0000') +
    campo(ID_CURRENCY, '986')

  if (dados.valor && dados.valor > 0) {
    payload += campo(ID_AMOUNT, (dados.valor / 100).toFixed(2))
  }

  payload +=
    campo(ID_COUNTRY, 'BR') +
    campo(ID_MERCHANT_NAME, nome) +
    campo(ID_MERCHANT_CITY, cidade) +
    campo(ID_ADDITIONAL_DATA, campo(ID_TXID, txid))

  // O CRC é calculado sobre o payload já contendo "6304"
  const comMarcador = payload + ID_CRC + '04'
  return comMarcador + crc16(comMarcador)
}
