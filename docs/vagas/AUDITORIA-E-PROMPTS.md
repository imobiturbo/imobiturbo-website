# LP vagas — auditoria de conteúdo e prompts de preenchimento

Estado: versão visual e código de prévia. Os 13 módulos foram prototipados em 37 quadros antes do HTML/CSS. Os campos abaixo foram mantidos visíveis por instrução dos prompts, não são falhas de carregamento. Não publicar como oferta contratável enquanto condições e checkout estiverem pendentes.

## O que falta em cada seção

| Seção | Material ou decisão necessária | Tratamento na prévia |
|---|---|---|
| 01 Hero | Gravação atual de apresentação, poster e eventual prova social aprovada | Vídeo 16:9 e bloco de prova identificados; CTA leva à oferta |
| 02 Processo | Nenhuma mídia real | Diagramas abstratos intencionais, feitos em HTML/CSS |
| 03 OS | Captura atual ou vídeo real do CRM, com contexto legível e dados pessoais removidos antes de anexar | Área 16:9 reservada; três anotações editoriais |
| 04 WhatsApp | Tarefa real e exatamente três mensagens: contato, IA, continuação; exemplo aprovado e sem dados pessoais | Balões pendentes, sem conversa fabricada |
| 05 Club | Aula real, trecho de orientação por IA e exercício real; lista efetiva das gravações disponibilizadas | Aula 16:9 e dois campos textuais; acesso ao vivo explicitamente excluído |
| 06 Apoio | Dúvida real, resposta real, artigo/trecho e destino do guia | Campos identificados; 24h corresponde à IA |
| 07 Natan | Retrato apropriado, apresentação profissional e três evidências com contexto/origem | Foto 4:5 e campos pendentes |
| 08 Relatos | Três relatos aprovados, nomes, contexto, origem; mídia do relato 01 | Três cards; primeiro com 16:9; sem estrelas, avatares ou citações inventadas |
| 09 Perfil | Nenhuma mídia | Limites e perfil preservados conforme os prompts |
| 10 Assinatura | Preço, periodicidade, acesso, limites da IA, custos externos, garantia, cancelamento, destino do checkout | Um card, contratação desabilitada e aviso próximo |
| 11 FAQ | Disponibilidade de Radar / Ads / Sites / Clone e condições comerciais ainda sem confirmação | Oito perguntas; primeira aberta; respostas 2–5 usam fatos dos próprios prompts; 6–8 indicam pendências |
| 12 Encerramento | Nenhuma mídia | CTA funcional para a seção da assinatura |
| 13 Rodapé | Canal oficial, identificação jurídica, ano e seleção dos destinos institucionais | Textos pendentes, sem links fictícios |

O website antigo informa condições diferentes, inclusive mentoria semanal ao vivo e valores de planos. Não foram transportadas para a nova oferta: os prompts novos excluem acesso ao vivo e deixam condições comerciais em aberto. Isso é uma decisão a reconciliar antes de ativar a contratação, não um erro a corrigir por inferência.

## Material que já existe para avaliar

Não é necessário começar pedindo todos os arquivos de novo. O backup e o checkout preservam estes candidatos:

- `vagas/assets/hero-vsl-poster.webp` (1010×564) e `.jpg` (1376×768).
- `vagas/assets/natan-stage-mentoria.webp` (960×536) e `natan-placa-100m.webp` (700×700).
- `vagas/assets/testimonials/resultados-01.webp` a `03.webp` e `testimonials/gallery/`.
- Arquivos `student-*.webp`, `broker-*.webp` e `preview-*.webp`.
- Rotas jurídicas existentes: `/termos-de-servico/`, `/politica-de-privacidade/`, `/exclusao-de-dados/`.

São candidatos, não aprovação automática. Confirmar se a imagem mostra o produto atual, se o relato está autorizado e se a afirmação ainda se aplica. A foto da placa não deve introduzir uma alegação financeira sem contexto confirmado. Uma captura antiga de produto não comprova a interface atual.

## Dimensões dos assets finais

O formato do **asset** não é o formato da **prancheta mobile**. As pranchetas são 9:16; vídeos da página continuam 16:9 também no celular. Gerar uma imagem por chamada e conferir a resolução real do arquivo retornado.

| Uso | Desktop recomendado | Mobile recomendado | Composição |
|---|---|---|---|
| Poster da apresentação | 1920 × 1080 | 960 × 540 | 16:9; enquadramento mobile mais próximo, menos detalhe periférico |
| Demonstração OS | 1920 × 1080 | 1152 × 648 | 16:9; escolher uma região real do CRM com texto legível, sem miniaturizar o dashboard inteiro |
| Aula Club | 1600 × 900 | 960 × 540 | 16:9; frame da aula real, sem capas ou nomes inventados |
| Retrato Natan | 1200 × 1500 | 720 × 900 | 4:5; preservar rosto e gesto; não expandir cenário por invenção |
| Relato 01 em vídeo | 1200 × 675 | 960 × 540 | 16:9; pessoa/frame real autorizado |
| Trecho de guia | 1200 × 800 | 768 × 512 | 3:2 quando a captura permitir; pode usar altura natural para legibilidade |

Entrega web: WebP otimizado, com dimensões declaradas e `srcset`/`sizes` ou `<picture>` quando os enquadramentos diferirem. Guardar originais sem perdas. Capturas, textos de chat, depoimentos e condições devem permanecer como imagem original ou texto HTML editável; o resultado generativo nunca substitui a fonte factual.

## Prompts para GPT Image 2.5

Usar o executor Codex/OAuth já configurado. Não usar API paga. Anexar o asset real e a referência `lp-vagas-reference.png`. Esses prompts geram **somente o asset a inserir**, sem desenhar outra LP. Se o objetivo for apenas cortar/redimensionar uma captura existente, conservar o arquivo original no código é mais fiel do que regenerar sua interface.

### A — Poster da apresentação

Desktop:

```text
Crie um único poster horizontal 1920 × 1080 para o vídeo real de apresentação da Comunidade Imobiturbo. Use o frame real anexado como referência principal e a prancha do design system apenas para cores/acabamento. Preserve a identidade da pessoa, roupa, gesto e contexto existentes. Não gerar outra pessoa nem cenário de sucesso, luxo ou auditório. Enquadramento editorial limpo, com foco no apresentador e área periférica calma. Sem texto, logo redesenhada, botão de play, borda externa, duração, selo ou promessa. Cor neutra compatível com fundo branco, títulos pretos e acento verde/lime da marca. Retorne somente o poster 16:9. Não desenhe a página.
```

Mobile:

```text
A partir do mesmo frame real aprovado, crie um poster 960 × 540, 16:9, para exibição em uma área móvel de aproximadamente 342 × 192 px. Aproximar o enquadramento do apresentador sem cortar rosto ou gesto essencial. Preservar identidade e conteúdo real; não inventar cenário. Sem texto, logo, botão, player ou moldura de celular. O enquadramento deve funcionar pequeno, com um foco claro e poucos detalhes periféricos. Retorne somente o poster.
```

### B — Visual de apoio para OS, Club ou guia

```text
Gerar somente um fundo de apoio visual para uma captura real de [OS/Club/guia] que será aplicada como arquivo original por cima no HTML. Não desenhar nem regenerar a captura, seus textos, controles, dados ou logos. Usar a referência do design system: branco #FFFFFF, superfície #F7F9F4, borda #E7EAE4, verde #69A440 e lime #C1FF6B com uso contido. Composição plana, limpa, sem dispositivo, perspectiva, gradiente decorativo, neon ou objetos novos. Manter o centro totalmente livre. Desktop: 1920 × 1080, 16:9. Gerar somente esta versão.
```

Para mobile, executar outra chamada trocando o trecho final por:

```text
Mobile: 1152 × 648, 16:9. Detalhes periféricos ainda mais reduzidos; reservar quase toda a área para uma região legível da captura real, que será inserida separadamente em HTML. Não transformar um dashboard completo em miniatura. Gerar somente esta versão.
```

Esse fundo é opcional: as superfícies CSS atuais já resolvem esse papel. Priorizar obter a captura real, sem produzir imagem decorativa desnecessária.

### C — Retrato de Natan

Desktop:

```text
Use exclusivamente a foto real de Natan Pimentel anexada. Prepare um retrato editorial vertical 1200 × 1500, 4:5, para a seção de autoridade da Imobiturbo. Preservar rosto, idade, roupa, expressão e gesto; não criar um novo Natan. Corrigir apenas exposição e equilíbrio de cor com aparência natural. Recortar dentro da área existente da foto; não inventar corpo, cenário, troféu, placa, público ou imóvel. Sem texto, marca, selo ou afirmação de resultado. Se o enquadramento 4:5 exigir inventar conteúdo, manter a foto inteira sobre margens neutras brancas. Retorne apenas a imagem.
```

Mobile: mesma referência e mesmas restrições, executar separadamente em 720 × 900, 4:5, com rosto legível na largura de 290–310 px. Inspecionar semelhança e descartar qualquer alteração de identidade. Foto original continua disponível como alternativa preferencial.

### D — Thumbnail de aula ou relato real

```text
Use o frame real anexado de [AULA DO CLUB/DEPOIMENTO AUTORIZADO]. Crie uma única thumbnail 16:9. Preservar pessoas, contexto e elementos reais relevantes. Não acrescentar rosto, avatar, curso, certificado, nome, nota, estrela, número, ganho financeiro, duração ou frase de depoimento. Não redesenhar telas visíveis: quando a tela contiver informação relevante, usar o frame original na implementação. Sem texto publicitário, botão ou moldura. Ajustar enquadramento e luz de forma discreta para leitura pequena. Desktop: 1600 × 900 para aula ou 1200 × 675 para relato. Escolher apenas um deles nesta chamada. Retornar apenas o asset.
```

Mobile: nova chamada 960 × 540, 16:9; aproximar o foco existente sem eliminar contexto essencial. Não usar 9:16 apenas porque a página é mobile.

### E — Reprototipar um painel depois de receber conteúdo real

```text
Edite apenas o painel da seção [04/05/06/08/10/13] no protótipo anexado. Use exclusivamente os textos e materiais aprovados abaixo:
[COLAR CONTEÚDO APROVADO LITERAL]
Preserve a composição, tipografia, cores, logos e demais regiões. Não completar campos ausentes por inferência. Mensagens: manter interlocutores e exatamente os três balões do exemplo. Depoimentos: manter nome, contexto, origem e relato exatos. Oferta: não inventar preço, garantia ou acesso; manter contratação indisponível enquanto houver pendências. Desktop: 2560 × 1440, 16:9, um único quadro. Não retornar múltiplas seções.
```

Mobile: executar o quadro correspondente em 1440 × 2560, 9:16, com a ordem mobile específica e texto legível. Quadros A/B/C continuam separados. Essa imagem serve para revisão; copiar os textos aprovados diretamente para HTML na entrega final, sem OCR nem texto comercial rasterizado.

## Checagem depois de preencher

Conferir pixels reais retornados, legibilidade no tamanho exibido, semelhança das pessoas, fidelidade das logos e correspondência com a fonte. Atualizar a legenda e o estado de pendência somente após inserir o material definitivo. Ativar player/link/checkout apenas quando o destino correspondente existir e tiver sido verificado. Revalidar 390/320 px e reabrir os oito itens do FAQ.
