/* eslint-disable */
// Imobiturbo home - static React/CDN surface.

const WHATSAPP_URL = 'https://wa.me/5521983747796?text=Quero%20mais%20fechamento%20e%20mais%20lucro%20com%20a%20Imobiturbo';
const INSTAGRAM_URL = 'https://www.instagram.com/imobiturbo/';
const TESTIMONIALS_URL = '/depoimentos/';
const AUDIENCE_URLS = {
  corretor: '/corretor-autonomo/',
  imobiliarias: '/imobiliarias/',
  incorporadoras: '/construtoras-incorporadoras/',
};

const headerLinks = [
  ['O que faz', '#o-que-faz'],
  ['Para quem', '#publicos'],
  ['Como faz', '#como-faz'],
  ['Método', '#metodo'],
  ['Investimento', '#investimento'],
  ['Depoimentos', TESTIMONIALS_URL],
];

const visualAssets = {
  heroCity: '../../assets/home-hero-operacao-imobiliaria.webp',
  methodMockup: '../../assets/home-metodo-corretor-solo.webp',
  consultoriaBoard: '../../assets/home-consultoria-warroom.webp',
};

const packageItems = [
  {
    icon: 'target',
    title: 'Mentoria',
    body: 'Diagnóstico, plano de ação e direção comercial para tirar a operação do improviso.',
  },
  {
    icon: 'funnel',
    title: 'Software/hub',
    body: 'Pipeline, tarefas, ofertas e follow-up organizados para venda imobiliária.',
  },
  {
    icon: 'users',
    title: 'Comunidade',
    body: 'Troca e repertório com profissionais que vivem os mesmos desafios do mercado.',
  },
  {
    icon: 'clipboard',
    title: 'Consultoria',
    body: 'Ajustes de posicionamento, campanha, proposta e operação conforme cada projeto.',
  },
];

const methodSteps = [
  ['01', 'Captação', 'Defina origem, nicho, oferta e rotina de entrada.'],
  ['02', 'Atendimento', 'Responda com critério, contexto e próximo passo claro.'],
  ['03', 'Follow-up', 'Cobre retorno sem sumir e sem parecer desesperado.'],
  ['04', 'Negociação', 'Proteja margem, comissão e valor percebido.'],
  ['05', 'Fechamento', 'Conduza documento, decisão e assinatura com processo.'],
];

const faqItems = [
  {
    q: 'O que é a Imobiturbo?',
    a: 'É um ecossistema para crescimento imobiliário que conecta mentoria, tecnologia, comunidade e consultoria para melhorar venda, operação e previsibilidade.',
  },
  {
    q: 'Qual página interna devo acessar?',
    a: 'Se você vende sozinho, comece por Corretor Autônomo. Se lidera time ou operação comercial, vá para Imobiliárias. Se trabalha com lançamento, estoque ou incorporação, vá para Construtoras / Incorporadoras.',
  },
  {
    q: 'Quanto custa um projeto com a Imobiturbo?',
    a: 'Os projetos partem de R$500 e podem chegar a R$20.000 conforme escopo, acompanhamento, operação e nível de consultoria.',
  },
  {
    q: 'Onde entram os depoimentos?',
    a: 'A prova social completa fica na rota /depoimentos/. Na página inicial, ela aparece apenas como apoio para quem quer validar antes de conversar.',
  },
];

const corporateSolutions = [
  {
    eyebrow: 'Estratégia',
    title: 'Clareza para crescer no mercado imobiliário.',
    body: 'Diagnóstico, posicionamento, oferta, processo comercial e prioridades conectadas em um mesmo raciocínio de crescimento.',
    image: visualAssets.consultoriaBoard,
    imageAlt: 'Sala de consultoria imobiliária com quadro de estratégia, imóveis, funil, propostas e fechamento.',
  },
  {
    eyebrow: 'Operação',
    title: 'Tecnologia e rotina para transformar esforço em processo.',
    body: 'Hub, funil, tarefas, atendimento, follow-up e proposta entram para dar cadência ao que antes dependia de memória.',
    image: visualAssets.methodMockup,
    imageAlt: 'Mesa de método comercial imobiliário com plantas, comparativos, funil, calendário e WhatsApp.',
  },
  {
    eyebrow: 'Acompanhamento',
    title: 'Mentoria, comunidade e consultoria para sustentar execução.',
    body: 'A Imobiturbo combina repertório, acompanhamento e tecnologia para que a operação evolua com direção, não só com ferramentas.',
    icon: 'users',
  },
];

const corporateCards = [
  ['target', 'Mentoria e treinamento', 'Visão, método e rotina para elevar pessoas e decisões comerciais.'],
  ['funnel', 'Software/hub', 'Operação organizada para acompanhar oportunidades, propostas e follow-up.'],
  ['clipboard', 'Consultoria', 'Diagnóstico, processo, campanha, posicionamento e ajuste de execução.'],
  ['users', 'Comunidade', 'Repertório e troca com quem quer evoluir o padrão da venda imobiliária.'],
];

const audiencePaths = [
  {
    icon: 'target',
    eyebrow: 'Para venda individual',
    title: 'Corretor Autônomo',
    body: 'Rotina comercial, WhatsApp, follow-up, proposta e fechamento para quem carrega a operação sozinho.',
    bullets: ['Mais fechamento', 'Mais margem', 'Mais processo'],
    href: AUDIENCE_URLS.corretor,
  },
  {
    icon: 'users',
    eyebrow: 'Para times e gestão',
    title: 'Imobiliárias',
    body: 'Processo comercial, atendimento, time, indicadores e cadência para vender com menos improviso.',
    bullets: ['Funil comercial', 'Gestão do time', 'Previsibilidade'],
    href: AUDIENCE_URLS.imobiliarias,
  },
  {
    icon: 'building',
    eyebrow: 'Para empreendimentos',
    title: 'Construtoras / Incorporadoras',
    body: 'Estratégia de lançamento, canais, campanhas e operação comercial para acelerar absorção e relacionamento.',
    bullets: ['Lançamentos', 'Canais de venda', 'Operação comercial'],
    href: AUDIENCE_URLS.incorporadoras,
  },
];

const corporateMetrics = [
  ['5', 'etapas do lead ao fechamento'],
  ['4', 'camadas no pacote completo'],
  ['R$500', 'ponto de entrada possível'],
  ['R$20K', 'escopo conforme projeto'],
];

const corporateScopeItems = [
  ['01', 'Diagnóstico', 'Entender momento, gargalo, rotina e capacidade de execução.'],
  ['02', 'Escopo', 'Definir mentoria, hub, comunidade e consultoria no tamanho certo.'],
  ['03', 'Projeto', 'Fechar a faixa de investimento conforme acompanhamento e operação.'],
];

const corporateProofItems = [
  ['Validação', 'Depoimentos completos continuam em /depoimentos/.'],
  ['Contexto', 'A prova aprofunda a decisão sem poluir a apresentação.'],
  ['Próximo passo', 'WhatsApp para mapear se faz sentido agora.'],
];

function openWhatsApp() {
  window.open(WHATSAPP_URL, '_blank', 'noopener,noreferrer');
}

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

function CorporateHeader() {
  const [isOpen, setIsOpen] = React.useState(false);
  const isMobile = useIsMobile();
  const closeMenu = () => setIsOpen(false);
  const headerStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    borderBottom: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(2,3,2,0.72)',
    backdropFilter: 'blur(18px) saturate(150%)',
  };
  const shellStyle = {
    width: isMobile ? 'min(100% - 24px, 560px)' : 'min(1180px, calc(100% - 48px))',
    margin: '0 auto',
    height: isMobile ? 64 : 74,
    display: 'grid',
    gridTemplateColumns: isMobile ? 'auto auto' : 'auto minmax(0, 1fr) auto',
    justifyContent: isMobile ? 'space-between' : undefined,
    alignItems: 'center',
    gap: isMobile ? 16 : 28,
  };
  const logoStyle = {
    width: isMobile ? 142 : 160,
    height: 'auto',
    display: 'block',
  };
  const navStyle = {
    display: isMobile ? 'none' : 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'clamp(16px, 2vw, 28px)',
    minWidth: 0,
  };
  const linkStyle = {
    color: 'rgba(255,255,255,0.86)',
    font: '800 13px/1 "Futura LT Cond", "Barlow Condensed", system-ui, sans-serif',
    letterSpacing: 0,
    textTransform: 'uppercase',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  };
  const ctaStyle = {
    minHeight: 42,
    display: isMobile ? 'none' : 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    background: 'var(--it-lime)',
    color: 'var(--it-black)',
    padding: '0 28px',
    font: '800 15px/1 var(--font-body)',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  };
  const menuButtonStyle = {
    width: 44,
    height: 44,
    display: isMobile ? 'inline-flex' : 'none',
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
  };
  const menuLineStyle = (index) => ({
    width: 18,
    height: 2,
    display: 'block',
    borderRadius: 999,
    background: 'currentColor',
    transform: isOpen && index === 0
      ? 'translateY(6px) rotate(45deg)'
      : isOpen && index === 2
        ? 'translateY(-6px) rotate(-45deg)'
        : undefined,
    opacity: isOpen && index === 1 ? 0 : 1,
  });
  const panelStyle = {
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
  };
  const menuCtaStyle = {
    ...ctaStyle,
    display: 'inline-flex',
    width: '100%',
    marginTop: 8,
  };

  return (
    <header className={`home-header ${isOpen ? 'menu-open' : ''}`} style={headerStyle}>
      <div className="home-shell home-header-inner" style={shellStyle}>
        <a className="home-header-logo-link" href="/" aria-label="Página inicial Imobiturbo" onClick={closeMenu} style={{ display: 'inline-flex', alignItems: 'center', lineHeight: 0, textDecoration: 'none' }}>
          <img className="home-header-logo" src="../../assets/logo-imobiturbo-white.png" alt="Imobiturbo" style={logoStyle} />
        </a>

        <nav className="home-header-nav" aria-label="Navegação principal" style={navStyle}>
          {headerLinks.map(([label, href]) => (
            <a className="home-header-link" href={href} key={label} style={linkStyle}>
              {label}
            </a>
          ))}
        </nav>

        <a className="home-header-cta" href={WHATSAPP_URL} target="_blank" rel="noreferrer" style={ctaStyle}>
          Falar no WhatsApp
        </a>

        <button
          className="home-header-menu-button"
          type="button"
          aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((value) => !value)}
          style={menuButtonStyle}
        >
          <span style={menuLineStyle(0)} />
          <span style={menuLineStyle(1)} />
          <span style={menuLineStyle(2)} />
        </button>
      </div>

      {isOpen && (
        <nav className="home-header-menu-panel" aria-label="Menu mobile" style={panelStyle}>
          {headerLinks.map(([label, href]) => (
            <a className="home-header-menu-link" href={href} key={label} onClick={closeMenu} style={{ ...linkStyle, minHeight: 44, display: 'flex', alignItems: 'center', padding: '0 12px', borderRadius: 10 }}>
              {label}
            </a>
          ))}
          <a className="home-header-menu-cta" href={WHATSAPP_URL} target="_blank" rel="noreferrer" onClick={closeMenu} style={menuCtaStyle}>
            Falar no WhatsApp
          </a>
        </nav>
      )}
    </header>
  );
}

function SectionHeader({ eyebrow, title, body, center = false, inverse = false, bodyStyle }) {
  return (
    <div className={`section-header ${center ? 'center' : ''}`}>
      <div>
        <PremiumEyebrow style={inverse ? { color: 'var(--it-lime-ink)' } : undefined}>{eyebrow}</PremiumEyebrow>
        <h2 className="section-title">{title}</h2>
      </div>
      {body && <p className="section-text" style={bodyStyle}>{body}</p>}
    </div>
  );
}

function HeroCta({ secondary = true }) {
  return (
    <>
      <div className="hero-actions">
        <Button variant="primary" size="lg" icon="phone" iconRight="arrowRight" onClick={openWhatsApp}>
          Falar no WhatsApp
        </Button>
        {secondary && (
          <Button variant="ghost" size="lg" iconRight="arrowRight" onClick={() => { window.location.href = TESTIMONIALS_URL; }}>
            Ver depoimentos
          </Button>
        )}
      </div>
    </>
  );
}

function HeroBackgroundImage() {
  return <img className="hero-bg-image" src={visualAssets.heroCity} alt="" aria-hidden="true" />;
}

function VisualMockupCard({ src, alt, label, detail, loading = 'lazy' }) {
  return (
    <figure className="visual-mockup-card" style={{ margin: 0 }}>
      <img src={src} alt={alt} loading={loading} />
      <figcaption className="visual-mockup-caption">
        <span style={{ color: '#fff', font: '800 13px var(--font-body)' }}>{label}</span>
        <span style={{ color: 'var(--it-lime)', font: '800 13px var(--font-mono)', letterSpacing: '0px', textTransform: 'uppercase', lineHeight: 1 }}>{detail}</span>
      </figcaption>
    </figure>
  );
}

function StressCard() {
  const rows = [
    ['Lead respondeu', 'Sem dono', 'agora'],
    ['Visita marcada', 'Sem follow-up', '2 dias'],
    ['Proposta enviada', 'Sem retorno', '7 dias'],
    ['Cliente quente', 'Sem próximo passo', '12 dias'],
  ];

  return (
    <PremiumCard active padding={0} style={{ position: 'relative', overflow: 'hidden', borderRadius: 24 }}>
      <div style={{ padding: 22, borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-sidebar)' }}>
        <PremiumEyebrow>ANTES DA IMOBITURBO</PremiumEyebrow>
        <PremiumTitle size="card" style={{ marginTop: 7 }}>OPERAÇÃO NO IMPROVISO</PremiumTitle>
      </div>
      <div style={{ padding: 22, display: 'grid', gap: 12 }}>
        {rows.map(([lead, status, time]) => (
          <div
            key={lead}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 14,
              alignItems: 'center',
              padding: 14,
              borderRadius: 14,
              border: '1px solid var(--border-subtle)',
              background: 'rgba(0,0,0,0.36)',
            }}
          >
            <div>
              <div style={{ color: '#fff', font: '800 13px var(--font-body)' }}>{lead}</div>
              <div style={{ marginTop: 4, color: 'var(--fg-3)', font: '600 12px var(--font-body)' }}>{status}</div>
            </div>
            <div style={{ color: 'var(--it-lime)', font: '800 13px var(--font-mono)', letterSpacing: '0px', textTransform: 'uppercase', lineHeight: 1 }}>{time}</div>
          </div>
        ))}
      </div>
    </PremiumCard>
  );
}

function DealSystemMockup() {
  const stages = [
    ['Captação', 88, '36 leads'],
    ['Atendimento', 70, '18 ativos'],
    ['Proposta', 46, '7 em jogo'],
    ['Fechamento', 24, '3 decisões'],
  ];

  return (
    <div className="mockup-panel">
      <PremiumCard active padding={0} style={{ position: 'relative', overflow: 'hidden', borderRadius: 24 }}>
        <div style={{ height: 42, borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 18px', background: 'var(--surface-sidebar)' }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--it-lime)' }} />
          <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--it-ink-4)' }} />
          <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--it-ink-4)' }} />
          <span style={{ marginLeft: 14, color: 'var(--fg-3)', font: '800 13px var(--font-mono)', letterSpacing: '0px', textTransform: 'uppercase', lineHeight: 1 }}>mentoria.imobiturbo</span>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start' }}>
            <div>
              <PremiumEyebrow>PLANO DO CORRETOR SOLO</PremiumEyebrow>
              <PremiumTitle size="card" style={{ marginTop: 7 }}>MAIS FECHAMENTO. MAIS LUCRO.</PremiumTitle>
            </div>
            <Badge tone="lime">30 dias</Badge>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginTop: 20 }}>
            {[
              ['R$500', 'entrada'],
              ['R$20K', 'escopo máx.'],
              ['5', 'etapas'],
            ].map(([value, label]) => (
              <div key={label} style={{ padding: 14, borderRadius: 14, border: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.34)' }}>
                <div style={{ color: '#fff', fontFamily: premiumText.display, fontWeight: 800, fontSize: 34, lineHeight: 0.9, letterSpacing: '-0.04em' }}>{value}</div>
                <div style={{ marginTop: 7, color: 'var(--fg-3)', font: '800 13px var(--font-mono)', letterSpacing: '0px', textTransform: 'uppercase', lineHeight: 1 }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gap: 12, marginTop: 20 }}>
            {stages.map(([stage, width, label]) => (
              <div key={stage} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 80px', gap: 12, alignItems: 'center' }}>
                <div style={{ color: '#fff', font: '800 12px var(--font-body)' }}>{stage}</div>
                <div style={{ height: 24, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--surface-sidebar)' }}>
                  <div style={{ width: `${width}%`, height: '100%', background: 'rgba(191,215,48,0.72)', borderRadius: 8 }} />
                </div>
                <div style={{ color: 'var(--fg-3)', font: '800 13px var(--font-mono)', letterSpacing: '0px', textTransform: 'uppercase', lineHeight: 1, textAlign: 'right' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </PremiumCard>
    </div>
  );
}

function HubMockup() {
  const modules = [
    ['Mentoria', 'Diagnóstico semanal', 'target'],
    ['Hub', 'Funil e rotina', 'funnel'],
    ['Comunidade', 'Execução assistida', 'users'],
    ['Consultoria', 'Ajuste de oferta', 'clipboard'],
  ];

  return (
    <div className="mockup-panel">
      <PremiumCard active padding={24} style={{ position: 'relative', overflow: 'hidden', borderRadius: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'center' }}>
          <div>
            <PremiumEyebrow>HUB COMPLETO</PremiumEyebrow>
            <PremiumTitle size="card" style={{ marginTop: 7 }}>UMA ROTINA. QUATRO CAMADAS.</PremiumTitle>
          </div>
          <Icon name="phone" size={24} color="var(--it-lime)" />
        </div>
        <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          {modules.map(([title, body, icon]) => (
            <div key={title} style={{ border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 16, background: 'rgba(0,0,0,0.36)' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(191,215,48,0.12)', color: 'var(--it-lime)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={icon} size={18} />
              </div>
              <div style={{ marginTop: 16, color: '#fff', font: '800 15px var(--font-body)' }}>{title}</div>
              <div style={{ marginTop: 6, color: 'var(--fg-3)', font: '600 12px/1.5 var(--font-body)' }}>{body}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 18, padding: 18, borderRadius: 16, border: '1px solid var(--border-lime-soft)', background: 'var(--state-selected-bg)' }}>
          <div style={{ color: 'var(--it-lime)', font: '800 13px var(--font-mono)', letterSpacing: '0px', textTransform: 'uppercase', lineHeight: 1 }}>Próximo passo</div>
          <div style={{ marginTop: 8, color: '#fff', font: '800 20px var(--font-body)' }}>Falar no WhatsApp e mapear seu projeto.</div>
        </div>
      </PremiumCard>
    </div>
  );
}

function AuthorityMockup() {
  return (
    <div className="mockup-panel">
      <PremiumCard active padding={0} style={{ position: 'relative', overflow: 'hidden', borderRadius: 24 }}>
        <div style={{ padding: 28, minHeight: 410, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(180deg, rgba(191,215,48,0.10), rgba(0,0,0,0.00) 42%)' }}>
          <div>
            <PremiumEyebrow>NATAN PIMENTEL</PremiumEyebrow>
            <div style={{ marginTop: 14, fontFamily: premiumText.display, fontWeight: 800, fontSize: 'clamp(54px, 7vw, 86px)', lineHeight: 0.82, letterSpacing: '-0.045em', textTransform: 'uppercase', color: '#fff' }}>
              MÉTODO<br /><span style={{ color: 'var(--it-lime)' }}>IMOBITURBO</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
            {[
              ['3.000+', 'profissionais'],
              ['4', 'camadas'],
              ['1', 'rotina'],
            ].map(([value, label]) => (
              <div key={label} style={{ padding: 14, borderRadius: 14, background: 'rgba(0,0,0,0.44)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ color: '#fff', fontFamily: premiumText.display, fontWeight: 800, fontSize: 42, lineHeight: 0.9, letterSpacing: '-0.04em' }}>{value}</div>
                <div style={{ marginTop: 8, color: 'var(--fg-3)', font: '800 13px var(--font-mono)', letterSpacing: '0px', textTransform: 'uppercase', lineHeight: 1 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </PremiumCard>
    </div>
  );
}

function PainSection() {
  const pains = [
    ['Agenda cheia', 'Mas sem previsibilidade de fechamento.'],
    ['Lead chegando', 'Mas sem critério para priorizar.'],
    ['Cliente interessado', 'Mas proposta morre no WhatsApp.'],
    ['Comissão em risco', 'Mas margem some na negociação.'],
  ];

  return (
    <section className="section paper">
      <div className="home-shell two-col">
        <div>
          <PremiumEyebrow style={{ color: 'var(--it-lime-ink)' }}>PARA CORRETOR SOLO</PremiumEyebrow>
          <h2 className="section-title">VOCÊ CARREGA TUDO SOZINHO. NÃO PRECISA OPERAR NO ESCURO.</h2>
          <p className="section-text" style={{ marginTop: 18 }}>
            A Imobiturbo organiza decisão, rotina e acompanhamento para você vender com processo. Menos tentativa. Mais conversa que vira proposta.
          </p>
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          {pains.map(([title, body]) => (
            <div key={title} style={{ display: 'grid', gridTemplateColumns: '42px 1fr', gap: 14, alignItems: 'start', padding: 18, borderRadius: 16, background: '#fff', border: '1px solid rgba(0,0,0,0.08)' }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--it-lime)', color: 'var(--it-black)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="check" size={18} />
              </div>
              <div>
                <div style={{ color: 'var(--it-ink)', font: '800 16px var(--font-body)' }}>{title}</div>
                <div style={{ marginTop: 5, color: 'var(--fg-inverse-2)', font: '500 14px/1.5 var(--font-body)' }}>{body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PackageSection() {
  return (
    <section className="section" id="pacote">
      <div className="home-shell">
        <SectionHeader
          eyebrow="O PACOTE"
          title="O QUE ENTRA NA IMOBITURBO."
          body="Não é só aula. Não é só ferramenta. É uma operação compacta para corretor solo vender com direção, rotina e acompanhamento."
        />
        <div className="card-grid">
          {packageItems.map((item) => (
            <PremiumCard key={item.title} hover padding={22}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(191,215,48,0.12)', color: 'var(--it-lime)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={item.icon} size={20} />
              </div>
              <div style={{ marginTop: 18, color: '#fff', font: '800 18px var(--font-body)' }}>{item.title}</div>
              <div style={{ marginTop: 10, color: 'var(--fg-2)', font: '500 14px/1.6 var(--font-body)' }}>{item.body}</div>
            </PremiumCard>
          ))}
        </div>
      </div>
    </section>
  );
}

function VisualExplainerSection() {
  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="home-shell">
        <SectionHeader
          eyebrow="IMAGENS DO MÉTODO"
          title="ENTENDA O QUE A IMOBITURBO ORGANIZA."
          body="Os mockups são conceituais. Eles mostram o tipo de operação que a Imobiturbo organiza: rotina, funil, WhatsApp, proposta e fechamento."
        />
        <div className="visual-grid">
          <VisualMockupCard
            src={visualAssets.methodMockup}
            alt="Mockup conceitual do hub Imobiturbo com funil, mentoria e indicadores de fechamento."
            label="Hub visual da operação"
            detail="mockup conceitual"
          />
          <VisualMockupCard
            src={visualAssets.consultoriaBoard}
            alt="Quadro conceitual de consultoria Imobiturbo com oferta, funil, WhatsApp, proposta e fechamento."
            label="Quadro de consultoria"
            detail="sem screenshot falso"
          />
        </div>
      </div>
    </section>
  );
}

function MethodSection() {
  return (
    <section className="section" id="metodo">
      <div className="home-shell">
        <SectionHeader
          eyebrow="MÉTODO"
          title="DO LEAD AO FECHAMENTO."
          body="O método acompanha a rotina real do corretor: captar, atender, insistir com critério, negociar e fechar."
          bodyStyle={{ color: 'rgba(255, 255, 255, 0.90)' }}
        />
        <div className="method-grid">
          {methodSteps.map(([number, title, body]) => (
            <PremiumCard key={number} hover padding={18}>
              <div style={{ color: 'var(--it-lime)', font: '800 14px var(--font-mono)', letterSpacing: '0px', textTransform: 'uppercase', lineHeight: 1 }}>{number}</div>
              <div style={{ marginTop: 12, color: '#fff', font: '800 16px var(--font-body)' }}>{title}</div>
              <div style={{ marginTop: 8, color: 'rgba(255, 255, 255, 0.82)', font: '600 13px/1.55 var(--font-body)' }}>{body}</div>
            </PremiumCard>
          ))}
        </div>
      </div>
    </section>
  );
}

function InvestmentSection() {
  return <CorporateInvestmentSection />;
}

function SocialProofSection() {
  return <CorporateProofSection />;
}

function FaqSection() {
  return <CorporateFaqSection />;
}

function HomeFooter() {
  const columns = [
    ['Ecossistema', ['Mentoria', 'Software/hub', 'Comunidade', 'Consultoria']],
    ['Públicos', ['Corretor autônomo', 'Imobiliárias', 'Construtoras', 'Incorporadoras']],
    ['Contato', [
      ['WhatsApp', WHATSAPP_URL],
      ['Instagram', INSTAGRAM_URL],
      ['Depoimentos', TESTIMONIALS_URL],
    ]],
  ];

  return (
    <footer style={{ borderTop: '1px solid var(--border-subtle)', padding: '54px 0 38px', background: '#000' }}>
      <div className="home-shell footer-grid">
        <div>
          <img src="../../assets/logo-imobiturbo-white.png" alt="Imobiturbo" style={{ width: 150, height: 'auto' }} />
          <p style={{ maxWidth: 310, margin: '18px 0 0', color: 'var(--fg-3)', font: '600 13px/1.55 var(--font-body)' }}>
            Tecnologia, mentoria, comunidade e consultoria para operações imobiliárias venderem com mais direção.
          </p>
        </div>
        {columns.map(([title, links]) => (
          <div key={title}>
            <div style={{ color: '#fff', font: '800 13px var(--font-mono)', letterSpacing: '0px', textTransform: 'uppercase', lineHeight: 1 }}>{title}</div>
            <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
              {links.map((link) => (
                Array.isArray(link)
                  ? <a key={link[0]} href={link[1]} style={{ color: 'var(--fg-3)', font: '600 13px var(--font-body)', textDecoration: 'none' }}>{link[0]}</a>
                  : <span key={link} style={{ color: 'var(--fg-3)', font: '600 13px var(--font-body)' }}>{link}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </footer>
  );
}

function CorporateHero() {
  return (
    <section className="corporate-hero">
      <img className="corporate-hero-bg" src={visualAssets.heroCity} alt="" aria-hidden="true" />
      <div className="home-shell corporate-hero-inner">
        <div className="corporate-kicker">Ecossistema para crescimento imobiliário</div>
        <h1 className="corporate-hero-title">Onde vendas, operação e tecnologia imobiliária ganham direção.</h1>
        <p className="corporate-hero-lede">
          A Imobiturbo conecta mentoria, hub, comunidade e consultoria para corretores, imobiliárias, construtoras e incorporadoras venderem com mais processo, margem e previsibilidade.
        </p>
        <div className="corporate-hero-actions">
          <Button variant="primary" size="lg" icon="phone" iconRight="arrowRight" onClick={openWhatsApp}>
            Falar no WhatsApp
          </Button>
          <Button variant="ghost" size="lg" iconRight="arrowRight" onClick={() => { document.getElementById('publicos')?.scrollIntoView({ behavior: 'smooth' }); }}>
            Ver soluções
          </Button>
        </div>
        <div className="corporate-trust-row" aria-label="Resumo da oferta">
          {['Corretor autônomo', 'Imobiliárias', 'Construtoras', 'Incorporadoras'].map((item) => (
            <span className="corporate-trust-pill" key={item}>
              <Icon name="check" size={14} />
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function AudiencePathsSection() {
  return (
    <section className="corporate-section muted" id="publicos">
      <div className="home-shell">
        <div className="corporate-section-center">
          <div className="corporate-kicker">Escolha seu cenário</div>
          <h2 className="corporate-section-title">A mesma inteligência, aplicada a operações diferentes.</h2>
          <p className="corporate-section-text">
            Cada operação tem um desafio próprio. A Imobiturbo organiza o caminho conforme o tipo de negócio imobiliário.
          </p>
        </div>

        <div className="audience-grid">
          {audiencePaths.map((item) => (
            <a className="audience-card" href={item.href} key={item.title}>
              <div className="audience-icon">
                <Icon name={item.icon} size={21} />
              </div>
              <div className="audience-eyebrow">{item.eyebrow}</div>
              <h3 className="audience-title">{item.title}</h3>
              <p className="audience-body">{item.body}</p>
              <div className="audience-bullets">
                {item.bullets.map((bullet) => (
                  <div className="audience-bullet" key={bullet}>
                    <Icon name="check" size={14} color="var(--it-lime)" />
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
              <div className="audience-link">
                <span>Ver página</span>
                <Icon name="arrowRight" size={17} />
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function CorporateSolutionsSection() {
  return (
    <section className="corporate-section" id="o-que-faz">
      <div className="home-shell">
        <div className="corporate-section-center">
          <div className="corporate-kicker">Soluções Imobiturbo</div>
          <h2 className="corporate-section-title">Estratégia imobiliária que transforma esforço em direção.</h2>
          <p className="corporate-section-text">
            Antes de acelerar, a operação precisa entender para onde está indo. A Imobiturbo organiza visão, processo e execução em uma lógica integrada.
          </p>
        </div>

        <div className="corporate-solution-list">
          {corporateSolutions.map((solution, index) => (
            <div className={`corporate-solution ${index % 2 === 1 ? 'reverse' : ''}`} key={solution.title}>
              <div className="corporate-solution-visual">
                <div className="corporate-solution-card">
                  {solution.image ? (
                    <img src={solution.image} alt={solution.imageAlt} loading={index === 0 ? 'eager' : 'lazy'} />
                  ) : (
                    <div className="corporate-solution-mark">
                      <Icon name={solution.icon} size={38} />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="corporate-kicker">{solution.eyebrow}</div>
                <h3 className="corporate-solution-title">{solution.title}</h3>
                <p className="corporate-solution-text">{solution.body}</p>
                <button className="corporate-link-button" type="button" onClick={openWhatsApp}>
                  Mapear projeto
                  <Icon name="arrowRight" size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CorporateMoreSolutionsSection() {
  return (
    <section className="corporate-section muted" id="como-faz">
      <div className="home-shell">
        <div className="corporate-section-center">
          <div className="corporate-kicker">Como a Imobiturbo atua</div>
          <h2 className="corporate-section-title">Quatro frentes conectadas em um só raciocínio.</h2>
          <p className="corporate-section-text">
            Educação forma visão. Hub organiza rotina. Consultoria ajusta a operação. Comunidade sustenta repertório.
          </p>
        </div>
        <div className="corporate-card-grid">
          {corporateCards.map(([icon, title, body]) => (
            <article className="corporate-info-card" key={title}>
              <div className="corporate-info-icon">
                <Icon name={icon} size={20} />
              </div>
              <div className="corporate-info-title">{title}</div>
              <div className="corporate-info-text">{body}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function CorporateBridgeSection() {
  return (
    <section className="corporate-section muted">
      <div className="home-shell corporate-bridge">
        <div>
          <div className="corporate-kicker">Posicionamento</div>
          <h2 className="corporate-section-title">Não é só ferramenta. Não é só mentoria. É direção para a operação imobiliária.</h2>
          <p className="corporate-section-text" style={{ marginLeft: 0 }}>
            A Imobiturbo ajuda cada operação a transformar esforço comercial em processo, critério e decisão. O caminho muda conforme o público. A lógica permanece integrada.
          </p>
        </div>
        <div className="corporate-bridge-panel">
          <article className="corporate-statement-card">
            <div className="corporate-kicker">Para pessoas</div>
            <p className="corporate-info-text" style={{ marginTop: 12 }}>
              Formação, repertório e método para quem vende, atende, negocia, lidera ou toma decisão no mercado imobiliário.
            </p>
          </article>
          <article className="corporate-statement-card offset">
            <div className="corporate-kicker">Para negócios</div>
            <p className="corporate-info-text" style={{ marginTop: 12 }}>
              Processos, tecnologia e consultoria para alinhar posicionamento, operação comercial e crescimento sustentável.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

function CorporateMetricsSection() {
  return (
    <section className="corporate-section">
      <div className="home-shell">
        <div className="corporate-section-center">
          <div className="corporate-kicker">Números da operação</div>
          <h2 className="corporate-section-title">O escopo muda. O processo precisa aparecer.</h2>
        </div>
        <div className="corporate-metrics">
          {corporateMetrics.map(([value, label]) => (
            <div className="corporate-metric" key={label}>
              <div className="corporate-metric-value">{value}</div>
              <div className="corporate-metric-label">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CorporateInvestmentSection() {
  return (
    <section className="corporate-investment" id="investimento">
      <div className="home-shell corporate-investment-grid">
        <div>
          <div className="corporate-kicker">Investimento</div>
          <h2 className="corporate-investment-title">O projeto muda conforme o estágio da operação.</h2>
          <p className="corporate-investment-text">
            Um corretor autônomo não precisa da mesma arquitetura de uma incorporadora. A conversa inicial serve para entender cenário, urgência, time, canais e escopo antes de propor formato.
          </p>
          <div className="corporate-investment-actions">
            <Button variant="primary" size="lg" icon="phone" iconRight="arrowRight" onClick={openWhatsApp}>
              Mapear meu projeto
            </Button>
            <span className="corporate-investment-note">Sem proposta pronta antes de entender o cenário.</span>
          </div>
        </div>

        <div className="corporate-pricing-panel">
          <div className="corporate-price-range">
            <div className="corporate-price-box">
              <div className="corporate-price-label">Entrada possível</div>
              <div className="corporate-price-value">R$500</div>
            </div>
            <div className="corporate-price-divider" aria-hidden="true" />
            <div className="corporate-price-box featured">
              <div className="corporate-price-label">Projeto completo</div>
              <div className="corporate-price-value">R$20.000</div>
            </div>
          </div>

          <div className="corporate-scope-grid">
            {corporateScopeItems.map(([number, title, body]) => (
              <article className="corporate-scope-card" key={number}>
                <div className="corporate-scope-number">{number}</div>
                <div className="corporate-scope-title">{title}</div>
                <div className="corporate-scope-text">{body}</div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CorporateProofSection() {
  return (
    <section className="corporate-proof">
      <div className="home-shell">
        <div className="corporate-proof-card">
          <div>
            <div className="corporate-kicker">Prova social</div>
            <h2 className="corporate-proof-title">Resultados completos, sem interromper a narrativa da marca.</h2>
            <p className="corporate-proof-text">
              A primeira página apresenta a marca, o ecossistema e os caminhos de solução. Quem quiser validar casos, conversas e transformações pode acessar a página completa de depoimentos.
            </p>
            <div style={{ marginTop: 24 }}>
              <Button variant="ghost" size="lg" iconRight="arrowRight" onClick={() => { window.location.href = TESTIMONIALS_URL; }}>
                Ver depoimentos
              </Button>
            </div>
          </div>
          <div className="corporate-proof-side">
            {corporateProofItems.map(([title, body]) => (
              <div className="corporate-proof-mini" key={title}>
                <strong>{title}</strong>
                <span>{body}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CorporateFaqSection() {
  const [open, setOpen] = React.useState(0);

  return (
    <section className="corporate-faq">
      <div className="home-shell corporate-faq-layout">
        <div>
          <div className="corporate-kicker">Dúvidas diretas</div>
          <h2 className="corporate-faq-title">Antes de escolher um caminho, entenda o essencial.</h2>
          <p className="corporate-section-text" style={{ marginLeft: 0 }}>
            Respostas curtas para decidir qual página interna faz mais sentido para o seu momento.
          </p>
        </div>
        <div className="corporate-faq-list">
          {faqItems.map((item, index) => {
            const isOpen = open === index;
            return (
              <div className={`corporate-faq-item ${isOpen ? 'open' : ''}`} key={item.q}>
                <button className="corporate-faq-question" type="button" onClick={() => setOpen(isOpen ? -1 : index)}>
                  <span>{item.q}</span>
                  <Icon name={isOpen ? 'x' : 'plus'} size={18} color={isOpen ? 'var(--it-lime)' : 'var(--fg-3)'} />
                </button>
                {isOpen && <div className="corporate-faq-answer">{item.a}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CorporateContactSection() {
  return (
    <section className="corporate-contact">
      <div className="home-shell corporate-contact-grid">
        <div>
          <h2 className="corporate-contact-title">Vamos mapear seu projeto?</h2>
          <p className="corporate-contact-text">
            A primeira conversa serve para entender seu momento, escopo e operação antes de prometer formato.
          </p>
        </div>
        <div className="corporate-contact-card">
          <div className="corporate-kicker" style={{ color: 'var(--it-lime-ink)' }}>WhatsApp</div>
          <h3 className="corporate-solution-title" style={{ color: 'var(--it-ink)', fontSize: 24 }}>
            Envie uma mensagem para a Imobiturbo.
          </h3>
          <div className="corporate-check-list">
            {['Seu momento comercial', 'Principal gargalo de fechamento', 'Escopo de mentoria, hub e consultoria'].map((item) => (
              <div className="corporate-check-item" key={item}>
                <Icon name="check" size={18} color="var(--it-lime-ink)" />
                {item}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24 }}>
            <Button variant="dark" size="lg" icon="phone" iconRight="arrowRight" onClick={openWhatsApp}>
              Falar no WhatsApp
            </Button>
          </div>
          <a
            href={INSTAGRAM_URL}
            style={{ display: 'inline-flex', marginTop: 16, color: 'var(--it-ink)', font: '800 13px var(--font-mono)', letterSpacing: '0px', textTransform: 'uppercase', textDecoration: 'none' }}
          >
            Instagram @imobiturbo
          </a>
        </div>
      </div>
    </section>
  );
}

function CorporateHome() {
  return (
    <main className="corporate-home">
      <CorporateHero />
      <AudiencePathsSection />
      <CorporateSolutionsSection />
      <CorporateMoreSolutionsSection />
      <CorporateBridgeSection />
      <MethodSection />
      <CorporateInvestmentSection />
      <CorporateProofSection />
      <CorporateFaqSection />
      <CorporateContactSection />
      <HomeFooter />
    </main>
  );
}

function HomePrototypes() {
  return (
    <div className="home-page it-root">
      <CorporateHeader />
      <CorporateHome />
    </div>
  );
}

window.HomePrototypes = HomePrototypes;
