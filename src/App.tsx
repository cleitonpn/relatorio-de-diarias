import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { CarregandoTela } from '@/components/ui/Estados'
import { BarraInferior } from '@/components/app/Navegacao'
import { AvisoAssinatura } from '@/components/app/AvisoAssinatura'
import { Entrar } from '@/pages/Entrar'
import { Onboarding } from '@/pages/Onboarding'
import { Hoje } from '@/pages/Hoje'
import { Feiras } from '@/pages/Feiras'
import { FeiraDetalhe } from '@/pages/FeiraDetalhe'
import { Equipe } from '@/pages/Equipe'
import { Pagamentos } from '@/pages/Pagamentos'
import { Ajustes } from '@/pages/Ajustes'
import { useVales } from '@/hooks/useDados'

export function App() {
  const { carregando, usuarioAuth, perfil, precisaOnboarding } = useAuth()

  if (carregando) return <CarregandoTela />
  if (!usuarioAuth) return <Entrar />
  if (precisaOnboarding) return <Onboarding />
  if (!perfil) return <CarregandoTela />

  return <AreaLogada />
}

function AreaLogada() {
  const { dados: valesPendentes } = useVales('SOLICITADO')

  return (
    <div className="min-h-dvh bg-canvas">
      <AvisoAssinatura />
      <Routes>
        <Route path="/" element={<Hoje />} />
        <Route path="/feiras" element={<Feiras />} />
        <Route path="/feiras/:feiraId" element={<FeiraDetalhe />} />
        <Route path="/equipe" element={<Equipe />} />
        <Route path="/pagamentos" element={<Pagamentos />} />
        <Route path="/ajustes" element={<Ajustes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BarraInferior aviso={valesPendentes.length} />
    </div>
  )
}
