# Skills IA para corretores — direção da oferta

Data: 29/09/2026. Escopo: copy, página, imagens ilustrativas, template reutilizável, rastreamento e cadastro de checkouts. Não foi produzido o material vendido.

## Referência de página

https://mentoriaoprocesso.com/modelo-03-low-ticket/ — HTML obtido diretamente, HTTP 200, 222.367 bytes. Não foi necessário Save2Zip. Foram observados 24 stylesheets e JavaScript de Elementor, jQuery, Swiper e addons. A estrutura comercial foi modelada, com implementação própria e imagens próprias. Não foram reutilizados texto comercial, depoimentos, fotografias, marcas ou bibliotecas do autor.

Mapa: hero escura centralizada e mockup; vitrine de aplicação; mecanismo; benefícios; dor; público; conteúdo; quatro bônus; Essencial e Completo; argumento de compra; modo de uso; FAQ. A referência mostra os mesmos R$27,90 e R$37,90. Retirados percentuais de preferência sem prova, depoimentos fictícios, desconto sem preço anterior praticado, contagem regressiva renovável e garantia vitalícia não autorizada.

## Pesquisa primária

- Realtor.com PRO, 28/08/2026: https://www.realtor.com/marketing/resources/50-ai-prompts-for-real-estate-agents-who-want-to-grow-faster/ — usos de IA em prospecção, perguntas de diagnóstico, acompanhamento de leads, prática de objeções e organização da semana. Fundamenta as famílias de tarefas; não foi copiada sua lista de prompts. O contexto americano não foi transferido para regras brasileiras.
- NAR: https://www.nar.realtor/news/real-estate-news/sales-marketing/from-listings-to-reels-using-ai-to-power-real-estate-marketing — reaproveitamento de informações de imóveis em peças de marketing e roteiros. Usado para a categoria de conteúdo e a lógica do bônus de reaproveitamento.
- Realtor.com PRO: https://www.realtor.com/marketing/resources/the-real-estate-agent-ai-prompt-guide-for-social-media/ — contexto do imóvel, detalhes concretos e adaptação por formato. Usado como referência de tarefa, sem promessa de alcance.
- Anthropic: https://www.anthropic.com/research/skills e https://support.claude.com/en/articles/12512176-what-are-skills — skills são conjuntos reutilizáveis de instruções e recursos. Instalação de skills e uso de instruções em texto não são equivalentes. O formato dos arquivos de skills ainda precisa ser fechado; a entrega pelo Imobiturbo Club foi confirmada pelo usuário.
- Wiapy: https://help.wiapy.com/pt-br/article/como-criar-um-checkout-e-pegar-o-link-de-venda-1omdaab/ — cadastro separa produto, preço, métodos de pagamento, suporte e links. Compra única, R$27,90 / R$37,90, sem parcelamento fictício.

## Composição aprovada

Essencial: 54 skills (9 categorias × 6 tarefas), R$27,90, pagamento único. Nomes e casos de uso em `catalogo-proposto.json`; isso é planejamento editorial, não um pacote de skills pronto.

Completo: o mesmo catálogo + quatro bônus de aplicação, R$37,90, pagamento único. Bônus: sequências de WhatsApp; um imóvel em múltiplos conteúdos; roteiro de captação; guia da primeira aplicação. Não há soma de preços fictícios. A diferença de R$10 é o argumento de valor.

A palavra “exclusivas” nomeia a futura adaptação/edição Imobiturbo, não uma alegação de que tarefas comuns ou instruções públicas sejam inéditas. Não há garantia de vendas ou lucro, tempo específico de economia, compatibilidade universal, automação de WhatsApp nem acesso à IA incluso.

## Pendências de liberação comercial

Entrega externa pelo Imobiturbo Club confirmada pelo usuário (ele criará o conteúdo depois). Fechar formato dos arquivos; disponibilizar os materiais reais e bônus no Club; vincular liberação de acesso por oferta; ajustar FAQ de compatibilidade/entrega; verificar políticas de acesso/reembolso; liberar o encaminhamento aos checkouts com `salesEnabled: true` + `fulfillmentStatus: ready` somente após esse fechamento. Esses itens dependem da entrega que ficou fora da missão, não de aprovação para editar a página.

## Wiapy preparada

Produto externo cadastrado como área de membros fora da Wiapy. Cobrança única, Pix e cartão em 1x, tema escuro, thumbnail próprio e suporte@imobiturbo.com.br verificado nos dois checkouts.

| Oferta | Valor | Checkout | ID de administração |
| --- | --- | --- | --- |
| Essencial | R$27,90 | https://pay.wiapy.com/f5uAVWx6kAkY | 6abb4f1ee384d817b42e9e2f |
| Completo | R$37,90 | https://pay.wiapy.com/ZjGp49XpjjpL | 6abb4f79e384d817b42e9f37 |

Os checkouts estão ativos no provedor após a validação de e-mail. A landing page permanece em prévia, com `salesEnabled: false` e `fulfillmentStatus: pending`, sem encaminhar compradores. Não foi feita compra nem criada integração automática de liberação no Club. A criação do conteúdo no Club ficou com Natan.

A integração “Imobiturbo Skills IA - Pixel” foi salva e relida na Wiapy com o pixel `1025303472485246`, limitada aos dois checkouts desta oferta e ao evento de pagamento aprovado. Token CAPI opcional não foi adicionado. A integração Webhook “Hub”, já existente para todos os checkouts, foi preservada. Configuração não comprova uma compra: não foi acionado pagamento nem evento Purchase de teste.

## Revisão visual em 29/09/2026

Solicitação posterior: reduzir o logo para um badge, substituir a hero por uma composição com resultado imobiliário na tela e fitas cassete, e mostrar dez capas de skills em um loop contínuo na segunda seção. A data da faixa é dinâmica no fuso de Brasília. O texto usado é “OFERTA ESPECIAL DE HOJE”, sem uma promessa de encerramento que se renova todos os dias.

As dez capas em `cassette-covers.json` são exemplos visuais de tarefas já presentes no catálogo de 54 skills. Todas foram geradas com GPT Image 2.5 a partir da mesma capa matriz, em formato 3:4 e com transparência real. O carrossel tem pausa, teclado, toque/arraste e movimento reduzido, sem biblioteca adicional. Os preços, checkouts e bloqueio de liberação comercial permanecem iguais.
