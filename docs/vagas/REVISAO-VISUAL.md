# Revisão Impeccable — LP vagas

Referência: os 37 quadros gerados a partir dos 13 briefs fornecidos, com as duas marcas desktop corrigidas. A revisão compara a composição e o conteúdo; os recortes mobile são continuação de uma página fluida, sem reproduzir áreas vazias das pranchetas.

| Seção | Conferência e acabamento |
|---|---|
| 01 Hero | Hierarquia título → vídeo, ordem mobile com vídeo antes do CTA, largura confortável do botão e arquivo oficial da marca |
| 02 Processo | Linha horizontal no desktop e percurso vertical no mobile, números alinhados e diagramas abstratos sem dados fictícios |
| 03 OS | Demonstração 16:9 e três anotações; verde sobre superfície ajustado de 2.836:1 para 3.081:1 |
| 04 WhatsApp | Três balões identificados; painel precede responsabilidades no mobile; ícones lineares da mesma família |
| 05 Club | Aula e orientação conectadas; exercício e gravações com hierarquias diferentes; cápsula do CTA harmonizada com o restante da página |
| 06 Apoio | Painel compacto, guia empilhado no mobile e aviso legível de que 24h se refere à IA |
| 07 Natan | Retrato 4:5, ordem mobile preservada e três evidências em linhas, sem resultados fabricados |
| 08 Relatos | Grade de três cards convertida em coluna; legendas da mídia ampliadas e campos reais pendentes preservados |
| 09 Perfil | Perfil e limites com peso e legibilidade equivalentes; sem cores de erro ou contraste que esconda ressalvas |
| 10 Oferta | Um único card, condições legíveis, botão desabilitado em lime suavizado e aviso próximo |
| 11 FAQ | Oito itens nativos, apenas primeiro aberto; indicadores, foco e operação por teclado conferidos |
| 12 Encerramento | Três frases na mesma escala, verde apenas na última, um CTA e grid discreto |
| 13 Rodapé | Marca oficial, grupos empilhados no celular e textos institucionais pendentes sem destinos fictícios |

## Evidências

- Capturas de todas as seções em 1440 px e 390 px, mais viewports 768 e 320 px. Reprodução da hero em 1672×941.
- Sem overflow horizontal, sem imagens quebradas e sem erros de página nos quatro tamanhos.
- Menu abriu por Enter; foco com outline de 3 px. Link da oferta chegou a `#assinatura`, respeitando margem superior de 28 px.
- Todos os oito itens do FAQ abriram e fecharam por Enter. Primeiro Tab alcançou o link de pular para o conteúdo, que focou `main#conteudo`.
- Botão de contratação confirmado como disabled.
- Contrastes: corpo sobre superfície 6.091:1; rótulos verdes sobre branco 5.487:1; preto sobre lime 17.784:1; título verde sobre branco 3.006:1 e sobre superfície 3.081:1.
- Detector executado uma vez. Degradado por ausência dos módulos de parser, portanto não foi tratado como prova de contraste ou aprovação visual. Fonte Plus Jakarta Sans e grid foram os dois findings mecânicos; ambos são requisitos explícitos dos briefs.
- Testes focados e build Pages concluídos na VPS3, exit 0, em checkout limpo. Fonte HTML/CSS comparada por SHA-256 com o artefato construído.

Capturas e resultados detalhados estão em `.impeccable/review/` no worktree da missão e no pacote de evidências local. O parecer independente será anexado ao concluir a revisão.

## Correções após a primeira revisão independente

Sete pontos corrigidos: hierarquia das transições 03/04/05/06/10; aviso de gravações; molduras dos diagramas e escala dos marcadores 02; introdução da oferta centralizada no desktop; marcadores lime preenchidos no OS; remoção dos ícones de vídeo excedentes em Club e relatos; nome acessível neutro do menu mobile.

As transições mobile seguem seus próprios quadros: destaque escuro em 03-M-B; texto de apoio cinza em 04-M-B, 05-M-C, 06-M e 10-M-B. O aviso de gravações tem peso forte no desktop e superfície pálida no mobile. Capturas renovadas nas quatro larguras sem overflow ou imagens quebradas.
