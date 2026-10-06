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
vêm dos ativos existentes da página OS e `/vagas/`; follow-up usa a interface atual.

Hero atual: vídeos próprios de 10 s para desktop e mobile, respectivamente
`assets/hero-current-desktop.mp4` (2560 × 1440) e
`assets/hero-current-mobile.mp4` (1440 × 2560), H.264, 24 fps, sem áudio.
Posters WebP saem do primeiro frame de cada composição, evitando troca de tela
quando o vídeo começa. O mobile usa enquadramento vertical próprio, com o
notebook inteiro abaixo da copy. Carrega somente a mídia do tamanho visível.

Fotografia de produto criada com a ferramenta integrada imagegen, usando o
poster do template como referência de enquadramento e a captura atual do
Kanban como referência de produto. Cenas animadas no Google Flow, Omni 1.1
Flash, com início/fim iguais, câmera fixa, flutuação sutil dos ícones e luz
verde. Geração original em 720p; download aprimorado para 1080p pelo próprio
Flow. A composição final na VPS3 aplica a captura real de 3840 × 2160 do OS à
tela do notebook em perspectiva: logo, textos e cards ficam estáveis, sem a
reescrita de letras feita pelo modelo de vídeo. A resolução final descreve a
composição; o cenário não foi gerado originalmente em 2K/4K.

Follow-up: `assets/followup-current.webp` mostra o editor atual de cadências,
suas etapas e o painel de mensagem inteligente com IA. Captura da interface
atual; posições dos nós organizadas temporariamente para a apresentação,
sem salvar/publicar/desativar fluxos. Contatos e responsáveis das capturas do
Kanban são demonstrações; nenhuma informação de clientes integra os ativos.

Prompts finais: fotografia de notebook grande à direita, pedras vulcânicas,
espaço preto à esquerda para HTML, luz lime, três ícones WhatsApp/gráfico/IA,
tela baseada no Kanban atual; adaptação mobile 9:16 com área superior preta e
notebook centralizado na parte inferior. Movimento: câmera travada, ícones
flutuando 3 px, reflexos verdes sutis e partículas atrás dos ícones, tela e
texto imóveis, sem áudio, retorno ao frame inicial ao fim dos 10 s.
Originais e comandos em
`imobiturbo-infra/.artifacts/os-crm-imobiturbo-20261006/hero/` e no projeto
Flow `bfd064bf-9322-4329-ba2c-96b0de681408`. Geração de imagens via ferramenta
integrada; vídeo via CLI do Flow; composição/exportação via FFmpeg na VPS3.
Princípios de prompts de vídeo: skill `video`, baseada no trabalho CC BY 4.0
de SergeShima. Logo oficial e fontes conforme manual da marca.

Gates na VPS3: testes normais, build Pages, desktop/mobile, planos/ciclos,
Kanban, FAQ, vídeo, links de ativação e auditoria de rede sem trackers.

Refinamento de 06/10/2026: cards com movimento de lead entre etapas e conversa
contínua de qualificação, layout CRM com anotações, demonstração de IA no
WhatsApp e seção de apoio com o loop dos guias de uso, adaptados de `/vagas/`.
Demos de produto reproduzem sem controles, em loop, mudas e inline apenas
quando visíveis. Fora da tela, com a aba oculta ou um depoimento aberto, pausam.
A preferência por movimento reduzido elimina transições espaciais dos cards,
preservando a atualização dos exemplos e o autoplay solicitado. O comando
discreto abaixo dos cards pausa os exemplos, o badge e os vídeos em loop.
O badge Meta fica acima do título do hero, com borda e brilho girando em 1,8 s,
como no `/vagas/`, inclusive com movimento reduzido, conforme solicitado.
O botão de pausar animações também pausa o badge. Badge e selo Meta reutilizam
os SVGs próprios de `/vagas/`. Logos WhatsApp,
Meta, Excel e OpenAI vêm do catálogo theSVG indicado por Natan. Site e portais
usam ícones de categoria Lucide; fontes e licenças em `assets/icons/README.md`.
Todos os ativos são locais; nenhum script de `/vagas/` foi copiado.

Player de relatos: controles próprios em `proof-player.js`, com SVGs, progresso
na cor da marca, tempo, play/pausa, mute e tela cheia. O botão Fechar tem texto,
ícone e alvo de 44px. A barra fica abaixo do vídeo, preservando as legendas.
Fechar libera a mídia imediatamente; Escape também encerra a reprodução.
Ao abrir, o player carrega o MP4 local como Blob para permitir avanço mesmo
quando o servidor responde sem suporte a byte ranges. Fechar aborta downloads
pendentes e libera a URL temporária. A CSP permite Blob apenas para mídia.
