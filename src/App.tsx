import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { CarregandoTela } from '@/components/ui/Estados'
import { BarraInferior, MenuLateral } from '@/components/app/Navegacao'
import { AvisoAssinatura } from '@/components/app/AvisoAssinatura'
import { Entrar } from '@/pages/Entrar'
import { Home } from '@/pages/site/Home'
import { Onboarding } from '@/pages/Onboarding'
import { Hoje } from '@/pages/Hoje'
import { Feiras } from '@/pages/Feiras'
import { FeiraDetalhe } from '@/pages/FeiraDetalhe'
import { Equipe } from '@/pages/Equipe'
import { MeuDinheiro } from '@/pages/MeuDinheiro'
import { Pagamentos } from '@/pages/Pagamentos'
import { Ajustes } from '@/pages/Ajustes'
import { Admin } from '@/pages/Admin'
import { EntrarPorConvite } from '@/pages/EntrarPorConvite'
import { MinhaConta } from '@/pages/MinhaConta'
import { Contador } from '@/pages/Contador'
import { Termos } from '@/pages/Termos'
import { ValeAPena } from '@/pages/ValeAPena'
import { AdminSemConta } from '@/pages/AdminSemConta'
import { useVales } from '@/hooks/useDados'
import { usePapel } from '@/contexts/AuthContext'

export function App() {
  const { carregando, usuarioAuth, perfil, precisaOnboarding, ehAdmin } = useAuth()

  // O convite é público: quem recebe o link ainda não tem conta nem perfil.
  if (window.location.pathname.startsWith('/convite/')) {
    return (
      <Routes>
        <Route path="/convite/:codigo" element={<EntrarPorConvite />} />
      </Routes>
    )
  }

  if (carregando) return <CarregandoTela />

  // Quem não está logado vê o site, não o formulário de login. A porta de
  // entrada precisa apresentar o produto antes de pedir alguma coisa.
  if (!usuarioAuth) return <AreaPublica />
  // Administrar a plataforma não exige ter um negócio cadastrado.
  if (precisaOnboarding) return ehAdmin ? <AdminSemConta /> : <Onboarding />
  if (!perfil) return <CarregandoTela />

  // Funcionário tem um app próprio: só a vida dele, sem nada da gestão.
  if (perfil.papel === 'COLABORADOR') return <MinhaConta />

  return <AreaLogada />
}

function AreaPublica() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/entrar" element={<Entrar />} />
      <Route path="/termos" element={<TermosPublicos />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

/** Os termos precisam ser legíveis por quem ainda não tem conta. */
function TermosPublicos() {
  return (
    <div className="min-h-dvh bg-canvas">
      <Termos />
    </div>
  )
}

function AreaLogada() {
  const { dados: valesPendentes } = useVales('SOLICITADO')
  // O encarregado enxerga o lucro só se o dono liberar. Esconder o menu é
  // conveniência; quem barra de verdade são as regras do Firestore.
  const { veFinanceiro } = usePapel()

  return (
    <div className="min-h-dvh bg-canvas">
      <MenuLateral veFinanceiro={veFinanceiro} />
      {/* Abre espaço para o menu lateral só a partir de tela grande */}
      <div className="lg:pl-64">
        <AvisoAssinatura />
        <Routes>
          <Route path="/" element={<Hoje />} />
          <Route path="/feiras" element={<Feiras />} />
          <Route path="/feiras/:feiraId" element={<FeiraDetalhe />} />
          <Route
            path="/dinheiro"
            element={veFinanceiro ? <MeuDinheiro /> : <Navigate to="/" replace />}
          />
          <Route path="/equipe" element={<Equipe />} />
          <Route path="/pagamentos" element={<Pagamentos />} />
          <Route path="/ajustes" element={<Ajustes />} />
          <Route path="/termos" element={<Termos />} />
          <Route
            path="/vale-a-pena"
            element={veFinanceiro ? <ValeAPena /> : <Navigate to="/" replace />}
          />
          <Route
            path="/contador"
            element={veFinanceiro ? <Contador /> : <Navigate to="/" replace />}
          />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <BarraInferior aviso={valesPendentes.length} veFinanceiro={veFinanceiro} />
    </div>
  )
}
