/* eslint-disable */
// Imobiturbo home — desktop-first redesign with a fully responsive mobile layout.

const HOME_WHATSAPP_URL = 'https://wa.me/5521983747796?text=Quero%20mapear%20minha%20opera%C3%A7%C3%A3o%20comercial%20com%20a%20Imobiturbo';
const HOME_INSTAGRAM_URL = 'https://www.instagram.com/imobiturbo/';
const HOME_TESTIMONIALS_URL = '/depoimentos/';

function trackHomeEvent(name, properties = {}) {
  if (typeof window.imtTrack === 'function') return window.imtTrack(name, properties);
  return window.__track?.track?.(name, properties) || null;
}

const HOME_ASSETS = {
  hero: 'assets/home-hero-operacao-imobiliaria.webp',
  method: 'assets/home-metodo-corretor-solo.webp',
  warRoom: 'assets/home-consultoria-warroom.webp',
  logo: 'assets/logo-imobiturbo-white.png',
};

const HOME_NAV_LINKS = [
  ['O que faz', '#o-que-faz'],
  ['Para quem', '#publicos'],
  ['Como faz', '#como-faz'],
  ['Método', '#metodo'],
  ['Depoimentos', '#depoimentos'],
];

const HOME_AUDIENCES = [
  {
    title: 'Corretor\nautônomo',
    body: 'Venda com processo, mesmo carregando a operação sozinho.',
    href: '/corretor-autonomo/',
    image: HOME_ASSETS.method,
    imageAlt: 'Mesa de trabalho de um corretor com funil comercial, plantas e WhatsApp.',
    imagePosition: 'center',
  },
  {
    title: 'Imobiliárias',
    body: 'Alinhe o time, padronize o atendimento e faça o funil avançar.',
    href: '/imobiliarias/',
    image: HOME_ASSETS.warRoom,
    imageAlt: 'Sala de operação imobiliária com quadro de estratégia comercial.',
    imagePosition: 'center',
  },
  {
    title: 'Construtoras e\nincorporadoras',
    body: 'Integre lançamento, canais e velocidade comercial.',
    href: '/construtoras-incorporadoras/',
    image: HOME_ASSETS.hero,
    imageAlt: 'Operação de incorporação imobiliária diante de edifícios à noite.',
    imagePosition: '72% center',
  },
];

const HOME_METHOD_STEPS = [
  ['01', 'Captação', 'Origem, nicho, oferta e rotina de entrada.'],
  ['02', 'Atendimento', 'Contexto, critério e próximo passo claro.'],
  ['03', 'Follow-up', 'Cadência sem sumir e sem pressionar.'],
  ['04', 'Negociação', 'Margem, comissão e valor percebido protegidos.'],
  ['05', 'Fechamento', 'Documento, decisão e assinatura com processo.'],
];

const HOME_PROOF_IMAGES = [
  {
    src: 'assets/testimonials/resultados-01.webp',
    alt: 'Resultados de clientes Imobiturbo com melhora nas vendas, comissão e custo por conversa.',
    className: 'proof-shot proof-shot-a',
  },
  {
    src: 'assets/testimonials/resultados-03.webp',
    alt: 'Relato de cliente mentorado sobre duas vendas e quinze mil reais em comissão.',
    className: 'proof-shot proof-shot-b',
  },
  {
    src: 'assets/testimonials/resultados-02.webp',
    alt: 'Mensagem de cliente que fechou o primeiro apartamento após quatro dias de implementação.',
    className: 'proof-shot proof-shot-c',
  },
];

const HOME_DIAGNOSTIC_QUESTIONS = [
  {
    key: 'perfil',
    title: 'Qual é o seu perfil?',
    options: [
      ['Corretor autônomo', 'target'],
      ['Imobiliária', 'users'],
      ['Construtora ou incorporadora', 'building'],
    ],
  },
  {
    key: 'gargalo',
    title: 'O que mais trava o avanço hoje?',
    options: [
      ['Leads sem prioridade', 'funnel'],
      ['Atendimento sem padrão', 'phone'],
      ['Follow-up inconsistente', 'clock'],
      ['Gestão sem visibilidade', 'clipboard'],
    ],
  },
  {
    key: 'estrutura',
    title: 'Como a operação é acompanhada?',
    options: [
      ['Memória e WhatsApp', 'phone'],
      ['Planilhas e ferramentas soltas', 'fileText'],
      ['CRM sem rotina definida', 'building'],
      ['Processo claro e acompanhado', 'check'],
    ],
  },
];

function HomeButton({ href, children, variant = 'lime', icon, iconRight = true, target, onClick }) {
  return (
    <a
      className={`home-button home-button-${variant}`}
      href={href}
      target={target}
      rel={target === '_blank' ? 'noopener noreferrer' : undefined}
      onClick={onClick}
    >
      {icon && <Icon name={icon} size={20} stroke={2} />}
      <span>{children}</span>
      {iconRight && <Icon name="arrowRight" size={19} stroke={2.2} />}
    </a>
  );
}

function HomeHeader() {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  React.useEffect(() => {
    document.body.classList.toggle('home-menu-open', menuOpen);
    return () => document.body.classList.remove('home-menu-open');
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={`site-header ${scrolled ? 'is-scrolled' : ''} ${menuOpen ? 'menu-is-open' : ''}`}>
      <div className="home-container site-header-inner">
        <a className="site-logo-link" href="#inicio" aria-label="Imobiturbo — voltar ao início" onClick={closeMenu}>
          <img className="site-logo" src={HOME_ASSETS.logo} alt="Imobiturbo" />
        </a>

        <nav className="site-nav" aria-label="Navegação principal">
          {HOME_NAV_LINKS.map(([label, href]) => (
            <a href={href} key={href}>{label}</a>
          ))}
        </nav>

        <a className="header-whatsapp" href={HOME_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
          <Icon name="whatsapp" size={19} stroke={2} />
          <span>Falar no WhatsApp</span>
        </a>

        <button
          className="menu-toggle"
          type="button"
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <nav className="mobile-menu" id="mobile-menu" aria-label="Navegação mobile" aria-hidden={!menuOpen}>
        <div className="home-container mobile-menu-inner">
          {HOME_NAV_LINKS.map(([label, href]) => (
            <a href={href} key={href} onClick={closeMenu}>{label}<Icon name="arrowRight" size={18} /></a>
          ))}
          <a className="mobile-menu-cta" href={HOME_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" onClick={closeMenu}>
            <Icon name="whatsapp" size={20} stroke={2} />
            Falar no WhatsApp
          </a>
        </div>
      </nav>
    </header>
  );
}

function HeroSection() {
  const benefits = [
    ['target', 'Processo comercial'],
    ['trending', 'Tecnologia aplicada'],
    ['compass', 'Decisão com direção'],
  ];

  return (
    <section className="home-hero" id="inicio">
      <img className="home-hero-image" src={HOME_ASSETS.hero} alt="Mesa de uma operação imobiliária com plantas, celular e a cidade à noite." />
      <div className="home-hero-shade" aria-hidden="true" />
      <div className="home-container home-hero-content">
        <p className="hero-kicker">Ecossistema para crescimento imobiliário</p>
        <h1>Onde vendas, operação e tecnologia imobiliária ganham direção<span className="lime-dot">.</span></h1>
        <p className="hero-lead">Mentoria, hub, comunidade e consultoria para transformar esforço comercial em processo, margem e previsibilidade.</p>
        <div className="hero-actions">
          <HomeButton href="#diagnostico" icon="target" iconRight={false}>Mapear minha operação</HomeButton>
          <a className="hero-text-link" href="#como-faz">Ver como funciona <Icon name="arrowDown" size={16} /></a>
        </div>
      </div>

      <div className="hero-benefits" aria-label="Pilares da Imobiturbo">
        <div className="home-container hero-benefits-inner">
          {benefits.map(([icon, label]) => (
            <div className="hero-benefit" key={label}>
              {icon === 'compass' ? <span className="compass-icon" aria-hidden="true" /> : <Icon name={icon} size={32} stroke={1.7} />}
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProblemSection() {
  const dialogRef = React.useRef(null);
  const pains = [
    'Muito lead.\nPouca prioridade.',
    'Agenda cheia.\nPouca previsibilidade.',
    'Proposta parada\nno WhatsApp.',
    'Time ativo.\nGestão sem visibilidade.',
  ];

  return (
    <section className="problem-section light-section" id="o-que-faz">
      <div className="home-container problem-layout">
        <button
          className="problem-visual"
          type="button"
          aria-haspopup="dialog"
          aria-label="Abrir visão da operação Imobiturbo"
          onClick={() => {
            trackHomeEvent('view_content', {
              content_type: 'operation_modal',
              content_name: 'operacao_imobiturbo',
            });
            dialogRef.current?.showModal();
          }}
        >
          <img src={HOME_ASSETS.warRoom} alt="Sala de operação imobiliária com funil, imóveis e prioridades conectadas." loading="lazy" />
          <span className="play-control" aria-hidden="true"><span /></span>
          <span className="visual-caption">Por dentro da operação</span>
        </button>

        <div className="problem-copy">
          <h2>Você carrega muita coisa. Não precisa operar no escuro<span className="lime-dot">.</span></h2>
          <p>A Imobiturbo organiza decisão, rotina e acompanhamento para transformar esforço comercial em processo.</p>
          <HomeButton href="#diagnostico" variant="dark">Identificar o gargalo</HomeButton>
        </div>
      </div>

      <div className="home-container pain-grid" aria-label="Gargalos comerciais comuns">
        {pains.map((pain) => (
          <div className="pain-item" key={pain}>
            <span aria-hidden="true" />
            <strong>{pain.split('\n').map((line) => <React.Fragment key={line}>{line}<br /></React.Fragment>)}</strong>
          </div>
        ))}
      </div>

      <dialog
        className="operation-dialog"
        ref={dialogRef}
        aria-labelledby="operation-dialog-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <div className="operation-dialog-panel">
          <button className="operation-dialog-close" type="button" aria-label="Fechar visualização" onClick={() => dialogRef.current?.close()}>
            <Icon name="x" size={22} stroke={2} />
          </button>
          <img src={HOME_ASSETS.warRoom} alt="Visão ampliada da sala de operação imobiliária Imobiturbo." />
          <div>
            <span className="operation-dialog-kicker">Por dentro da operação</span>
            <h2 id="operation-dialog-title">Decisão, rotina e acompanhamento no mesmo quadro.</h2>
            <p>A Imobiturbo conecta prioridades, responsáveis e próximos passos para o funil deixar de depender da memória.</p>
            <HomeButton href="#como-faz" onClick={() => dialogRef.current?.close()}>Ver como funciona</HomeButton>
          </div>
        </div>
      </dialog>
    </section>
  );
}

function AudiencesSection() {
  return (
    <section className="audiences-section" id="publicos">
      <div className="home-container audiences-heading">
        <h2>A mesma inteligência. Aplicada a operações diferentes<span className="lime-dot">.</span></h2>
        <p>Cada operação tem um desafio próprio. A direção precisa ser clara.</p>
      </div>

      <div className="home-container audience-columns">
        {HOME_AUDIENCES.map((audience) => (
          <a className="audience-path" href={audience.href} key={audience.title}>
            <div className="audience-image-wrap">
              <img src={audience.image} alt={audience.imageAlt} loading="lazy" style={{ objectPosition: audience.imagePosition }} />
            </div>
            <div className="audience-copy">
              <h3>{audience.title.split('\n').map((line) => <React.Fragment key={line}>{line}<br /></React.Fragment>)}</h3>
              <p>{audience.body}</p>
              <span className="inline-link">Conhecer este caminho <Icon name="arrowRight" size={17} /></span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

function MiniHubVisual() {
  return (
    <div className="mini-hub" aria-label="Visual do software Imobiturbo">
      <div className="mini-hub-sidebar">
        <img src={HOME_ASSETS.logo} alt="" aria-hidden="true" />
        {[0, 1, 2, 3, 4].map((item) => <span className={item === 1 ? 'active' : ''} key={item} />)}
      </div>
      <div className="mini-hub-main">
        <span className="mini-hub-title">Pipeline</span>
        <div className="mini-hub-stats"><b>12</b><b>8</b><b>6</b></div>
        {[0, 1, 2, 3].map((item) => <span className="mini-hub-row" key={item}><i /><i /><em /></span>)}
      </div>
    </div>
  );
}

function EcosystemSection() {
  const items = [
    {
      title: 'Mentoria',
      body: 'Diagnóstico, plano de ação e direção comercial.',
      visual: <img src={HOME_ASSETS.warRoom} alt="Mentoria com quadro visual da operação imobiliária." loading="lazy" />,
    },
    {
      title: 'Software / hub',
      body: 'Pipeline, tarefas, propostas e follow-up.',
      visual: <MiniHubVisual />,
    },
    {
      title: 'Comunidade',
      body: 'Troca com quem vive os mesmos desafios do mercado.',
      visual: (
        <div className="community-visual">
          <img src={HOME_ASSETS.warRoom} alt="Encontro de profissionais para discutir a operação comercial." loading="lazy" />
          <strong>Operação<br />com direção</strong>
        </div>
      ),
    },
    {
      title: 'Consultoria',
      body: 'Posicionamento, campanha e operação ajustados ao projeto.',
      visual: <img src={HOME_ASSETS.hero} alt="Consultoria aplicada ao contexto de uma operação imobiliária." loading="lazy" />,
    },
  ];

  return (
    <section className="ecosystem-section light-section" id="como-faz">
      <div className="home-container ecosystem-intro">
        <div>
          <h2>Quatro frentes. Uma operação que avança<span className="lime-dot">.</span></h2>
          <p>Visão, rotina, repertório e execução conectados em uma única lógica de crescimento.</p>
        </div>
        <div className="ecosystem-aside">
          <HomeButton href="#metodo" variant="dark">Ver o ecossistema em ação</HomeButton>
          <p>Um sistema integrado que alinha estratégia, ferramentas, pessoas e inteligência para gerar resultados consistentes.</p>
        </div>
      </div>

      <div className="home-container ecosystem-panel">
        <div className="ecosystem-line" aria-hidden="true" />
        <div className="ecosystem-steps">
          {items.map((item) => (
            <article className="ecosystem-step" key={item.title}>
              <span className="ecosystem-node" aria-hidden="true" />
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <div className="ecosystem-visual">{item.visual}</div>
            </article>
          ))}
          <article className="ecosystem-outcome">
            <span className="outcome-arrow" aria-hidden="true">↓</span>
            <strong>Operação<br />com direção</strong>
            <p>Decisões melhores.<br />Processos alinhados.<br />Resultados que se repetem.</p>
          </article>
        </div>
      </div>
    </section>
  );
}

function MethodSection() {
  return (
    <section className="method-section" id="metodo">
      <img className="method-background" src={HOME_ASSETS.method} alt="Método comercial aplicado da captação ao fechamento." loading="lazy" />
      <div className="method-shade" aria-hidden="true" />
      <div className="home-container method-content">
        <div className="method-copy">
          <h2>Da captação ao fechamento. Método para a rotina real<span className="lime-dot">.</span></h2>
          <p>Um processo claro para priorizar oportunidades, conduzir conversas e avançar decisões.</p>
          <HomeButton href="#diagnostico">Conhecer o método</HomeButton>
        </div>

        <ol className="method-steps">
          {HOME_METHOD_STEPS.map(([number, title, body]) => (
            <li key={number}>
              <span className="method-node" aria-hidden="true" />
              <div className="method-step-heading"><b>{number}</b><strong>{title}</strong></div>
              <p>{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ProofSection() {
  return (
    <section className="proof-section" id="depoimentos">
      <div className="proof-copy">
        <div className="proof-copy-inner">
          <h2>Resultados reais. Conversas reais. Processo que aparece<span className="lime-dot">.</span></h2>
          <p>A prova não vem de promessa genérica. Vem de quem organizou a operação, aplicou o método e começou a avançar.</p>
          <blockquote>“Implementei tudo certinho. Em 4 dias foram 8 leads. Fechei o primeiro apartamento ontem.”</blockquote>
          <HomeButton href={HOME_TESTIMONIALS_URL} variant="dark">Ver todos os depoimentos</HomeButton>
        </div>
      </div>

      <div className="proof-gallery" aria-label="Relatos de clientes Imobiturbo">
        <div className="proof-gallery-label">Relatos de clientes Imobiturbo</div>
        <div className="proof-collage">
          {HOME_PROOF_IMAGES.map((image) => (
            <img className={image.className} src={image.src} alt={image.alt} loading="lazy" key={image.src} />
          ))}
        </div>
      </div>

      <div className="proof-more">Mais contexto, relatos e resultados completos em <a href={HOME_TESTIMONIALS_URL}>/depoimentos/</a></div>
    </section>
  );
}

function getDiagnosticResult(answers) {
  const profile = answers.perfil || 'sua operação';
  const bottleneck = answers.gargalo || 'o processo comercial';
  const structure = answers.estrutura || 'a rotina atual';
  let recommendation = 'Começar por um diagnóstico de processo, prioridades e acompanhamento semanal.';

  if (bottleneck.includes('Follow-up')) {
    recommendation = 'Estruturar uma cadência de follow-up com próximos passos, prazos e responsáveis claros.';
  } else if (bottleneck.includes('Gestão')) {
    recommendation = 'Centralizar funil, indicadores e rotina de gestão para transformar atividade em visibilidade.';
  } else if (bottleneck.includes('Atendimento')) {
    recommendation = 'Padronizar o atendimento e definir critérios de qualificação antes de acelerar a geração de leads.';
  } else if (bottleneck.includes('Leads')) {
    recommendation = 'Criar critérios de prioridade e uma rotina diária para avançar as oportunidades certas.';
  }

  return { profile, bottleneck, structure, recommendation };
}

function DiagnosticQuiz() {
  const [step, setStep] = React.useState(0);
  const [selected, setSelected] = React.useState('');
  const [answers, setAnswers] = React.useState({});
  const complete = step >= HOME_DIAGNOSTIC_QUESTIONS.length;
  const question = HOME_DIAGNOSTIC_QUESTIONS[step];
  const result = complete ? getDiagnosticResult(answers) : null;

  const continueQuiz = () => {
    if (!selected || !question) return;
    if (step === 0) {
      trackHomeEvent('quiz_start', { quiz_id: 'diagnostico_operacao' });
    }
    trackHomeEvent('quiz_step_viewed', {
      quiz_id: 'diagnostico_operacao',
      step: step + 1,
      action: 'answered',
    });
    setAnswers((current) => ({ ...current, [question.key]: selected }));
    setSelected('');
    setStep((current) => current + 1);
  };

  const resetQuiz = () => {
    setStep(0);
    setSelected('');
    setAnswers({});
  };

  const resultWhatsappUrl = result
    ? `https://wa.me/5521983747796?text=${encodeURIComponent(`Olá Natan! Fiz o diagnóstico no site da Imobiturbo.\n\nPerfil: ${result.profile}\nPrincipal gargalo: ${result.bottleneck}\nAcompanhamento atual: ${result.structure}\n\nRecomendação inicial: ${result.recommendation}\n\nQuero mapear os próximos passos.`)}`
    : HOME_WHATSAPP_URL;

  return (
    <div className="diagnostic-card">
      {!complete ? (
        <>
          <div className="diagnostic-card-top">
            <span>Diagnóstico comercial</span>
            <span>Passo {step + 1} de {HOME_DIAGNOSTIC_QUESTIONS.length}</span>
          </div>
          <div className="diagnostic-progress" aria-hidden="true">
            <span style={{ transform: `scaleX(${(step + 1) / HOME_DIAGNOSTIC_QUESTIONS.length})` }} />
          </div>
          <h3>{question.title}</h3>
          <div className="diagnostic-options" role="group" aria-label={question.title}>
            {question.options.map(([label, icon]) => {
              const isSelected = selected === label;
              return (
                <button
                  className={isSelected ? 'is-selected' : ''}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelected(label)}
                  key={label}
                >
                  <Icon name={icon} size={25} stroke={1.8} />
                  <span>{label}</span>
                  <Icon name={isSelected ? 'check' : 'chevron'} size={20} stroke={2.1} />
                </button>
              );
            })}
          </div>
          <button className="diagnostic-continue" type="button" onClick={continueQuiz} disabled={!selected}>
            {step === HOME_DIAGNOSTIC_QUESTIONS.length - 1 ? 'Ver meu diagnóstico' : 'Continuar diagnóstico'}
            <Icon name="arrowRight" size={20} stroke={2.2} />
          </button>
          <p className="diagnostic-time"><Icon name="clock" size={15} /> Leva menos de 2 minutos.</p>
        </>
      ) : (
        <div className="diagnostic-result" aria-live="polite">
          <span className="diagnostic-result-label">Mapa inicial concluído</span>
          <h3>Sua operação pede mais direção<span className="lime-dot dark-dot">.</span></h3>
          <dl>
            <div><dt>Perfil</dt><dd>{result.profile}</dd></div>
            <div><dt>Gargalo principal</dt><dd>{result.bottleneck}</dd></div>
            <div><dt>Próximo passo</dt><dd>{result.recommendation}</dd></div>
          </dl>
          <a
            className="diagnostic-result-cta"
            href={resultWhatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackHomeEvent('generate_lead', {
              method: 'whatsapp',
              form: 'diagnostico_operacao',
              profile: result.profile,
            })}
          >
            <Icon name="whatsapp" size={21} stroke={2} />
            Enviar diagnóstico no WhatsApp
          </a>
          <button className="diagnostic-reset" type="button" onClick={resetQuiz}>Refazer diagnóstico</button>
        </div>
      )}
    </div>
  );
}

function DiagnosticSection() {
  return (
    <section className="diagnostic-section" id="diagnostico">
      <div className="diagnostic-background" aria-hidden="true" />
      <div className="home-container diagnostic-layout">
        <div className="diagnostic-copy">
          <h2>O projeto muda conforme o estágio da operação<span className="lime-dot">.</span></h2>
          <p>A conversa inicial define cenário, urgência, time, canais e o nível certo de acompanhamento.</p>
          <ol className="diagnostic-phases">
            <li><b>01</b><div><strong>Diagnóstico</strong><span>Entender momento, gargalo e capacidade de execução.</span></div></li>
            <li><b>02</b><div><strong>Arquitetura</strong><span>Definir mentoria, hub, comunidade e consultoria no tamanho certo.</span></div></li>
            <li><b>03</b><div><strong>Execução</strong><span>Implementar prioridades, rotina e acompanhamento.</span></div></li>
          </ol>
        </div>
        <DiagnosticQuiz />
      </div>
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section className="final-cta">
      <img src={HOME_ASSETS.hero} alt="Operação imobiliária preparada para crescer com direção." loading="lazy" />
      <div className="final-cta-shade" aria-hidden="true" />
      <div className="home-container final-cta-content">
        <h2>A direção que falta pode começar em uma conversa<span className="lime-dot">.</span></h2>
        <p>Mapeie o gargalo, entenda o próximo passo e descubra qual formato faz sentido para a sua operação.</p>
        <HomeButton href={HOME_WHATSAPP_URL} icon="whatsapp" iconRight={false} target="_blank">Falar com a Imobiturbo</HomeButton>
        <a className="final-testimonials-link" href={HOME_TESTIMONIALS_URL}>Ver depoimentos <Icon name="arrowRight" size={17} /></a>
      </div>
    </section>
  );
}

function HomeFooter() {
  return (
    <footer className="home-footer">
      <div className="home-container footer-main">
        <div className="footer-brand">
          <img src={HOME_ASSETS.logo} alt="Imobiturbo" />
          <p>Tecnologia, mentoria, comunidade e consultoria para operações imobiliárias venderem com mais direção.</p>
        </div>
        <div className="footer-column">
          <strong>Páginas</strong>
          <a href="/corretor-autonomo/">Corretor autônomo</a>
          <a href="/imobiliarias/">Imobiliárias</a>
          <a href="/construtoras-incorporadoras/">Construtoras e incorporadoras</a>
        </div>
        <div className="footer-column">
          <strong>Ecossistema</strong>
          <a href="#como-faz">Mentoria</a>
          <a href="#como-faz">Software / hub</a>
          <a href="#como-faz">Comunidade</a>
          <a href="#como-faz">Consultoria</a>
        </div>
        <div className="footer-column">
          <strong>Contato</strong>
          <a href={HOME_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <a href={HOME_INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">Instagram</a>
          <a href={HOME_TESTIMONIALS_URL}>Depoimentos</a>
        </div>
      </div>
      <div className="home-container footer-bottom">© 2026 Imobiturbo. Todos os direitos reservados.</div>
    </footer>
  );
}

function HomePrototypes() {
  return (
    <div className="home-page it-root">
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <HomeHeader />
      <main id="conteudo">
        <HeroSection />
        <ProblemSection />
        <AudiencesSection />
        <EcosystemSection />
        <MethodSection />
        <ProofSection />
        <DiagnosticSection />
        <FinalCtaSection />
      </main>
      <HomeFooter />
    </div>
  );
}

window.HomePrototypes = HomePrototypes;
