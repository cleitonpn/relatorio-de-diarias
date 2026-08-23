/**
 * Termos de Uso e Política de Privacidade.
 *
 * ATENÇÃO: este é um texto de partida, escrito para cobrir o que o produto
 * realmente faz. Antes de cobrar do primeiro cliente pagante, ele precisa
 * passar por um advogado — sobretudo a parte de LGPD, porque a plataforma
 * armazena CPF e chave PIX de terceiros (a equipe do empreiteiro).
 */

import { MARCA } from './marca'

/** Toda mudança relevante sobe a versão e pede aceite de novo. */
export const VERSAO_TERMOS = '2026-08-2'

export interface Secao {
  titulo: string
  paragrafos: string[]
}

export const TERMOS: Secao[] = [
  {
    titulo: `1. O que é o ${MARCA.nome}`,
    paragrafos: [
      `O ${MARCA.nome} é um aplicativo de gestão para empreiteiros: cadastro de feiras e stands, escala de equipe, controle de presença, gastos, resultado e apoio ao pagamento das diárias.`,
      `O ${MARCA.nome} é uma ferramenta de organização. Ele não presta serviço financeiro, não é instituição de pagamento, não intermedia nem custodia dinheiro. Os códigos PIX que o app gera são montados no seu aparelho e o pagamento acontece inteiramente dentro do aplicativo do seu banco.`,
    ],
  },
  {
    titulo: '2. Sua conta',
    paragrafos: [
      'Você é responsável pelo acesso à sua conta e por quem você convida para dentro dela. Ao dar acesso a um encarregado ou funcionário, você decide o que cada um enxerga.',
      'Os dados que você lança são seus. Você pode exportá-los a qualquer momento pela tela do contador, e pode pedir a exclusão da conta.',
    ],
  },
  {
    titulo: '3. Teste grátis e assinatura',
    paragrafos: [
      'O primeiro acesso dá direito a 30 dias de uso gratuito, sem necessidade de cartão.',
      'Terminado o teste, o uso depende de assinatura mensal ou anual, conforme o plano escolhido. Os preços vigentes ficam visíveis dentro do aplicativo antes da contratação.',
      'A assinatura é renovada automaticamente até que você cancele. O cancelamento pode ser feito a qualquer momento e vale para o próximo ciclo — o período já pago continua disponível.',
      'Conforme o artigo 49 do Código de Defesa do Consumidor, você pode desistir da contratação em até 7 dias corridos, contados da assinatura, com devolução integral do valor pago.',
    ],
  },
  {
    titulo: '4. Quando o pagamento falha',
    paragrafos: [
      'Se a cobrança não for concluída, você tem alguns dias de tolerância para regularizar.',
      'Passado esse prazo, a conta entra em modo somente leitura: você continua enxergando tudo que já lançou, mas não consegue registrar coisas novas até regularizar.',
      'Falta de pagamento não apaga nem esconde seus dados.',
    ],
  },
  {
    titulo: '5. Os dados da sua equipe',
    paragrafos: [
      `Ao cadastrar sua equipe, você insere dados pessoais de terceiros — nome, telefone, CPF e chave PIX. Para a Lei Geral de Proteção de Dados (Lei 13.709/2018), nessa relação VOCÊ é o controlador desses dados e o ${MARCA.nome} é o operador: nós tratamos esses dados seguindo as suas instruções, para executar o serviço.`,
      'Isso significa que cabe a você ter a autorização das pessoas que você cadastra, e usar esses dados apenas para o fim de organizar e pagar o trabalho delas.',
      'Cada funcionário com acesso ao aplicativo pode conferir e corrigir os próprios dados.',
    ],
  },
  {
    titulo: '6. Segurança e privacidade',
    paragrafos: [
      'Cada empreiteiro só enxerga os próprios dados. O isolamento entre contas é aplicado no servidor, não apenas na tela do aplicativo.',
      'Não vendemos, alugamos nem compartilhamos seus dados ou os da sua equipe com terceiros para fins comerciais.',
      `A equipe técnica do ${MARCA.nome} pode acessar dados de uma conta apenas para investigar um problema relatado por você, ou quando exigido por ordem judicial.`,
      'Nenhum sistema é imune a falhas. Fazemos o possível para proteger seus dados, mas não podemos garantir segurança absoluta.',
    ],
  },
  {
    titulo: '7. Dados de uso do aplicativo',
    paragrafos: [
      `Para saber onde o aplicativo está difícil de usar, o ${MARCA.nome} registra o caminho que você faz dentro dele: quais telas você abre, quais cadastros você começa e não termina, quanto tempo leva cada etapa e quais erros aparecem na sua tela.`,
      `Esse registro NÃO inclui valores em dinheiro, nomes de pessoas, de feiras ou de contratantes, chave PIX, CPF, telefone, foto, nem qualquer texto que você digite. O que é enviado é contagem: "cadastrou uma feira de 3 dias", nunca "cadastrou a feira X por R$ 3.000".`,
      `A base legal para esse tratamento é o legítimo interesse (art. 7º, IX, da Lei 13.709/2018), e a finalidade é uma só: corrigir e melhorar o próprio aplicativo. Esses dados não são vendidos nem compartilhados com terceiros, e o registro detalhado é apagado automaticamente após 90 dias.`,
      'Você pode desligar essa coleta quando quiser, em Ajustes → Ajudar a melhorar o aplicativo. Desligar não muda nada no funcionamento do aplicativo nem no seu plano.',
    ],
  },
  {
    titulo: '8. Limites de responsabilidade',
    paragrafos: [
      `Os cálculos do ${MARCA.nome} dependem do que você lança. Valores errados na entrada geram resultados errados na saída. Confira os números antes de pagar alguém ou fechar um contrato.`,
      `O ${MARCA.nome} não confirma se um PIX foi pago — quem confirma é você, no seu banco. O aplicativo apenas registra o que você marcou como pago.`,
      `O ${MARCA.nome} não substitui contador, advogado ou qualquer aconselhamento profissional. Os relatórios servem como organização, não como escrituração contábil oficial.`,
      'Não nos responsabilizamos por prejuízos decorrentes de decisões comerciais tomadas com base nas informações do aplicativo, nem por indisponibilidade temporária do serviço.',
    ],
  },
  {
    titulo: '9. Uso correto',
    paragrafos: [
      `Não é permitido usar o ${MARCA.nome} para atividade ilícita, cadastrar dados de pessoas sem autorização delas, tentar acessar contas de terceiros ou prejudicar o funcionamento do serviço.`,
      'O descumprimento pode levar à suspensão da conta.',
    ],
  },
  {
    titulo: '10. Mudanças nestes termos',
    paragrafos: [
      'Estes termos podem ser atualizados. Mudanças relevantes serão avisadas dentro do aplicativo, e o uso continuado após o aviso significa concordância.',
      'A versão vigente fica sempre disponível dentro do aplicativo.',
    ],
  },
  {
    titulo: '11. Foro e contato',
    paragrafos: [
      'Aplica-se a legislação brasileira. Fica eleito o foro do domicílio do consumidor para resolver eventuais conflitos.',
      'Dúvidas, pedidos de exclusão de dados ou exercício de direitos previstos na LGPD podem ser encaminhados ao suporte dentro do aplicativo.',
    ],
  },
]
