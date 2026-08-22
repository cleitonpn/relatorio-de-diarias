import { useState } from 'react'
import { Building2, LogOut, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Admin } from './Admin'
import { Onboarding } from './Onboarding'

/**
 * Entrada do administrador que ainda não tem conta de empreiteiro.
 *
 * Admin e empreiteiro são papéis diferentes: administrar a plataforma não
 * exige ter um negócio cadastrado. Mas para testar as telas do app (e usar o
 * modo demonstração) é preciso uma conta — então ela fica a um toque, como
 * escolha, nunca como pedágio.
 */
export function AdminSemConta() {
  const { sair, usuarioAuth } = useAuth()
  const [criandoConta, setCriandoConta] = useState(false)

  if (criandoConta) return <Onboarding aoVoltar={() => setCriandoConta(false)} />

  return (
    <div className="min-h-dvh bg-canvas">
      <div className="bg-ink text-canvas px-4 py-2.5 safe-top">
        <div className="max-w-2xl lg:max-w-3xl mx-auto flex items-center gap-2 text-[13px] font-semibold">
          <ShieldCheck size={16} className="shrink-0" />
          <span className="flex-1 truncate">
            Administração da plataforma · {usuarioAuth?.email}
          </span>
          <button onClick={sair} className="shrink-0 flex items-center gap-1 opacity-80">
            <LogOut size={14} /> Sair
          </button>
        </div>
      </div>

      <Admin />

      <div className="max-w-2xl lg:max-w-3xl mx-auto px-4 pb-10">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="shrink-0 w-11 h-11 rounded-2xl bg-brand-soft text-brand-ink grid place-items-center">
              <Building2 size={20} />
            </div>
            <div>
              <div className="font-bold text-[16px]">Sua conta de teste</div>
              <div className="text-[13.5px] text-muted">Para conferir o app por dentro</div>
            </div>
          </div>
          <p className="text-[13px] text-muted leading-relaxed">
            Você não precisa de uma conta de empreiteiro para administrar a plataforma. Mas
            criando uma, você usa o app exatamente como o empreiteiro usa — e o modo
            demonstração enche ela de dados para você testar todas as telas.
          </p>
          <button onClick={() => setCriandoConta(true)} className="btn-primary w-full mt-4">
            Criar minha conta de teste
          </button>
        </div>
      </div>
    </div>
  )
}
