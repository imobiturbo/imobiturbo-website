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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: isMobile ? 16 : 28,
  };

  const logoStyle = {
    width: isMobile ? 142 : 160,
    height: 'auto',
    display: 'block',
  };

  const linkStyle = {
    color: 'rgba(255,255,255,0.86)',
    font: '800 13px/1 "Futura LT Cond", "Barlow Condensed", system-ui, sans-serif',
    letterSpacing: 0,
    textTransform: 'uppercase',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    transition: 'color var(--dur-base) var(--ease-out)',
  };

  return (
    <header className={`aud-topbar ${isOpen ? 'menu-open' : ''}`} style={headerStyle}>
      <div className="aud-shell aud-topbar-inner" style={shellStyle}>
        <a href="/" onClick={closeMenu} style={{ display: 'inline-flex', alignItems: 'center', lineHeight: 0, textDecoration: 'none' }}>
          <img className="aud-logo" src="../assets/logo-imobiturbo-white.png" alt="Imobiturbo" style={logoStyle} />
        </a>

        <nav className="aud-nav" aria-label="Navegação principal" style={{ display: isMobile ? 'none' : 'flex', gap: 18, alignItems: 'center', marginLeft: 'auto' }}>
          {headerLinks.map(([label, href]) => (
            <a href={href} key={label} style={linkStyle}>
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
          <div className="aud-kicker">A Transformação</div>
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

const DIAGNOSTIC_QUESTIONS = {
  corretor: [
    {
      q: "Qual o seu principal desafio hoje?",
      options: [
        "Organizar a rotina de vendas",
        "Fazer follow-up sem ser chato",
        "Negociar e defender comissão",
        "Falta de previsibilidade de vendas"
      ]
    },
    {
      q: "Quantos leads você atende por mês?",
      options: [
        "Menos de 10 leads",
        "De 10 a 30 leads",
        "Mais de 30 leads"
      ]
    },
    {
      q: "Onde você centraliza seus atendimentos?",
      options: [
        "Apenas no WhatsApp pessoal",
        "Caderno ou Planilha",
        "CRM imobiliário tradicional",
        "Não centralizo, fica tudo solto"
      ]
    }
  ],
  imobiliarias: [
    {
      q: "Qual a maior dificuldade da imobiliária?",
      options: [
        "Time de corretores sem método",
        "Funil comercial bagunçado",
        "Leads esfriando sem resposta",
        "Reuniões comerciais pouco produtivas"
      ]
    },
    {
      q: "Qual o tamanho da sua equipe comercial?",
      options: [
        "Até 5 corretores",
        "De 5 a 15 corretores",
        "Mais de 15 corretores"
      ]
    },
    {
      q: "Como está a cadência comercial hoje?",
      options: [
        "Dependemos da memória de cada um",
        "Cobramos por planilha de forma solta",
        "Temos CRM mas o time não preenche"
      ]
    }
  ],
  incorporadoras: [
    {
      q: "Qual o foco da operação comercial agora?",
      options: [
        "Absorver estoque remanescente",
        "Estruturar canais para lançamento",
        "Melhorar conversão de leads de mídia",
        "Alinhar posicionamento de produto"
      ]
    },
    {
      q: "Como é feita a distribuição de leads?",
      options: [
        "Direto para imobiliárias parceiras",
        "Para house interna de vendas",
        "Misto (House + Imobiliárias parceiras)"
      ]
    },
    {
      q: "Qual o maior gargalo no funil?",
      options: [
        "Baixo volume de visitas/propostas",
        "SLA lento no atendimento da origem",
        "Falta de leitura integrada dos canais"
      ]
    }
  ]
};

function generateDiagnostic(segment, answers) {
  const ans = answers || [];
  if (segment === 'corretor') {
    return {
      title: "Gargalo Crítico: Organização e Cadência Solo",
      analysis: `Você atende ${ans[1] || 'leads'} e centraliza no "${ans[2] || 'sistema'}". O desafio principal ("${ans[0] || ''}") ocorre porque operar de forma reativa no dia a dia dispersa oportunidades e pressiona suas comissões.`,
      recommendation: "Recomendamos a Mentoria Individual combinada com o Hub de Vendas Imobiturbo para organizar propostas, follow-up automático e dar ritmo comercial."
    };
  } else if (segment === 'imobiliarias') {
    return {
      title: "Gargalo de Gestão: Cadência e Padrão de Equipe",
      analysis: `Com uma equipe comercial de ${ans[1] || 'corretores'} e acompanhamento via "${ans[2] || ''}", a dificuldade em "${ans[0] || ''}" indica falta de um funil centralizado com critérios objetivos de avanço.`,
      recommendation: "Recomendamos o pacote de Consultoria de Processos + Implementação de Pipeline para Imobiliárias com rituais comerciais estruturados."
    };
  } else {
    return {
      title: "Gargalo de Lançamento: Coordenação e SLA de Canais",
      analysis: `Sua distribuição para "${ans[1] || 'canais'}" aliada ao gargalo de "${ans[2] || ''}" sinaliza uma quebra na régua de relacionamento e no acompanhamento de leads de lançamentos.`,
      recommendation: "Recomendamos a Consultoria Estratégica da Imobiturbo para alinhar campanhas, SLA de atendimento e funil de absorção de estoque."
    };
  }
}

function getDiagnosticWhatsAppUrl(segmentName, answers, diagnostic) {
  const baseText = `Olá Natan! Acabei de fazer o diagnóstico comercial no site da Imobiturbo para *${segmentName}*.\n\n*Respostas:*\n1. Desafio: ${answers[0]}\n2. Operação: ${answers[1]}\n3. Centralização: ${answers[2]}\n\n*Resultado:* ${diagnostic.title}\n*Recomendação:* ${diagnostic.recommendation}\n\nQuero agendar uma conversa para mapear este cenário.`;
  return `https://wa.me/5521983747796?text=${encodeURIComponent(baseText)}`;
}

function calculateScores(segment, answers) {
  const ans = answers || [];
  let score1 = 50, score2 = 50, score3 = 50;

  if (segment === 'corretor') {
    // Q1 (Desafio)
    if (ans[0] === "Organizar a rotina de vendas") { score1 = 30; score2 = 55; score3 = 40; }
    else if (ans[0] === "Fazer follow-up sem ser chato") { score1 = 60; score2 = 30; score3 = 50; }
    else if (ans[0] === "Negociar e defender comissão") { score1 = 65; score2 = 60; score3 = 45; }
    else { score1 = 40; score2 = 40; score3 = 35; }

    // Q2 (Leads)
    if (ans[1] === "Menos de 10 leads") { score3 += 30; score2 += 15; }
    else if (ans[1] === "De 10 a 30 leads") { score3 += 15; score2 += 10; }
    else { score3 += 5; score2 += 5; }

    // Q3 (Centraliza)
    if (ans[2] === "Apenas no WhatsApp pessoal") { score1 += 10; score3 += 10; }
    else if (ans[2] === "Caderno ou Planilha") { score1 += 15; score3 += 15; }
    else if (ans[2] === "CRM imobiliário tradicional") { score1 += 30; score3 += 20; }
    else { score1 += 5; score3 += 5; }
  } else if (segment === 'imobiliarias') {
    // Q1 (Desafio)
    if (ans[0] === "Time de corretores sem método") { score1 = 35; score2 = 50; score3 = 45; }
    else if (ans[0] === "Funil comercial bagunçado") { score1 = 25; score2 = 45; score3 = 40; }
    else if (ans[0] === "Leads esfriando sem resposta") { score1 = 50; score2 = 25; score3 = 45; }
    else { score1 = 55; score2 = 50; score3 = 30; }

    // Q2 (Equipe)
    if (ans[1] === "Até 5 corretores") { score3 += 30; score1 += 15; }
    else if (ans[1] === "De 5 a 15 corretores") { score3 += 15; score1 += 10; }
    else { score3 += 5; score1 += 5; }

    // Q3 (Cadência)
    if (ans[2] === "Dependemos da memória de cada um") { score2 += 5; score1 += 5; }
    else if (ans[2] === "Cobramos por planilha de forma solta") { score2 += 15; score1 += 15; }
    else { score2 += 30; score1 += 25; }
  } else {
    // Q1 (Foco)
    if (ans[0] === "Absorver estoque remanescente") { score1 = 40; score2 = 50; score3 = 40; }
    else if (ans[0] === "Estruturar canais para lançamento") { score1 = 30; score2 = 40; score3 = 50; }
    else if (ans[0] === "Melhorar conversão de leads de mídia") { score1 = 50; score2 = 30; score3 = 45; }
    else { score1 = 55; score2 = 50; score3 = 35; }

    // Q2 (Distribuição)
    if (ans[1] === "Direto para imobiliárias parceiras") { score2 += 10; score1 += 15; }
    else if (ans[1] === "Para house interna de vendas") { score2 += 25; score1 += 25; }
    else { score2 += 20; score1 += 20; }

    // Q3 (Gargalo)
    if (ans[2] === "Baixo volume de visitas/propostas") { score2 += 10; score3 += 10; }
    else if (ans[2] === "SLA lento no atendimento da origem") { score2 += 5; score3 += 5; }
    else { score2 += 15; score3 += 15; }
  }

  const clamp = (val) => Math.min(Math.max(val, 15), 90);

  return {
    organizacao: clamp(score1),
    cadencia: clamp(score2),
    tempo: clamp(score3)
  };
}

function AudienceCta({ page }) {
  const segmentKey = page.eyebrow.toLowerCase().includes('corretor')
    ? 'corretor'
    : page.eyebrow.toLowerCase().includes('imobiliária')
      ? 'imobiliarias'
      : 'incorporadoras';

  const questions = DIAGNOSTIC_QUESTIONS[segmentKey];

  const [displayedStep, setDisplayedStep] = React.useState(0);
  const [answers, setAnswers] = React.useState([]);
  const [animationClass, setAnimationClass] = React.useState('');
  const [hoveredOption, setHoveredOption] = React.useState(-1);
  const [hoveredBtn, setHoveredBtn] = React.useState(false);
  const [scoresRevealed, setScoresRevealed] = React.useState(false);

  const navigateToStep = (targetStep) => {
    setAnimationClass('slide-out');
    setTimeout(() => {
      setDisplayedStep(targetStep);
      setAnimationClass('slide-in');
    }, 180);
  };

  const handleStart = () => {
    setAnswers([]);
    navigateToStep(1);
  };

  const handleSelectOption = (option) => {
    const nextAnswers = [...answers, option];
    setAnswers(nextAnswers);
    setHoveredOption(-1);
    navigateToStep(nextAnswers.length + 1);
  };

  const handleBack = () => {
    if (displayedStep > 1) {
      const nextAnswers = answers.slice(0, -1);
      setAnswers(nextAnswers);
      navigateToStep(nextAnswers.length + 1);
    } else {
      navigateToStep(0);
    }
  };

  const handleReset = () => {
    setAnswers([]);
    setScoresRevealed(false);
    navigateToStep(0);
  };

  React.useEffect(() => {
    if (displayedStep === 4) {
      const timer = setTimeout(() => {
        setScoresRevealed(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [displayedStep]);

  React.useEffect(() => {
    if (animationClass === 'slide-in') {
      const timer = setTimeout(() => {
        setAnimationClass('');
      }, 220);
      return () => clearTimeout(timer);
    }
  }, [animationClass]);

  const diagnostic = displayedStep === 4 ? generateDiagnostic(segmentKey, answers) : null;
  const whatsappUrl = displayedStep === 4 ? getDiagnosticWhatsAppUrl(page.eyebrow, answers, diagnostic) : '';
  const scores = displayedStep === 4 ? calculateScores(segmentKey, answers) : null;

  return (
    <section className="aud-cta">
      <div className="aud-shell aud-cta-grid">
        <div>
          <h2 className="aud-cta-title">{page.ctaTitle}</h2>
          <p className="aud-cta-text">{page.ctaText}</p>
        </div>
        <div className="aud-cta-panel" style={{ minHeight: 400, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className={`aud-cta-panel-inner ${animationClass}`} style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flexGrow: 1 }}>
            {displayedStep === 0 && (
              <>
                <div>
                  <div className="aud-kicker" style={{ color: '#7a911c' }}>Próximo passo</div>
                  <div className="aud-card-title" style={{ color: 'var(--it-ink)', marginTop: 12 }}>Comece pelo diagnóstico.</div>
                  <p className="aud-card-text" style={{ color: 'rgba(0,0,0,0.65)', lineHeight: 1.5, marginTop: 10 }}>
                    Responda a 3 perguntas rápidas para mapear o gargalo comercial da sua operação imobiliária.
                  </p>
                </div>
                <div style={{ marginTop: 22 }}>
                  <Button variant="dark" size="lg" iconRight="arrowRight" onClick={handleStart} style={{ width: '100%' }}>
                    Iniciar Diagnóstico Comercial
                  </Button>
                </div>
              </>
            )}

            {displayedStep >= 1 && displayedStep <= 3 && (
              <>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ font: '800 11px "Futura LT Cond", "Barlow Condensed", sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#7a911c' }}>
                      Diagnóstico Comercial
                    </span>
                    <span style={{ font: '800 11px "Futura LT Cond", "Barlow Condensed", sans-serif', textTransform: 'uppercase', color: 'rgba(0,0,0,0.5)' }}>
                      Passo {displayedStep} de 3
                    </span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(0,0,0,0.06)', borderRadius: 2, overflow: 'hidden', marginBottom: 18 }}>
                    <div className="aud-progress-bar-fill" style={{ width: `${((displayedStep - 1) / 3) * 100}%` }} />
                  </div>
                  <h3 style={{ font: '800 17px/1.25 var(--font-body)', color: 'var(--it-ink)', margin: '0 0 16px' }}>
                    {questions[displayedStep - 1].q}
                  </h3>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {questions[displayedStep - 1].options.map((option, index) => {
                      const isHovered = hoveredOption === index;
                      return (
                        <button
                          key={option}
                          onClick={() => handleSelectOption(option)}
                          onMouseEnter={() => setHoveredOption(index)}
                          onMouseLeave={() => setHoveredOption(-1)}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            background: isHovered ? 'rgba(191, 215, 48, 0.09)' : '#fcfcfc',
                            border: isHovered ? '1.5px solid #7a911c' : '1.5px solid rgba(0,0,0,0.08)',
                            borderRadius: 8,
                            padding: '11px 14px',
                            font: '700 13px var(--font-body)',
                            color: 'var(--it-ink)',
                            cursor: 'pointer',
                            transition: 'all 120ms ease-out',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12
                          }}
                        >
                          {option}
                          <span style={{
                            width: 6,
                            height: 6,
                            borderRadius: 999,
                            background: isHovered ? '#7a911c' : 'transparent',
                            transition: 'background 120ms'
                          }} />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-start' }}>
                  <button
                    onClick={handleBack}
                    onMouseEnter={() => setHoveredBtn(true)}
                    onMouseLeave={() => setHoveredBtn(false)}
                    style={{
                      background: 'transparent',
                      border: 0,
                      padding: 0,
                      font: '800 12px "Futura LT Cond", "Barlow Condensed", sans-serif',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: hoveredBtn ? '#7a911c' : 'rgba(0,0,0,0.5)',
                      cursor: 'pointer',
                      transition: 'color 120ms'
                    }}
                  >
                    ← Voltar
                  </button>
                </div>
              </>
            )}

            {displayedStep === 4 && diagnostic && scores && (
              <>
                <div>
                  <div style={{ height: 4, background: '#7a911c', borderRadius: 2, marginBottom: 14 }} />
                  <span style={{ font: '800 11px "Futura LT Cond", "Barlow Condensed", sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#7a911c' }}>
                    Resultado do Diagnóstico
                  </span>
                  <h3 style={{ font: '800 18px/1.2 var(--font-body)', color: 'var(--it-ink)', margin: '6px 0 10px' }}>
                    {diagnostic.title}
                  </h3>
                  <p style={{ font: '500 13px/1.5 var(--font-body)', color: 'rgba(0,0,0,0.72)', margin: '0 0 16px' }}>
                    {diagnostic.analysis}
                  </p>

                  <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', font: '800 11px var(--font-body)', textTransform: 'uppercase', color: 'var(--it-ink)', marginBottom: 4 }}>
                        <span>Organização Comercial</span>
                        <span style={{ color: '#7a911c' }}>{scores.organizacao}%</span>
                      </div>
                      <div style={{ height: 8, background: 'rgba(0,0,0,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                        <div className="aud-score-bar-fill" style={{ width: scoresRevealed ? `${scores.organizacao}%` : '0%' }} />
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', font: '800 11px var(--font-body)', textTransform: 'uppercase', color: 'var(--it-ink)', marginBottom: 4 }}>
                        <span>Cadência Comercial</span>
                        <span style={{ color: '#7a911c' }}>{scores.cadencia}%</span>
                      </div>
                      <div style={{ height: 8, background: 'rgba(0,0,0,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                        <div className="aud-score-bar-fill" style={{ width: scoresRevealed ? `${scores.cadencia}%` : '0%' }} />
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', font: '800 11px var(--font-body)', textTransform: 'uppercase', color: 'var(--it-ink)', marginBottom: 4 }}>
                        <span>Eficiência de Tempo</span>
                        <span style={{ color: '#7a911c' }}>{scores.tempo}%</span>
                      </div>
                      <div style={{ height: 8, background: 'rgba(0,0,0,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                        <div className="aud-score-bar-fill" style={{ width: scoresRevealed ? `${scores.tempo}%` : '0%' }} />
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(191, 215, 48, 0.08)', border: '1.5px solid rgba(191, 215, 48, 0.22)', borderRadius: 10, padding: 12 }}>
                    <div style={{ font: '800 11px "Futura LT Cond", "Barlow Condensed", sans-serif', textTransform: 'uppercase', color: '#7a911c', marginBottom: 4 }}>
                      Recomendação Imobiturbo
                    </div>
                    <p style={{ font: '700 12px/1.45 var(--font-body)', color: 'var(--it-ink)', margin: 0 }}>
                      {diagnostic.recommendation}
                    </p>
                  </div>
                </div>
                <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aud-whatsapp-btn"
                    style={{
                      minHeight: 42,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 999,
                      background: 'var(--it-ink)',
                      color: '#fff',
                      padding: '0 24px',
                      font: '800 14px var(--font-body)',
                      textDecoration: 'none',
                      textAlign: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  >
                    Enviar diagnóstico para WhatsApp
                  </a>
                  <button
                    onClick={handleReset}
                    style={{
                      background: 'transparent',
                      border: 0,
                      padding: 0,
                      font: '800 11px "Futura LT Cond", "Barlow Condensed", sans-serif',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: 'rgba(0,0,0,0.4)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      marginTop: 4
                    }}
                  >
                    Refazer Diagnóstico
                  </button>
                </div>
              </>
            )}
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
