/* eslint-disable */
// Imobiturbo audience pages - static React/CDN surface.

const AUDIENCE_WHATSAPP_URL = 'https://wa.me/5521983747796?text=Quero%20entender%20a%20Imobiturbo%20para%20minha%20opera%C3%A7%C3%A3o';
const AUDIENCE_INSTAGRAM_URL = 'https://www.instagram.com/imobiturbo/';

function useIsMobile(maxWidth = 980) {
  const [isMobile, setIsMobile] = React.useState(() => window.innerWidth <= maxWidth);

  React.useEffect(() => {
    const update = () => setIsMobile(window.innerWidth <= maxWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [maxWidth]);

  return isMobile;
}

const audienceAssets = {
  hero: '../assets/home-hero-operacao-imobiliaria.webp',
  method: '../assets/home-metodo-corretor-solo.webp',
  consultoria: '../assets/home-consultoria-warroom.webp',
};

const audienceContent = {
  corretor: {
    route: '/corretor-autonomo/',
    eyebrow: 'Corretor Autônomo',
    title: 'Venda com processo, mesmo carregando a operação sozinho.',
    lede: 'A Imobiturbo ajuda o corretor autônomo a organizar rotina comercial, WhatsApp, follow-up, proposta e fechamento para vender com mais margem e previsibilidade.',
    image: audienceAssets.method,
    panelTitle: 'O que muda na operação',
    panelItems: [
      'Prioridade clara para leads, clientes e oportunidades.',
      'Follow-up com contexto, sem depender de memória.',
      'Proposta, negociação e fechamento com mais controle.',
    ],
    painsTitle: 'Para sair da venda no improviso.',
    painsText: 'O corretor autônomo precisa vender, atender, captar, negociar e acompanhar tudo ao mesmo tempo. A Imobiturbo entra para transformar essa carga em rotina.',
    pains: [
      ['phone', 'WhatsApp sem método', 'Conversas importantes se perdem quando cada atendimento vira urgência isolada.'],
      ['clock', 'Follow-up irregular', 'O cliente esfria porque não existe cadência clara de retorno e próximo passo.'],
      ['wallet', 'Margem pressionada', 'A negociação fica reativa quando a proposta não sustenta valor percebido.'],
      ['target', 'Prioridade confusa', 'Nem todo lead merece o mesmo tempo, mas a rotina precisa mostrar isso.'],
    ],
    stepsTitle: 'Do interesse ao fechamento.',
    steps: [
      ['01', 'Captação', 'Definir origem, nicho, oferta e rotina de entrada.'],
      ['02', 'Atendimento', 'Responder com contexto e conduzir o próximo passo.'],
      ['03', 'Follow-up', 'Manter cadência sem parecer insistente ou perdido.'],
      ['04', 'Negociação', 'Proteger margem, comissão e valor percebido.'],
      ['05', 'Fechamento', 'Conduzir decisão, documento e assinatura com processo.'],
    ],
    splitTitle: 'Mentoria, hub e acompanhamento para uma rotina real.',
    splitText: 'A página do corretor autônomo aprofunda a mentoria imobiliária, mas o pacote continua conectado ao ecossistema: tecnologia, comunidade e consultoria quando o projeto pede.',
    deliverables: [
      ['Mentoria', 'Diagnóstico e plano de ação para organizar venda e rotina.'],
      ['Hub', 'Pipeline, tarefas e oportunidades em uma lógica simples de execução.'],
      ['Comunidade', 'Troca com profissionais que vivem a mesma realidade comercial.'],
    ],
    ctaTitle: 'Mapear sua operação de corretor autônomo?',
    ctaText: 'A conversa inicial entende seu momento, volume de atendimento e gargalo principal antes de indicar o melhor formato.',
  },
  imobiliarias: {
    route: '/imobiliarias/',
    eyebrow: 'Imobiliárias',
    title: 'Dê cadência comercial ao time sem depender de cobrança solta.',
    lede: 'A Imobiturbo ajuda imobiliárias a organizar atendimento, funil, rituais comerciais, indicadores e gestão do time para vender com mais previsibilidade.',
    image: audienceAssets.consultoria,
    panelTitle: 'O que muda na gestão',
    panelItems: [
      'Time com padrão claro de atendimento e follow-up.',
      'Gestor com visão de gargalos, etapa e responsabilidade.',
      'Rotina comercial conectada a metas, campanha e execução.',
    ],
    painsTitle: 'Para times que precisam vender com método.',
    painsText: 'Imobiliárias crescem quando atendimento, captação, qualificação, proposta e gestão deixam de depender do estilo individual de cada pessoa.',
    pains: [
      ['users', 'Time sem padrão', 'Cada pessoa atende de um jeito e o gestor perde previsibilidade de execução.'],
      ['funnel', 'Funil sem leitura', 'Oportunidades ficam espalhadas e fica difícil saber onde a venda trava.'],
      ['clock', 'SLA invisível', 'Lead chega, mas resposta, retorno e proposta não seguem uma cadência clara.'],
      ['clipboard', 'Gestão reativa', 'Reuniões viram cobrança porque faltam processo, indicador e próximo passo.'],
    ],
    stepsTitle: 'Da gestão ao resultado comercial.',
    steps: [
      ['01', 'Diagnóstico', 'Mapear time, canais, funil, carteira e rotina de gestão.'],
      ['02', 'Padronização', 'Definir atendimento, qualificação, proposta e follow-up.'],
      ['03', 'Funil', 'Organizar etapas, donos, prazos e critérios de avanço.'],
      ['04', 'Indicadores', 'Criar leitura objetiva de produtividade e conversão.'],
      ['05', 'Rituais', 'Ajustar reunião, cobrança e melhoria contínua da operação.'],
    ],
    splitTitle: 'Consultoria e hub para aumentar controle comercial.',
    splitText: 'A página de imobiliárias aprofunda a operação de time: processo, treinamento, tecnologia e consultoria para reduzir ruído entre estratégia e execução.',
    deliverables: [
      ['Diagnóstico comercial', 'Leitura da operação, canais, equipe e principais gargalos.'],
      ['Rituais de gestão', 'Cadência de acompanhamento, indicadores e responsabilidades.'],
      ['Hub operacional', 'Pipeline, tarefas e follow-up conectados à rotina do time.'],
    ],
    ctaTitle: 'Mapear a operação da sua imobiliária?',
    ctaText: 'A conversa inicial entende tamanho do time, canais, metas e gargalos antes de propor uma arquitetura de trabalho.',
  },
  incorporadoras: {
    route: '/construtoras-incorporadoras/',
    eyebrow: 'Construtoras / Incorporadoras',
    title: 'Organize lançamento, canais e operação comercial com mais previsibilidade.',
    lede: 'A Imobiturbo ajuda construtoras e incorporadoras a alinhar posicionamento, campanha, canais, relacionamento e velocidade comercial.',
    image: audienceAssets.hero,
    panelTitle: 'O que muda no projeto',
    panelItems: [
      'Campanha, canais e operação comercial no mesmo raciocínio.',
      'Relacionamento mais claro com corretores e imobiliárias parceiras.',
      'Leitura de funil, proposta e absorção com mais processo.',
    ],
    painsTitle: 'Para empreendimentos que precisam de tração comercial.',
    painsText: 'Lançamento, estoque, canais e relacionamento exigem mais que mídia. A operação precisa conectar narrativa, distribuição e execução comercial.',
    pains: [
      ['building', 'Produto sem narrativa', 'O empreendimento existe, mas a proposta comercial não organiza percepção de valor.'],
      ['funnel', 'Canais desalinhados', 'Corretores, imobiliárias e mídia trabalham sem cadência comum de acompanhamento.'],
      ['search', 'Lead sem contexto', 'A origem chega, mas a operação não diferencia intenção, perfil e próximo passo.'],
      ['clipboard', 'Lançamento fragmentado', 'Campanha, proposta, atendimento e fechamento não conversam no mesmo ritmo.'],
    ],
    stepsTitle: 'Do posicionamento à velocidade de venda.',
    steps: [
      ['01', 'Produto', 'Ler empreendimento, público, oferta e diferenciais comerciais.'],
      ['02', 'Canais', 'Organizar distribuição, parceiros, mídia e relacionamento.'],
      ['03', 'Campanha', 'Conectar narrativa, criativos, captação e régua de atendimento.'],
      ['04', 'Operação', 'Definir funil, SLA, proposta e rotina de acompanhamento.'],
      ['05', 'Absorção', 'Ajustar preço, objeções, estoque e próximos ciclos comerciais.'],
    ],
    splitTitle: 'Consultoria para conectar estratégia e execução comercial.',
    splitText: 'A página de construtoras e incorporadoras aprofunda lançamentos, canais e operação comercial para projetos que precisam de coordenação e leitura de mercado.',
    deliverables: [
      ['Estratégia de lançamento', 'Posicionamento, narrativa, canais e prioridades comerciais.'],
      ['Operação de canais', 'Relacionamento com corretores, imobiliárias e parceiros comerciais.'],
      ['Gestão de campanha', 'Acompanhamento de captação, atendimento, proposta e absorção.'],
    ],
    ctaTitle: 'Mapear seu empreendimento ou operação comercial?',
    ctaText: 'A conversa inicial entende produto, estágio, canais e urgência comercial antes de propor o melhor escopo.',
  },
};

function audienceOpenWhatsApp() {
  window.open(AUDIENCE_WHATSAPP_URL, '_blank', 'noopener,noreferrer');
}

function AudienceTopbar() {
  const [isOpen, setIsOpen] = React.useState(false);
  const isMobile = useIsMobile();
  const closeMenu = () => setIsOpen(false);

  const headerLinks = [
    ['Corretor Autônomo', '/corretor-autonomo/'],
    ['Imobiliárias', '/imobiliarias/'],
    ['Construtoras', '/construtoras-incorporadoras/'],
    ['Depoimentos', '/depoimentos/'],
  ];

  return (
    <header className={`aud-topbar ${isOpen ? 'menu-open' : ''}`}>
      <div className="aud-shell aud-topbar-inner" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%'
      }}>
        <a href="/" onClick={closeMenu}>
          <img className="aud-logo" src="../assets/logo-imobiturbo-white.png" alt="Imobiturbo" style={{ width: isMobile ? 142 : 148, display: 'block' }} />
        </a>

        <nav className="aud-nav" aria-label="Navegação principal" style={{ display: isMobile ? 'none' : 'flex', gap: 18, alignItems: 'center', marginLeft: 'auto' }}>
          {headerLinks.map(([label, href]) => (
            <a href={href} key={label} style={{
              color: 'var(--fg-2)',
              textDecoration: 'none',
              font: '800 13px var(--font-mono)',
              letterSpacing: '0px',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}>
              {label}
            </a>
          ))}
        </nav>

        {isMobile && (
          <button
            className="aud-menu-button"
            type="button"
            aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={isOpen}
            onClick={() => setIsOpen((value) => !value)}
            style={{
              width: 44,
              height: 44,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 4,
              border: '1px solid var(--border-subtle)',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              padding: 0,
              cursor: 'pointer',
            }}
          >
            <span style={{
              width: 18,
              height: 2,
              display: 'block',
              borderRadius: 999,
              background: 'currentColor',
              transition: 'transform var(--dur-base) var(--ease-out), opacity var(--dur-base) var(--ease-out)',
              transform: isOpen ? 'translateY(6px) rotate(45deg)' : undefined,
            }} />
            <span style={{
              width: 18,
              height: 2,
              display: 'block',
              borderRadius: 999,
              background: 'currentColor',
              transition: 'transform var(--dur-base) var(--ease-out), opacity var(--dur-base) var(--ease-out)',
              opacity: isOpen ? 0 : 1,
            }} />
            <span style={{
              width: 18,
              height: 2,
              display: 'block',
              borderRadius: 999,
              background: 'currentColor',
              transition: 'transform var(--dur-base) var(--ease-out), opacity var(--dur-base) var(--ease-out)',
              transform: isOpen ? 'translateY(-6px) rotate(-45deg)' : undefined,
            }} />
          </button>
        )}
      </div>

      {isMobile && isOpen && (
        <nav className="aud-menu-panel" aria-label="Menu mobile" style={{
          position: 'absolute',
          top: 'calc(100% + 10px)',
          left: 16,
          right: 16,
          display: 'grid',
          gap: 4,
          padding: 14,
          border: '1px solid var(--border-subtle)',
          borderRadius: 16,
          background: 'rgba(10,10,10,0.96)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.52)',
          zIndex: 40,
        }}>
          {headerLinks.map(([label, href]) => (
            <a 
              href={href} 
              key={label} 
              onClick={closeMenu} 
              style={{
                color: 'rgba(255, 255, 255, 0.86)',
                font: '800 13px/1 "Futura LT Cond", "Barlow Condensed", system-ui, sans-serif',
                letterSpacing: '0px',
                textTransform: 'uppercase',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                minHeight: 44,
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px',
                borderRadius: 10,
              }}
            >
              {label}
            </a>
          ))}
          <a 
            href={AUDIENCE_WHATSAPP_URL} 
            target="_blank" 
            rel="noreferrer" 
            onClick={closeMenu} 
            style={{
              minHeight: 42,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 999,
              background: 'var(--accent)',
              color: 'var(--fg-on-lime)',
              padding: '0 28px',
              font: '800 15px/1 var(--font-body)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              marginTop: 8,
              width: '100%',
            }}
          >
            Falar no WhatsApp
          </a>
        </nav>
      )}
    </header>
  );
}

function AudienceHero({ page }) {
  return (
    <section className="aud-hero">
      <img className="aud-hero-bg" src={page.image} alt="" aria-hidden="true" />
      <div className="aud-shell aud-hero-grid">
        <div>
          <div className="aud-kicker">{page.eyebrow}</div>
          <h1 className="aud-title">{page.title}</h1>
          <p className="aud-lede">{page.lede}</p>
          <div className="aud-actions">
            <Button variant="primary" size="lg" icon="phone" iconRight="arrowRight" onClick={audienceOpenWhatsApp}>
              Falar no WhatsApp
            </Button>
            <Button variant="ghost" size="lg" iconRight="arrowRight" onClick={() => { window.location.href = '/'; }}>
              Voltar para home
            </Button>
          </div>
        </div>
        <aside className="aud-hero-panel">
          <div className="aud-kicker">Foco da página</div>
          <div className="aud-panel-title">{page.panelTitle}</div>
          <div className="aud-panel-list">
            {page.panelItems.map((item) => (
              <div className="aud-panel-item" key={item}>
                <Icon name="check" size={17} color="var(--it-lime)" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

function AudiencePainSection({ page }) {
  return (
    <section className="aud-section muted">
      <div className="aud-shell">
        <div className="aud-section-header">
          <div>
            <div className="aud-kicker">Cenário</div>
            <h2 className="aud-section-title">{page.painsTitle}</h2>
          </div>
          <p className="aud-section-text">{page.painsText}</p>
        </div>
        <div className="aud-card-grid">
          {page.pains.map(([icon, title, body]) => (
            <article className="aud-card" key={title}>
              <div className="aud-card-icon">
                <Icon name={icon} size={20} />
              </div>
              <div className="aud-card-title">{title}</div>
              <div className="aud-card-text">{body}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function AudienceProcessSection({ page }) {
  return (
    <section className="aud-section">
      <div className="aud-shell">
        <div className="aud-section-header">
          <div>
            <div className="aud-kicker">Método</div>
            <h2 className="aud-section-title">{page.stepsTitle}</h2>
          </div>
          <p className="aud-section-text">
            A Imobiturbo organiza as etapas para que estratégia, rotina e decisão comercial avancem juntas.
          </p>
        </div>
        <div className="aud-process">
          {page.steps.map(([number, title, body]) => (
            <article className="aud-step" key={number}>
              <div className="aud-step-number">{number}</div>
              <div className="aud-step-title">{title}</div>
              <div className="aud-step-text">{body}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function AudienceDeliverablesSection({ page }) {
  return (
    <section className="aud-section muted">
      <div className="aud-shell aud-split">
        <div>
          <div className="aud-kicker">Pacote Imobiturbo</div>
          <h2 className="aud-section-title">{page.splitTitle}</h2>
          <p className="aud-section-text" style={{ marginTop: 16 }}>{page.splitText}</p>
          <div className="aud-card-grid three" style={{ marginTop: 28 }}>
            {page.deliverables.map(([title, body]) => (
              <article className="aud-card" key={title}>
                <div className="aud-card-title" style={{ marginTop: 0 }}>{title}</div>
                <div className="aud-card-text">{body}</div>
              </article>
            ))}
          </div>
        </div>
        <figure className="aud-image-card" style={{ margin: 0 }}>
          <img src={page.image} alt={`Imagem conceitual para ${page.eyebrow}`} loading="lazy" />
        </figure>
      </div>
    </section>
  );
}

function AudienceCta({ page }) {
  return (
    <section className="aud-cta">
      <div className="aud-shell aud-cta-grid">
        <div>
          <h2 className="aud-cta-title">{page.ctaTitle}</h2>
          <p className="aud-cta-text">{page.ctaText}</p>
        </div>
        <div className="aud-cta-panel">
          <div className="aud-kicker" style={{ color: 'var(--it-lime-ink)' }}>Próximo passo</div>
          <div className="aud-card-title" style={{ color: 'var(--it-ink)', marginTop: 12 }}>Comece pelo diagnóstico.</div>
          <p className="aud-card-text" style={{ color: 'var(--fg-inverse-2)' }}>
            Sem proposta pronta antes de entender o cenário. O WhatsApp serve para mapear o escopo certo.
          </p>
          <div style={{ marginTop: 22 }}>
            <Button variant="dark" size="lg" icon="phone" iconRight="arrowRight" onClick={audienceOpenWhatsApp}>
              Falar no WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function AudienceFooter() {
  const columns = [
    ['Páginas', [
      ['Corretor Autônomo', '/corretor-autonomo/'],
      ['Imobiliárias', '/imobiliarias/'],
      ['Construtoras', '/construtoras-incorporadoras/'],
    ]],
    ['Ecossistema', ['Mentoria', 'Software/hub', 'Comunidade', 'Consultoria']],
    ['Contato', [
      ['WhatsApp', AUDIENCE_WHATSAPP_URL],
      ['Instagram', AUDIENCE_INSTAGRAM_URL],
      ['Depoimentos', '/depoimentos/'],
    ]],
  ];

  return (
    <footer className="aud-footer">
      <div className="aud-shell aud-footer-grid">
        <div>
          <img className="aud-footer-logo" src="../assets/logo-imobiturbo-white.png" alt="Imobiturbo" />
          <p className="aud-footer-text">
            Tecnologia, mentoria, comunidade e consultoria para operações imobiliárias venderem com mais direção.
          </p>
        </div>
        {columns.map(([title, links]) => (
          <div key={title}>
            <div className="aud-footer-title">{title}</div>
            <div className="aud-footer-links">
              {links.map((link) => Array.isArray(link)
                ? <a key={link[0]} href={link[1]}>{link[0]}</a>
                : <span key={link}>{link}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </footer>
  );
}

function AudiencePage({ pageId }) {
  const page = audienceContent[pageId] || audienceContent.corretor;

  return (
    <div className="aud-page it-root">
      <AudienceTopbar />
      <main>
        <AudienceHero page={page} />
        <AudiencePainSection page={page} />
        <AudienceProcessSection page={page} />
        <AudienceDeliverablesSection page={page} />
        <AudienceCta page={page} />
      </main>
      <AudienceFooter />
    </div>
  );
}

window.AudiencePage = AudiencePage;
