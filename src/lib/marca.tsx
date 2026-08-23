/**
 * Identidade do produto, num lugar só.
 *
 * O nome já mudou uma vez e pode mudar de novo — enquanto não houver registro
 * de marca, ele é uma decisão em aberto. Concentrar aqui faz a próxima troca
 * ser uma linha, e não uma caçada por seis arquivos.
 *
 * Fora daqui, o nome ainda aparece em três lugares que o código não alcança:
 * index.html (título da aba), vite.config.ts (manifesto do PWA) e
 * capacitor.config.ts (appId do Android — este NÃO pode mudar depois de
 * publicar na Play Store).
 */
export const MARCA = {
  nome: 'Prumo',
  assinatura: 'Seu trabalho no prumo.',
  descricao: 'Controle de feiras, equipe, diárias e pagamentos para empreiteiros.',
  /** Aparece na tela de login, abaixo do nome. */
  chamada: 'Seu trabalho no prumo: feiras, equipe e o quanto sobra pra você.',
} as const

/** O desenho do prumo: barra, fio e peso. */
export function SimboloMarca({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path d="M25 13h14" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M32 13v17" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M32 30l9 11-9 12-9-12z" fill="currentColor" />
    </svg>
  )
}
