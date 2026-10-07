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
`assets/hero-current-mobile-phone.mp4` (1440 × 2560), H.264, 24 fps, sem áudio.
Posters WebP saem do primeiro frame de cada composição, evitando troca de tela
quando o vídeo começa. O mobile usa uma cena própria com smartphone inclinado entre as rochas,
abaixo da copy, e a interface mobile atual do OS. Carrega somente a mídia do tamanho visível.

Fotografia de produto criada com a ferramenta integrada imagegen, usando o
poster do template como referência de enquadramento e a captura atual do
Kanban como referência de produto. Cenas animadas no Google Flow, Omni 1.1
Flash, com início/fim iguais, câmera fixa, flutuação sutil dos ícones e luz
verde. Geração original em 720p; o cenário desktop teve download aprimorado
para 1080p pelo próprio Flow. O cenário do celular usa a geração original
720 × 1280; a resolução final maior inclui a tela real em alta resolução.
A composição final na VPS3 aplica capturas reais do OS (3840 × 2160
no desktop e 1170 × 2532 no mobile) às telas dos aparelhos em perspectiva:
logo, textos e cards ficam estáveis, sem a
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
smartphone inclinado entre rochas na parte inferior. Movimento: câmera travada, ícones
flutuando 3 px, reflexos verdes sutis e partículas atrás dos ícones, tela e
texto imóveis, sem áudio, retorno ao frame inicial ao fim dos 10 s.
Originais e comandos em
`imobiturbo-infra/.artifacts/os-crm-imobiturbo-20261006/hero/` e no projeto
Flow `bfd064bf-9322-4329-ba2c-96b0de681408`. Geração de imagens via ferramenta
integrada; vídeo via CLI do Flow; composição/exportação via FFmpeg na VPS3.
Princípios de prompts de vídeo: skill `video`, baseada no trabalho CC BY 4.0
de SergeShima. Logo oficial e fontes conforme manual da marca.

Gates na VPS3: testes normais, build Pages, desktop/mobile, planos/ciclos,
Kanban, FAQ, vídeo, links de ativação e recebimento do Tracker Imobiturbo.

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

Correção mobile: a referência Cashflow usa um celular, enquanto o desktop usa
notebook. `hero-current-mobile-phone.{mp4,webp}` substitui a primeira versão
vertical com notebook. O aparelho mantém o Kanban mobile atual, dados de
demonstração e enquadramento próprio; a captura real é aplicada sobre o vídeo
para manter texto e logo estáveis. Fontes e prompts específicos estão em
`imobiturbo-infra/.artifacts/os-crm-imobiturbo-20261006/hero/mobile-phone/`.

Tracker Imobiturbo: LP e assinatura carregam o script canônico de
`track.nmidigital.tech`, operação `00000000-0000-0000-0000-000000000001`,
produto `imobiturbo-os`. A CSP no HTML e em `_headers` permite o coletor e
a biblioteca Meta própria, quando selecionada pela configuração oficial do
Hub; não instala scripts ou identificadores do concorrente. O domínio exato
da prévia foi autorizado no coletor. A prévia não tem destino de pixel Meta;
as rotas oficiais e seus pixels permanecem definidos pela política do Hub.

`tracking.js` registra escolha de plano/ciclo, visita à assinatura e clique
de WhatsApp. O `productId` distingue plano e ciclo sem vincular o OS à oferta
da Comunidade. A assinatura assistida não registra Lead, InitiateCheckout
ou Purchase. `offer.js` preserva UTMs, dimensões de anúncio, IDs permitidos e
`imt_audit` nos links e nas trocas de plano/ciclo; parâmetros arbitrários
não são copiados. Verificação pública usa `imt_audit=1`, recibos persistidos
com `isTest=true` e exclusão das métricas comerciais e da fila CAPI.

Produção: a LP é servida na raiz de `https://os.imobiturbo.com.br/`, com a
assinatura em `/os-crm/v2/assinatura/`. `npm run build:os-landing` gera apenas
os recursos aprovados em `.cloudflare-os-landing`, com canonical próprio,
indexação da LP, favicon local e links legais do site oficial. A prévia
continua sem indexação.

`wrangler.os-landing.jsonc` publica o Worker `imobiturbo-os-landing` e seus
assets. A rota do domínio precisa terminar com `*` para aceitar UTMs;
`workers/os-landing.js` atende somente a raiz e `/os-crm/v2/`, passando todos
os demais pedidos à origem sem alterar método, headers ou corpo. Login,
painel, APIs, OAuth, recursos Next e WebSocket permanecem no runtime atual.
A versão de revisão no domínio de produção redireciona à raiz preservando
a query. `RELEASE_SHA` é informado no deploy e aparece no header da LP.

O pixel Imobiturbo `1025303472485246` é selecionado pela política do Hub
para a origem exata `https://os.imobiturbo.com.br`, sem instalação direta
de `fbq` na LP. Validação usa `imt_audit=1`; essas ocorrências ficam fora
das métricas comerciais e do envio Meta. Nenhum Purchase é simulado.
Build, testes e publicação são executados na VPS3. Rollback: remover a rota
do Worker de `os.imobiturbo.com.br/*` restaura a página da aplicação atual,
sem trocar DNS nem reiniciar containers.
