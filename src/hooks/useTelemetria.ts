import { useCallback, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  codigoDoErro,
  definirContexto,
  definirTela,
  enviar,
  fecharFluxo,
  iniciarFluxo,
  registrar,
  registrarErro,
  type Fluxo,
  type Tela,
} from '@/lib/telemetria'

/**
 * De rota para tela.
 *
 * A telemetria nunca guarda o caminho cru da URL: `/feiras/abc123` carrega o
 * id da feira, e id não é medida de nada. O que vale é "ele estava na tela de
 * feira".
 */
function telaDaRota(caminho: string): Tela | null {
  if (caminho === '/') return 'hoje'
  if (caminho.startsWith('/feiras/')) return 'feira'
  const primeiro = caminho.split('/')[1]
  const mapa: Record<string, Tela> = {
    feiras: 'feiras',
    dinheiro: 'dinheiro',
    equipe: 'equipe',
    pagamentos: 'pagamentos',
    ajustes: 'ajustes',
    contador: 'contador',
    'vale-a-pena': 'vale-a-pena',
    admin: 'admin',
    termos: 'termos',
  }
  return mapa[primeiro] ?? null
}

/**
 * Liga a telemetria de uso.
 *
 * Fica dentro da área logada: antes de saber de quem é o uso, evento não
 * responde pergunta nenhuma. Quem não está logado não é medido.
 */
export function useTelemetria(tela?: Tela) {
  const { perfil, empresa, ehAdmin } = useAuth()
  const { pathname } = useLocation()

  const empresaId = perfil?.empresaId ?? null
  const uid = perfil?.id ?? null
  const papel = perfil?.papel ?? null
  // Ausente (contas antigas) significa ligado. Só o "false" explícito desliga.
  const desligado = empresa?.permiteTelemetria === false

  useEffect(() => {
    if (!empresaId || !uid || !papel) {
      definirContexto(null)
      return
    }
    definirContexto({ empresaId, uid, papel, interno: ehAdmin, desligado })
  }, [empresaId, uid, papel, ehAdmin, desligado])

  // Uma vez por abertura do app.
  useEffect(() => {
    if (!empresaId) return
    registrar({
      nome: 'app_aberto',
      // Instalado na tela de início conta outra história de uso que aberto no
      // navegador: quem instalou volta, quem não instalou esquece.
      instalado: window.matchMedia('(display-mode: standalone)').matches,
      largura: Math.round(window.innerWidth),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!empresaId])

  // Navegação.
  useEffect(() => {
    const nome = tela ?? telaDaRota(pathname)
    if (nome) definirTela(nome)
  }, [pathname, tela])

  // Erro que escapou de todo mundo.
  useEffect(() => {
    const naFalha = (e: ErrorEvent) => registrarErro(codigoDoErro(e.error))
    const naPromessa = (e: PromiseRejectionEvent) => registrarErro(codigoDoErro(e.reason))
    window.addEventListener('error', naFalha)
    window.addEventListener('unhandledrejection', naPromessa)
    return () => {
      window.removeEventListener('error', naFalha)
      window.removeEventListener('unhandledrejection', naPromessa)
      void enviar()
    }
  }, [])
}

/**
 * Mede um fluxo de várias etapas.
 *
 * Devolve uma função para chamar quando o fluxo deu certo. Se a tela fechar sem
 * ela ter sido chamada, o fluxo entra como abandonado — que é justamente o
 * dado que ninguém consegue obter perguntando: o empreiteiro que abriu
 * "Escalar equipe", não entendeu e saiu não abre um chamado, ele só some.
 */
export function useFluxo(fluxo: Fluxo) {
  const concluido = useRef(false)

  useEffect(() => {
    iniciarFluxo(fluxo)
    return () => fecharFluxo(fluxo, concluido.current)
  }, [fluxo])

  return useCallback(() => {
    concluido.current = true
  }, [])
}
