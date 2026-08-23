# Prumo — gestão de diárias para empreiteiros

> *Seu trabalho no prumo.*

Ferramenta para o empreiteiro de feiras e stands controlar **quanto ganha, quanto gasta
e quanto sobra pra ele** — e pagar a equipe pelo PIX sem errar valor.

> **Verificar antes do lançamento comercial:** disponibilidade de `prumo.com.br`
> no registro.br e busca de marca no INPI. Trocar o nome depois de publicar na
> Play Store dá dor de cabeça por causa do `appId` (`br.com.prumo.app`).

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
| **Meu dinheiro**: consolidado por período, todas as feiras juntas | ✅ |
| Alerta "ainda cabem N diárias antes do lucro acabar" | ✅ |
| Vales/adiantamentos com desconto automático no acerto | ✅ |
| Acerto por pessoa + **PIX copia e cola** + QR + envio no WhatsApp | ✅ |
| Funciona offline (pavilhão sem sinal) | ✅ |
| Instalável como app (PWA) | ✅ |
| Layout de desktop com menu lateral | ✅ |
| Nome próprio editável (independente da conta Google) | ✅ |
| **Painel admin**: contas, planos, descontos, exclusão, indicações | ✅ |
| **Modo demonstração**: enche sua conta para testar todas as telas | ✅ |
| Tela do funcionário (convite + Google) | ✅ |
| Perfil de encarregado, com chave do financeiro | ✅ |
| **Relatório para o contador** (planilha + WhatsApp) | ✅ |
| **"Vale a pena?"** — calculadora de proposta | ✅ |
| Termos de Uso e aceite no cadastro | ✅ |
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

### 4. Ligar a limpeza automática da telemetria

O registro detalhado de uso (`uso_lotes`) tem prazo de validade: cada documento
já nasce com um campo `expiraEm`. Falta dizer ao Firestore para respeitá-lo,
senão ele guarda para sempre e só cobra armazenamento à toa.

Console do Firebase → **Firestore Database** → aba **TTL** → **Criar política**:

- Grupo de coleções: `uso_lotes`
- Campo de carimbo de data/hora: `expiraEm`

Pronto. O Google apaga sozinho, de graça, depois de 90 dias. O resumo diário
(`uso_diario`) é minúsculo e fica.

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
- **Uso** — como o app está sendo usado: o funil do cadastro até pagar alguém,
  quais formulários as pessoas abrem e não terminam, quais telas elas abrem,
  quais erros elas veem, e a lista de **quem ligar** (contas que usaram o app e
  nunca chegaram a fechar um pagamento). Ao tocar numa conta travada, aparece a
  sequência crua do que ela fez — é ali que "parou em cadastrar a feira" vira
  "abriu escalar equipe três vezes e saiu nas três". Nenhum valor em dinheiro
  aparece nesta aba; ver *Dados de uso* mais abaixo.
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

## Dados de uso (telemetria)

O app mede a si mesmo, porque a aposta do produto é que um empreiteiro consegue
usá-lo sozinho — e quem não consegue não escreve para reclamar, some.

**O que é registrado:** quais telas ele abre, quais formulários ele começa e não
termina (e em quanto tempo desiste), quais erros aparecem na tela dele, e os
marcos do caminho — cadastrou equipe, cadastrou feira, escalou, fechou um
pagamento.

**O que nunca é registrado:** valor em dinheiro (nenhum), nome de pessoa, de
empresa, de feira ou de contratante, chave PIX, CPF, telefone, foto, e qualquer
texto digitado pelo usuário.

Isso não é promessa de comentário: o tipo `Evento`, em `src/lib/telemetria.ts`,
é uma união fechada em que cada campo é número, booleano ou string de lista
fechada. **Não existe assinatura de evento em que caiba um valor ou um nome** —
o TypeScript recusa antes de compilar. Foi a única forma de garantia que
sobrevive a pressa e a mim mesmo daqui a seis meses.

Onde isso aparece:

| Arquivo | Papel |
| --- | --- |
| `src/lib/telemetria.ts` | o vocabulário fechado, o buffer e o envio |
| `src/lib/uso.ts` | a leitura: funil, abandono, telas, erros |
| `src/pages/AdminUso.tsx` | o painel (**Administração → Uso**) |

Detalhes que importam:

- **Offline primeiro.** Sem sinal, nada é enviado — o buffer fica no aparelho
  (teto de 300 eventos) e sobe quando a internet volta. Telemetria nunca disputa
  a fila de sincronização com a diária que ele acabou de lançar.
- **Dois documentos por envio, não um por clique.** Um lote com a sequência
  (`uso_lotes`, apagado em 90 dias) e um contador do dia por conta
  (`uso_diario`, o que o painel lê).
- **Só a administração lê.** As regras do Firestore não liberam essas coleções
  para ninguém mais.
- **O dono desliga quando quiser**, em Ajustes → *Ajudar a melhorar o app*. Está
  na cláusula 7 dos termos, com a base legal (legítimo interesse, art. 7º IX da
  LGPD) e a finalidade.
- **As contas internas ficam de fora dos números** por padrão — quem mais clica
  no app é quem menos representa o cliente.

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

**Telas em duas larguras:** no celular, barra de abas embaixo (onde o polegar
alcança); a partir de `lg`, menu lateral fixo e coluna mais larga. É o mesmo
código — só o `MenuLateral` e a `BarraInferior` se revezam.

**Regra de linguagem:** o app fala como o empreiteiro fala. É "você recebe",
"você gastou", "sobrou pra você" — nunca "receita bruta" ou "margem de contribuição".
