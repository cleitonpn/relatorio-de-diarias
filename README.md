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
enxerga os dados de outro. Elas sobem junto com o deploy do passo 1.

### 3. Autorizar o domínio para o login do Google

Console do Firebase → **Authentication** → **Settings** → **Domínios autorizados** →
adicionar o domínio do Hosting (`diarias-app-cd76f.web.app`) e, depois, o domínio
próprio, se você usar um.

---

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
