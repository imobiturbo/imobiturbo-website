# Imobiturbo OS — adaptação do template aprovado

LP `/os-crm/v2/` e assinatura `/os-crm/v2/assinatura/?plan=growth&cycle=annual`.
Prévia para revisão: a página atual `/os-crm/` e a referência `/os-crm/clone/`
permanecem preservadas. Não contém pixel, GTM nem scripts do concorrente.

Mantém a composição da abertura, os cards, a alternância escuro/branco,
demonstração, diferenciais, integrações, autoridade, oferta, FAQ e rodapé com
revelação do template. A versão adaptada tem HTML estático, CSS e JavaScript
próprios, sem o bundle de aplicação Next do concorrente.

Texto e estrutura editáveis em `render.cjs`. Marca e responsividade em
`assets/os.css`. A oferta única em `offer.js` alimenta LP e assinatura.
O build gera HTML diretamente no artefato; as cópias versionadas permitem
prévia por servidor estático. Alterações no renderer devem atualizar essas
cópias na VPS3. Sem JavaScript, conteúdo, FAQ, valores anuais e CTA continuam
acessíveis. Kanban e exemplos de conversa usam dados ilustrativos.

Oferta: valores, limites e garantia da página pública atual do OS em
06/10/2026: Start 97 mensal / 670 anual à vista / 12x67; Growth 247 / 1770 /
12x177; Scale 397 / 2970 / 12x297. Parcelamento tem total diferente do à vista,
informado explicitamente. Adicionais: conexão49,90 e usuário29,90 por mês.

Compra: `/checkout` no OS redireciona para login exclusivo de alunos; seu
`signup` está desativado e o destino autenticado é implementação assistida.
Esta adaptação apresenta plano/ciclo e direciona novos clientes à ativação
com a equipe no número oficial já publicado em `/vagas/`, 5521969516183.
Não recolhe cartão, cria conta ou cobra. O caminho de aluno foi mantido como
alternativa. Não anuncia pagamento concluído nem acesso automático.

Provas: vídeos originais de Joyce, Joan e Kelly da biblioteca `/depoimentos/`,
identificados como relatos do ecossistema Imobiturbo, sem atribuir seus
resultados exclusivamente ao OS. Cópias locais dos três relatos públicos,
obtidas pela API de armazenamento da conta proprietária, reproduzem com player
nativo; não alteram as proteções da biblioteca e não distribuem seus cursos.
Vídeos em H.264/AAC com faststart, mantendo o conteúdo integral. Retrato de Natan, demos e telas de agentes
e follow-up vêm dos ativos existentes da página OS e `/vagas/`.

Hero: `assets/hero-os.webp`, criado com a skill imagegen e ferramenta integrada
em06/10/2026. Prompt: composição do laptop em pedra vulcânica do template,
área preta livre à esquerda, iluminação #C5FF5E/#2F400D, interface Kanban
ilustrativa do OS com pessoas fictícias, ícones WhatsApp/CRM/IA; sem vermelho,
Cashflow ou texto externo. Segunda edição reduziu o laptop e deslocou a cena
para a direita, preservando a metade esquerda para a copy.
Original PNG preservado na pasta de geração do
Codex. Logo oficial, Plus Jakarta Sans e JetBrains Mono, conforme manual da marca.

Gates na VPS3: testes normais, build Pages, desktop/mobile, planos/ciclos,
Kanban, FAQ, vídeo, links de ativação e auditoria de rede sem trackers.

Refinamento de 06/10/2026: cards com movimento de lead entre etapas e conversa
contínua de qualificação, layout CRM com anotações, demonstração de IA no
WhatsApp e seção de apoio com o loop dos guias de uso, adaptados de `/vagas/`.
Demos de produto reproduzem sem controles, em loop, mudas e inline apenas
quando visíveis. Fora da tela, com a aba oculta ou um depoimento aberto, pausam.
A preferência por movimento reduzido elimina transições espaciais dos cards,
preservando a atualização dos exemplos e o autoplay solicitado. O comando
discreto abaixo dos cards permite pausar suas animações.
Badge e selo Meta reutilizam os SVGs próprios de `/vagas/`. Logos WhatsApp,
Meta, Excel e OpenAI vêm do catálogo theSVG indicado por Natan. Site e portais
usam ícones de categoria Lucide; fontes e licenças em `assets/icons/README.md`.
Todos os ativos são locais; nenhum script de `/vagas/` foi copiado.

Player de relatos: controles próprios em `proof-player.js`, com SVGs, progresso
na cor da marca, tempo, play/pausa, mute e tela cheia. O botão Fechar tem texto,
ícone e alvo de 44px. A barra fica abaixo do vídeo, preservando as legendas.
Fechar libera a mídia imediatamente; Escape também encerra a reprodução.
