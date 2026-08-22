/**
 * Onde o app está rodando.
 *
 * O build Android sai SEM telas de plano, preço ou checkout: a política de
 * pagamentos do Google Play cobra comissão quando a compra acontece dentro do
 * app, e direcionar para pagamento externo ("steering") pode tirar o app da
 * loja. Na web, a assinatura aparece normalmente.
 */
export const PLATAFORMA = (import.meta.env.VITE_PLATAFORMA ?? 'web') as 'web' | 'android'

export const mostraCobranca = PLATAFORMA === 'web'

export const ehAndroidNativo =
  typeof window !== 'undefined' &&
  // @ts-expect-error — injetado pelo Capacitor em tempo de execução
  window.Capacitor?.isNativePlatform?.() === true
