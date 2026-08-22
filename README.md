# Empreita — gestão de diárias para empreiteiros

Ferramenta para o empreiteiro de feiras e stands controlar **quanto ganha, quanto gasta
e quanto sobra pra ele** — e pagar a equipe pelo PIX sem errar valor.

> **Nome provisório.** "Empreita" é uma sugestão; trocar é rápido (aparece em
> `index.html`, `vite.config.ts`, `capacitor.config.ts` e na tela de login).

---

## O que já está pronto

| Área | Situação |
|---|---|
| Entrar com e-mail/senha e com Google | ✅ |
| Cadastro do negócio + 30 dias de teste grátis (sem cartão) | ✅ |
| Equipe: nome, apelido, função, diária padrão, chave PIX | ✅ |
| Feiras: por stand ou pacote fechado, com política de pagamento | ✅ |
| Stands: por m² ou valor fechado | ✅ |
| Escala em lote (pessoas × dias × fase) | ✅ |
| Lista de presença com meia/inteira/1½/dobrada | ✅ |
| Gastos: comida, combustível, estacionamento, material… | ✅ |
| Resultado: receita × custo × lucro, em linguagem de leigo | ✅ |
| Alerta "ainda cabem N diárias antes do lucro acabar" | ✅ |
| Vales/adiantamentos com desconto automático no acerto | ✅ |
| Acerto por pessoa + **PIX copia e cola** + QR + envio no WhatsApp | ✅ |
| Funciona offline (pavilhão sem sinal) | ✅ |
| Instalável como app (PWA) | ✅ |
| **Painel admin**: contas, planos, descontos, exclusão, indicações | ✅ |
| **Modo demonstração**: enche sua conta para testar todas as telas | ✅ |
| Tela do funcionário (link + PIN) | ⏳ próxima etapa |
| Perfil de encarregado | ⏳ próxima etapa |
| Cobrança pelo Mercado Pago | ⏳ próxima etapa |
| APK / Play Store | ⏳ próxima etapa |

---

## Passos que só uma pessoa pode fazer

### 1. Ligar o deploy automático (uma vez só)

Depois disso, tudo que for enviado para o repositório vai sozinho para o ar.

1. No **Console do Firebase** → engrenagem → **Configurações do projeto** →
   aba **Contas de serviço** → **Gerar nova chave privada**. Baixa um arquivo `.json`.
2. No **GitHub**, neste repositório → **Settings** → **Secrets and variables** →
   **Actions** → **New repository secret**.
3. Nome: `FIREBASE_SERVICE_ACCOUNT`. Valor: **todo o conteúdo do arquivo `.json`**
   (abra no bloco de notas, copie tudo, cole).
4. Salvar.

> ⚠️ Esse arquivo é uma senha do seu projeto. Ele vai **só** para os Secrets do
> GitHub — nunca para o chat, nunca para dentro do código.

### 2. Publicar as regras de segurança

As regras (`firestore.rules` e `storage.rules`) definem que um empreiteiro nunca
enxerga os dados de outro. **Sem elas publicadas, o Firestore nega tudo** — é o
erro `Missing or insufficient permissions` na tela de cadastro.

O workflow do passo 1 publica as regras e os índices automaticamente a cada envio.

**Para publicar agora, sem esperar o workflow:** Console do Firebase →
**Firestore Database** → aba **Regras** → apagar o conteúdo → colar o
`firestore.rules` deste repositório → **Publicar**. Repetir em **Storage** →
**Regras** com o `storage.rules`.

### 3. Autorizar o domínio para o login do Google

Console do Firebase → **Authentication** → **Settings** → **Domínios autorizados** →
adicionar o domínio do Hosting (`diarias-app-cd76f.web.app`) e, depois, o domínio
próprio, se você usar um.

---

## Painel de administração

Aparece em **Ajustes → Administração**, só para a conta de administração.

- **Contas** — todas as empresas, com situação da assinatura, dias de teste
  restantes, desconto ativo e quanto cada uma paga. Ao abrir uma conta:
  trocar de plano, mudar a situação, aplicar desconto (temporário ou vitalício),
  estender o teste em 15 ou 30 dias, aplicar a **cortesia vitalícia de beta
  tester** num toque, e **excluir a conta** (exige digitar o nome da empresa).
- **Indicações** — quem indicou quem, se o indicado já virou pagante, e o botão
  de liberar o prêmio. O botão só existe depois que o indicado paga: é isso que
  impede alguém abrir contas falsas para ganhar meses grátis.
- **Ferramentas** — o modo demonstração.

### Quem é admin

A conta raiz está fixada em `firestore.rules` e em `src/contexts/AuthContext.tsx`
(procure por `ADMIN_RAIZ`). Para trocar ou adicionar, mude nos dois lugares, ou
crie um documento em `/admins/{uid}` pelo Console do Firebase — essa coleção
**não pode ser escrita pelo app**, de propósito: não existe caminho de código
que promova alguém a administrador.

### Modo demonstração

Enche a **sua própria conta** com uma feira acontecendo agora (6 pessoas, 3 stands,
presença marcada, gastos, vales) e uma feira antiga de pacote fechado no histórico.
Serve para conferir todas as telas cheias e para demonstrar o app a um empreiteiro.

Todo registro criado tem id começando com `demo_`, e o botão **Limpar** apaga
exatamente esses — nunca encosta em dado real.

## Como o dinheiro é tratado

- **Tudo em centavos, número inteiro.** Nada de decimal quebrado.
- **Valores são congelados no lançamento.** Se a diária do Zé subir em junho, o
  relatório de março continua igual. É o que torna o histórico confiável.
- **Cada diária sabe em qual acerto foi paga.** É a trava contra pagar duas vezes.
- **Assinatura vencida nunca apaga nem esconde dado** — só bloqueia lançar coisa nova.

## O PIX

O "copia e cola" é gerado **no próprio aparelho**, sem banco e sem internet: é o
padrão BR Code (EMV) do Banco Central, montado em `src/lib/pix.ts`. O CRC16 foi
conferido contra os vetores oficiais (`123456789` → `29B1`).

O que o app **não** consegue fazer sem uma API de banco: saber se o PIX foi pago.
Por isso existe o botão "Já paguei", apertado por quem pagou.

## Google Play

O build Android sai com `VITE_PLATAFORMA=android`, que **esconde toda tela de plano,
preço e checkout**. A assinatura acontece só na web. Isso segue o padrão de "app
companheiro" (Slack, Zoom, Salesforce): sem compra dentro do app, sem comissão.

---

## Para quem for mexer no código

```bash
npm install
npm run dev        # servidor local
npm run build      # gera o site
npm run typecheck  # confere os tipos
```

**Estrutura**

```
src/
  types/       modelo de domínio (a fonte da verdade do negócio)
  lib/
    calc.ts    motor financeiro — receita, custo, lucro, acerto
    pix.ts     gerador do BR Code
    acoes.ts   todas as escritas no banco
    db.ts      referências das coleções (multi-tenant)
  hooks/       leitura em tempo real do Firestore
  components/  design system e blocos de tela
  pages/       telas
firestore.rules  isolamento entre empreiteiros (no servidor, não na tela)
```

**Regra de linguagem:** o app fala como o empreiteiro fala. É "você recebe",
"você gastou", "sobrou pra você" — nunca "receita bruta" ou "margem de contribuição".
