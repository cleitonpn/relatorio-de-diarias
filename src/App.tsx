import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { CarregandoTela } from '@/components/ui/Estados'
import { BarraInferior, MenuLateral } from '@/components/app/Navegacao'
import { AvisoAssinatura } from '@/components/app/AvisoAssinatura'
import { Entrar } from '@/pages/Entrar'
import { Onboarding } from '@/pages/Onboarding'
import { Hoje } from '@/pages/Hoje'
import { Feiras } from '@/pages/Feiras'
import { FeiraDetalhe } from '@/pages/FeiraDetalhe'
import { Equipe } from '@/pages/Equipe'
import { MeuDinheiro } from '@/pages/MeuDinheiro'
import { Pagamentos } from '@/pages/Pagamentos'
import { Ajustes } from '@/pages/Ajustes'
import { Admin } from '@/pages/Admin'
import { AdminSemConta } from '@/pages/AdminSemConta'
import { useVales } from '@/hooks/useDados'

export function App() {
  const { carregando, usuarioAuth, perfil, precisaOnboarding, ehAdmin } = useAuth()

  if (carregando) return <CarregandoTela />
  if (!usuarioAuth) return <Entrar />
  // Administrar a plataforma não exige ter um negócio cadastrado.
  if (precisaOnboarding) return ehAdmin ? <AdminSemConta /> : <Onboarding />
  if (!perfil) return <CarregandoTela />

  return <AreaLogada />
}

function AreaLogada() {
  const { dados: valesPendentes } = useVales('SOLICITADO')

  return (
    <div className="min-h-dvh bg-canvas">
      <MenuLateral />
      {/* Abre espaço para o menu lateral só a partir de tela grande */}
      <div className="lg:pl-64">
        <AvisoAssinatura />
        <Routes>
          <Route path="/" element={<Hoje />} />
          <Route path="/feiras" element={<Feiras />} />
          <Route path="/feiras/:feiraId" element={<FeiraDetalhe />} />
          <Route path="/dinheiro" element={<MeuDinheiro />} />
          <Route path="/equipe" element={<Equipe />} />
          <Route path="/pagamentos" element={<Pagamentos />} />
          <Route path="/ajustes" element={<Ajustes />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <BarraInferior aviso={valesPendentes.length} />
    </div>
  )
}
