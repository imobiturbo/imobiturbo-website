/* eslint-disable */
// Imobiturbo home — desktop-first redesign with a fully responsive mobile layout.

const HOME_INSTAGRAM_URL = 'https://www.instagram.com/imobiturbo/';
const HOME_TESTIMONIALS_URL = '/depoimentos/';

function trackHomeEvent(name, properties = {}) {
  return typeof window.imtTrack === 'function' ? window.imtTrack(name, properties) : null;
}

const HOME_ASSETS = {
  hero: 'assets/home-hero-operacao-imobiliaria.webp',
  method: 'assets/home-metodo-corretor-solo.webp',
  warRoom: 'assets/home-consultoria-warroom.webp',
  logo: 'assets/logo-imobiturbo-white.webp',
};

const HOME_NAV_LINKS = [
  ['O que faz', '#o-que-faz'],
  ['Para quem', '#publicos'],
  ['Ecossistema', '#como-faz'],
  ['Método', '#metodo'],
  ['Depoimentos', '#depoimentos'],
  ['Diagnóstico', '#diagnostico'],
  ['FAQ', '#faq'],
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

const ECOSYSTEM_PRODUCTS = [
  { name: 'Imobiturbo OS', desc: 'CRM multitenant com IA invisível no WhatsApp, áudio humano e qualificação socrática.', logo: 'assets/brand/dark/imobiturbo-os.webp', href: '/vagas/' },
  { name: 'Imobiturbo Club', desc: 'Comunidade fechada, encontros ao vivo e cofre de inteligência comercial para corretores.', logo: 'assets/brand/dark/imobiturbo-club.webp', href: 'https://club.imobiturbo.com.br' },
  { name: 'Imobiturbo Sites', desc: 'Landing pages e plataformas de alta velocidade e conversão para lançamentos imobiliários.', logo: 'assets/brand/dark/imobiturbo-sites.webp', href: '#diagnostico' },
  { name: 'Imobiturbo Ads', desc: 'Inteligência de tráfego, criativos validados e captação previsível de compradores qualificados.', logo: 'assets/brand/dark/imobiturbo-ads.webp', href: '#diagnostico' },
  { name: 'Imobiturbo Radar', desc: 'Monitoramento contínuo de concorrência, precificação e oportunidades em tempo real.', logo: 'assets/brand/dark/imobiturbo-radar.webp', href: '#diagnostico' },
];

const HOME_FAQ_ITEMS = [
  {
    question: 'O que é a Imobiturbo?',
    answer: 'A Imobiturbo é um ecossistema comercial e operacional para o mercado imobiliário fundado por Natan Pimentel. Une mentoria prática, consultoria comercial, tecnologia própria (hub operacional e CRM com IA invisível) e comunidade fechada para corretores autônomos, imobiliárias e incorporadoras venderem com processo, margem e previsibilidade.',
  },
  {
    question: 'Como a Imobiturbo ajuda corretores autônomos?',
    answer: 'Ajuda o corretor solo a estruturar sua rotina de captação, organizar conversas de WhatsApp sem perder leads, criar réguas de follow-up contextuais, automatizar pré-atendimento com IA e conduzir negociações protegendo sua comissão integral de 6%.',
  },
  {
    question: 'Como funciona para imobiliárias e incorporadoras?',
    answer: 'Para imobiliárias, padroniza o atendimento da equipe, estabelece SLA de resposta a leads em segundos, implanta indicadores de conversão em tempo real e define rituais de gestão comercial. Para incorporadoras, alinha a velocidade de lançamento, a rede de corretores parceiros e a esteira de fechamento para absorção rápida do estoque.',
  },
  {
    question: 'Qual é o método da Imobiturbo para acelerar vendas imobiliárias?',
    answer: 'O método é dividido em 5 etapas fundamentais: 1. Captação (origem, nicho e rotina previsível de entrada); 2. Atendimento (contexto e critério de avanço); 3. Follow-up (cadência contextual sem sumir e sem ser chato); 4. Negociação (proteção de margem e comissão); 5. Fechamento (condução documental e assinatura com processo).',
  },
  {
    question: 'Como agendar um diagnóstico da minha operação comercial?',
    answer: 'Você pode realizar o diagnóstico interativo diretamente nesta página ou entrar em contato pelo WhatsApp oficial (+55 21 96951-6183) para mapear seu volume, perfil, gargalos e os próximos passos.',
  },
];

function formatPhoneBR(value) {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function getUtmParams() {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const utm = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach((key) => {
    const val = params.get(key);
    if (val) utm[key] = val;
  });
  return utm;
}

async function sendLeadToOS(leadData) {
  const utms = getUtmParams();
  const payload = {
    ...leadData,
    ...utms,
    referrer: typeof document !== 'undefined' ? document.referrer : '',
    origem_pagina: typeof window !== 'undefined' ? window.location.href : '',
  };

  // 1. Tentar rota primária first-party Cloudflare Pages Functions
  try {
    const res = await fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Endpoint /api/lead indisponível, tentando envio direto ao OS:', err);
  }

  // 2. Fallback direto para o endpoint público do Imobiturbo OS
  const directRes = await fetch(
    'https://os.imobiturbo.com.br/api/v1/public/form-sources/imt_lp_oficial_30e9db2c23e85e4915f76d8407f0d3f2',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );

  if (!directRes.ok) {
    const errorText = await directRes.text();
    throw new Error(errorText || 'Erro na comunicação com o servidor');
  }

  return await directRes.json();
}

const LeadModalContext = React.createContext({
  isOpen: false,
  openModal: () => {},
  closeModal: () => {},
  modalData: {},
});

const TYPEFORM_PERFIL_OPTIONS = [
  {
    id: 'Corretor autônomo',
    key: '1',
    icon: 'target',
    title: 'Corretor autônomo',
    desc: 'Atuação individual, captação direta de imóveis, anúncios próprios e negociação solo.',
  },
  {
    id: 'Imobiliária',
    key: '2',
    icon: 'users',
    title: 'Imobiliária',
    desc: 'Equipe comercial, gestão de corretores, esteira de atendimento e carteira ativa.',
  },
  {
    id: 'Construtora ou incorporadora',
    key: '3',
    icon: 'building',
    title: 'Construtora ou incorporadora',
    desc: 'Lançamentos imobiliários, coordenação de vendas, plantões e inteligência de estoque.',
  },
];

const TYPEFORM_GARGALO_OPTIONS = [
  {
    id: 'Follow-up inconsistente',
    key: '1',
    icon: 'clock',
    title: 'Follow-up inconsistente / leads esfriam',
    desc: 'Demora no primeiro contato ou perda de timing nas conversas do WhatsApp.',
  },
  {
    id: 'Atrair leads qualificados',
    key: '2',
    icon: 'funnel',
    title: 'Atrair leads realmente qualificados',
    desc: 'Muitos curiosos sem poder de compra ou custo por lead subindo nos anúncios.',
  },
  {
    id: 'Atendimento sem padrão',
    key: '3',
    icon: 'phone',
    title: 'Atendimento sem padrão e sem rotina',
    desc: 'Falta de cadência comercial clara para qualificar, agendar visitas e defender margem.',
  },
  {
    id: 'Gestão sem visibilidade',
    key: '4',
    icon: 'clipboard',
    title: 'Gestão sem visibilidade e sem CRM',
    desc: 'Operação espalhada em planilhas, conversas soltas e sem previsibilidade de funil.',
  },
  {
    id: 'Quero IA no WhatsApp',
    key: '5',
    icon: 'zap',
    title: 'Quero automação com IA no WhatsApp',
    desc: 'Atendimento imediato 24/7 com qualificação socrática inteligente e áudio humano.',
  },
];

const TYPEFORM_FATURAMENTO_OPTIONS = [
  {
    id: 'Até R$ 10 mil/mês',
    key: '1',
    icon: 'target',
    title: 'Até R$ 10 mil/mês',
    desc: 'Fase de estruturação de base, rotina de captação e busca por primeiras vendas regulares.',
  },
  {
    id: 'R$ 10 mil a R$ 30 mil/mês',
    key: '2',
    icon: 'trending',
    title: 'De R$ 10 mil a R$ 30 mil/mês',
    desc: 'Aceleração de volume comercial, comissões regulares e organização da rotina.',
  },
  {
    id: 'R$ 30 mil a R$ 100 mil/mês',
    key: '3',
    icon: 'wallet',
    title: 'De R$ 30 mil a R$ 100 mil/mês',
    desc: 'Escala com equipe, processos de vendas, esteira validada e tecnologia.',
  },
  {
    id: 'Acima de R$ 100 mil/mês',
    key: '4',
    icon: 'shield',
    title: 'Acima de R$ 100 mil/mês',
    desc: 'Operação madura em busca de eficiência máxima, margem alta e inteligência com IA.',
  },
];

function LeadCaptureForm({ initialData = {}, onSuccess, inline = false, ctaText = 'Enviar solicitação de diagnóstico', onClose }) {
  // Se initialData já tiver perfil e gargalo (ex: vindo do quiz na página), avança direto para faturamento/contato
  const initialStep = initialData.perfil && initialData.gargalo ? 3 : 1;
  const [step, setStep] = React.useState(initialStep);
  const [nome, setNome] = React.useState('');
  const [telefone, setTelefone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [perfil, setPerfil] = React.useState(initialData.perfil || 'Corretor autônomo');
  const [gargalo, setGargalo] = React.useState(initialData.gargalo || 'Follow-up inconsistente');
  const [faturamento, setFaturamento] = React.useState(initialData.faturamento || 'De R$ 10 mil a R$ 30 mil/mês');
  const [status, setStatus] = React.useState('idle'); // 'idle' | 'submitting' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = React.useState('');
  const [pendingSelection, setPendingSelection] = React.useState('');

  const nameInputRef = React.useRef(null);

  React.useEffect(() => {
    if (initialData.perfil) setPerfil(initialData.perfil);
    if (initialData.gargalo) setGargalo(initialData.gargalo);
    if (initialData.faturamento) setFaturamento(initialData.faturamento);
    if (initialData.perfil && initialData.gargalo) {
      setStep(3);
    } else {
      setStep(1);
    }
  }, [initialData.perfil, initialData.gargalo, initialData.origem_cta]);

  // Foco automático no input de nome ao entrar na etapa 4
  React.useEffect(() => {
    if (step === 4 && nameInputRef.current) {
      setTimeout(() => nameInputRef.current?.focus(), 150);
    }
  }, [step]);

  // Navegação por atalhos de teclado (1, 2, 3...) estilo Typeform
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;

      if (step === 1) {
        const found = TYPEFORM_PERFIL_OPTIONS.find((o) => o.key === e.key);
        if (found) advanceWithSelection('perfil', found.id, 2);
      } else if (step === 2) {
        const found = TYPEFORM_GARGALO_OPTIONS.find((o) => o.key === e.key);
        if (found) advanceWithSelection('gargalo', found.id, 3);
      } else if (step === 3) {
        const found = TYPEFORM_FATURAMENTO_OPTIONS.find((o) => o.key === e.key);
        if (found) advanceWithSelection('faturamento', found.id, 4);
      } else if (step > 1 && step <= 4 && (e.key === 'Backspace' || e.key === 'ArrowLeft')) {
        handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step]);

  const advanceWithSelection = (field, value, nextStep) => {
    setPendingSelection(value);
    if (field === 'perfil') setPerfil(value);
    if (field === 'gargalo') setGargalo(value);
    if (field === 'faturamento') setFaturamento(value);

    setTimeout(() => {
      setStep(nextStep);
      setPendingSelection('');
    }, 180);
  };

  const handleBack = () => {
    setErrorMessage('');
    setStep((s) => Math.max(1, s - 1));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!nome.trim()) {
      setErrorMessage('Por favor, informe seu nome completo.');
      nameInputRef.current?.focus();
      return;
    }
    const cleanPhone = telefone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('Informe um WhatsApp válido com DDD (mínimo 10 dígitos).');
      return;
    }
    if (!email.trim() || !email.includes('@') || !email.includes('.')) {
      setErrorMessage('Informe um e-mail profissional válido.');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    try {
      const payload = {
        nome: nome.trim(),
        telefone: telefone.trim(),
        email: email.trim().toLowerCase(),
        perfil,
        gargalo,
        faturamento: faturamento || undefined,
        origem_cta: initialData.origem_cta || (inline ? 'diagnostico_inline' : 'formulario_typeform'),
        produto_interesse: initialData.produto_interesse || undefined,
        estrutura: initialData.estrutura || undefined,
        recomendacao: initialData.recomendacao || undefined,
      };

      await sendLeadToOS(payload);

      trackHomeEvent('generate_lead', {
        method: 'form_os',
        form: 'lp_oficial_typeform',
        profile: perfil,
        origem_cta: payload.origem_cta,
      });

      setStatus('success');
      setStep(5);
      if (typeof onSuccess === 'function') onSuccess();
    } catch (err) {
      console.error('Erro ao enviar lead para Imobiturbo OS:', err);
      setErrorMessage('Não foi possível enviar agora. Verifique sua conexão e tente novamente.');
      setStatus('error');
    }
  };

  // Cálculo da barra de progresso do Typeform
  const progressPercent =
    step === 1 ? 25 : step === 2 ? 50 : step === 3 ? 75 : step === 4 ? 95 : 100;

  return (
    <div className={`tf-container ${inline ? 'tf-inline' : ''}`}>
      {/* Barra de progresso Typeform no topo */}
      <div className="tf-progress-track" aria-hidden="true">
        <div className="tf-progress-bar" style={{ width: `${progressPercent}%` }} />
      </div>

      {/* Cabeçalho de navegação (Voltar, Contador de etapas e Contexto) */}
      <div className="tf-header">
        {step > 1 && step <= 4 ? (
          <button type="button" className="tf-back-btn" onClick={handleBack} aria-label="Voltar à etapa anterior">
            <Icon name="arrowLeft" size={14} stroke={2.4} />
            <span>Voltar</span>
          </button>
        ) : (
          <div className="tf-header-placeholder" />
        )}

        <div className="tf-step-counter">
          {step <= 4 ? (
            <>
              <span className="tf-step-current">{step}</span>
              <span className="tf-step-sep">/</span>
              <span className="tf-step-total">4</span>
            </>
          ) : (
            <span className="tf-step-done">Concluído</span>
          )}
        </div>
      </div>

      {/* Banner de contexto opcional (produto de interesse ou diagnóstico prévio) */}
      {initialData.produto_interesse && step <= 4 && (
        <div className="tf-context-banner">
          <span className="tf-context-dot" aria-hidden="true" />
          <span>Interesse em <strong>{initialData.produto_interesse}</strong></span>
        </div>
      )}
      {initialData.origem_cta === 'diagnostico_quiz' && initialData.perfil && step <= 4 && (
        <div className="tf-context-banner">
          <span className="tf-context-dot" aria-hidden="true" />
          <span>Diagnóstico mapeado: <strong>{initialData.perfil}</strong> • <strong>{initialData.gargalo}</strong></span>
        </div>
      )}

      {/* Mensagem de erro */}
      {status === 'error' && errorMessage && (
        <div className="lead-error-banner" role="alert" style={{ marginBottom: '16px' }}>
          <Icon name="x" size={16} stroke={2.5} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 1: PERFIL DA OPERAÇÃO */}
      {/* ========================================================================= */}
      {step === 1 && (
        <div className="tf-step-panel" key="step-1">
          <div className="tf-step-kicker">
            <span>Passo 01 • Estrutura</span>
          </div>
          <h3 className="tf-step-title">Qual é o seu perfil de atuação no mercado?</h3>
          <p className="tf-step-subtitle">Selecione o modelo da sua operação para calibrar o diagnóstico correto:</p>

          <div className="tf-cards-list" role="radiogroup" aria-label="Perfil da operação">
            {TYPEFORM_PERFIL_OPTIONS.map((opt) => {
              const isSelected = perfil === opt.id || pendingSelection === opt.id;
              return (
                <button
                  type="button"
                  key={opt.id}
                  className={`tf-card-btn ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => advanceWithSelection('perfil', opt.id, 2)}
                  role="radio"
                  aria-checked={isSelected}
                >
                  <span className="tf-card-key" aria-hidden="true">{opt.key}</span>
                  <div className="tf-card-body">
                    <div className="tf-card-title">
                      <Icon name={opt.icon} size={17} stroke={2} />
                      <span>{opt.title}</span>
                    </div>
                    <p className="tf-card-desc">{opt.desc}</p>
                  </div>
                  <span className="tf-card-radio" aria-hidden="true">
                    {isSelected && <Icon name="check" size={13} stroke={2.8} />}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="tf-step-footer">
            <span className="tf-keyboard-hint">Dica: pressione <b>1</b>, <b>2</b> ou <b>3</b> no teclado</span>
            <button
              type="button"
              className="tf-advance-btn"
              onClick={() => setStep(2)}
            >
              <span>Avançar</span>
              <Icon name="arrowRight" size={16} stroke={2.2} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 2: PRINCIPAL GARGALO */}
      {/* ========================================================================= */}
      {step === 2 && (
        <div className="tf-step-panel" key="step-2">
          <div className="tf-step-kicker">
            <span>Passo 02 • Gargalo</span>
          </div>
          <h3 className="tf-step-title">Qual é o maior gargalo que trava suas vendas hoje?</h3>
          <p className="tf-step-subtitle">Mapeamos exatamente onde sua esteira comercial está perdendo receita:</p>

          <div className="tf-cards-list" role="radiogroup" aria-label="Maior gargalo hoje">
            {TYPEFORM_GARGALO_OPTIONS.map((opt) => {
              const isSelected = gargalo === opt.id || pendingSelection === opt.id;
              return (
                <button
                  type="button"
                  key={opt.id}
                  className={`tf-card-btn ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => advanceWithSelection('gargalo', opt.id, 3)}
                  role="radio"
                  aria-checked={isSelected}
                >
                  <span className="tf-card-key" aria-hidden="true">{opt.key}</span>
                  <div className="tf-card-body">
                    <div className="tf-card-title">
                      <Icon name={opt.icon} size={17} stroke={2} />
                      <span>{opt.title}</span>
                    </div>
                    <p className="tf-card-desc">{opt.desc}</p>
                  </div>
                  <span className="tf-card-radio" aria-hidden="true">
                    {isSelected && <Icon name="check" size={13} stroke={2.8} />}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="tf-step-footer">
            <span className="tf-keyboard-hint">Dica: pressione de <b>1</b> a <b>5</b> no teclado</span>
            <button
              type="button"
              className="tf-advance-btn"
              onClick={() => setStep(3)}
            >
              <span>Avançar</span>
              <Icon name="arrowRight" size={16} stroke={2.2} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 3: FATURAMENTO / MOMENTO */}
      {/* ========================================================================= */}
      {step === 3 && (
        <div className="tf-step-panel" key="step-3">
          <div className="tf-step-kicker">
            <span>Passo 03 • Escala</span>
          </div>
          <h3 className="tf-step-title">Qual é o faturamento médio mensal da sua operação?</h3>
          <p className="tf-step-subtitle">Para calibrarmos o nível de acompanhamento, esteira e automação ideais:</p>

          <div className="tf-cards-list" role="radiogroup" aria-label="Faixa de faturamento">
            {TYPEFORM_FATURAMENTO_OPTIONS.map((opt) => {
              const isSelected = faturamento === opt.id || pendingSelection === opt.id;
              return (
                <button
                  type="button"
                  key={opt.id}
                  className={`tf-card-btn ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => advanceWithSelection('faturamento', opt.id, 4)}
                  role="radio"
                  aria-checked={isSelected}
                >
                  <span className="tf-card-key" aria-hidden="true">{opt.key}</span>
                  <div className="tf-card-body">
                    <div className="tf-card-title">
                      <Icon name={opt.icon} size={17} stroke={2} />
                      <span>{opt.title}</span>
                    </div>
                    <p className="tf-card-desc">{opt.desc}</p>
                  </div>
                  <span className="tf-card-radio" aria-hidden="true">
                    {isSelected && <Icon name="check" size={13} stroke={2.8} />}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="tf-step-footer">
            <span className="tf-keyboard-hint">Dica: pressione de <b>1</b> a <b>4</b> no teclado</span>
            <button
              type="button"
              className="tf-advance-btn"
              onClick={() => setStep(4)}
            >
              <span>Avançar</span>
              <Icon name="arrowRight" size={16} stroke={2.2} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 4: DADOS DE CONTATO & DIRECIONAMENTO */}
      {/* ========================================================================= */}
      {step === 4 && (
        <form className="tf-step-panel" onSubmit={handleSubmit} noValidate key="step-4">
          <div className="tf-step-kicker">
            <span>Passo 04 • Direcionamento Final</span>
          </div>
          <h3 className="tf-step-title">Onde devemos enviar o plano da sua operação?</h3>
          <p className="tf-step-subtitle">Preencha seus dados para receber o diagnóstico no WhatsApp e falar com nosso time:</p>

          {/* Resumo das escolhas do visitante */}
          <div className="tf-summary-pills" aria-label="Resumo do diagnóstico">
            <button type="button" className="tf-pill" onClick={() => setStep(1)} title="Clique para alterar perfil">
              <span>{perfil}</span>
              <Icon name="chevron" size={11} />
            </button>
            <button type="button" className="tf-pill" onClick={() => setStep(2)} title="Clique para alterar gargalo">
              <span>{gargalo}</span>
              <Icon name="chevron" size={11} />
            </button>
            <button type="button" className="tf-pill" onClick={() => setStep(3)} title="Clique para alterar faturamento">
              <span>{faturamento}</span>
              <Icon name="chevron" size={11} />
            </button>
          </div>

          <div className="lead-field" style={{ marginBottom: '14px' }}>
            <label className="lead-label" htmlFor={inline ? 'tf-nome-inline' : 'tf-nome-modal'}>
              <span>Seu nome completo<span className="required-mark">*</span></span>
            </label>
            <input
              ref={nameInputRef}
              id={inline ? 'tf-nome-inline' : 'tf-nome-modal'}
              type="text"
              className="lead-input"
              placeholder="Ex: João da Silva"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>

          <div className="lead-field" style={{ marginBottom: '14px' }}>
            <label className="lead-label" htmlFor={inline ? 'tf-tel-inline' : 'tf-tel-modal'}>
              <span>WhatsApp comercial com DDD<span className="required-mark">*</span></span>
            </label>
            <input
              id={inline ? 'tf-tel-inline' : 'tf-tel-modal'}
              type="tel"
              className="lead-input"
              placeholder="(21) 99999-9999"
              value={telefone}
              onChange={(e) => setTelefone(formatPhoneBR(e.target.value))}
              required
            />
          </div>

          <div className="lead-field" style={{ marginBottom: '20px' }}>
            <label className="lead-label" htmlFor={inline ? 'tf-email-inline' : 'tf-email-modal'}>
              <span>E-mail profissional<span className="required-mark">*</span></span>
            </label>
            <input
              id={inline ? 'tf-email-inline' : 'tf-email-modal'}
              type="email"
              className="lead-input"
              placeholder="Ex: joao@imobiliaria.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="lead-submit-btn"
            disabled={status === 'submitting'}
          >
            {status === 'submitting' ? (
              <>Cadastrando no Imobiturbo OS...</>
            ) : (
              <>
                <span>Receber diagnóstico no Imobiturbo OS</span>
                <Icon name="arrowRight" size={18} stroke={2.4} />
              </>
            )}
          </button>

          <div className="lead-form-footer-note" style={{ marginTop: '10px' }}>
            🔒 Seus dados serão cadastrados com segurança na 1ª etapa do nosso funil comercial no Imobiturbo OS.
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 5: SUCESSO / CONFIRMAÇÃO TYPEFORM */}
      {/* ========================================================================= */}
      {step === 5 && (
        <div className="tf-success-screen" aria-live="polite" key="step-5">
          <div className="tf-success-glow" aria-hidden="true" />
          <div className="lead-success-icon-wrap" aria-hidden="true">
            <Icon name="check" size={34} stroke={2.6} />
          </div>
          <span className="tf-success-kicker">100% Concluído • Enviado ao Imobiturbo OS</span>
          <h3 className="lead-success-title">Diagnóstico registrado com sucesso!</h3>
          <span className="lead-success-badge">0. Funil de Vendas — Novo Lead</span>

          <p className="lead-success-desc">
            Recebemos os dados de <strong>{nome || 'sua operação'}</strong> para o perfil de <strong>{perfil}</strong> com foco em destravar <strong>{gargalo}</strong>.
          </p>
          <p className="tf-success-subtext">
            Nossa equipe já está analisando seu cenário no <strong>Imobiturbo OS</strong> e entrará em contato via WhatsApp no número <strong>{telefone}</strong> com o direcionamento recomendado.
          </p>

          <div className="tf-success-actions">
            {typeof onClose === 'function' ? (
              <button
                type="button"
                className="lead-submit-btn"
                onClick={onClose}
              >
                Concluir
              </button>
            ) : (
              <button
                type="button"
                className="lead-submit-btn"
                onClick={() => {
                  setStep(1);
                  setStatus('idle');
                  setNome('');
                  setTelefone('');
                  setEmail('');
                }}
              >
                Iniciar novo diagnóstico
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LeadModal({ isOpen, onClose, initialData = {} }) {
  React.useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={`lead-modal-backdrop ${isOpen ? 'is-open' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-modal-title"
    >
      <div className="lead-modal-card tf-modal-card">
        <button
          type="button"
          className="lead-modal-close"
          onClick={onClose}
          aria-label="Fechar formulário"
        >
          ✕
        </button>

        <LeadCaptureForm initialData={initialData} onSuccess={() => {}} onClose={onClose} />
      </div>
    </div>
  );
}

function HomeButton({ href, children, variant = 'lime', icon, iconRight = true, target, onClick }) {
  if (onClick || !href) {
    return (
      <button
        type="button"
        className={`home-button home-button-${variant}`}
        onClick={onClick}
      >
        {icon && <Icon name={icon} size={20} stroke={2} />}
        <span>{children}</span>
        {iconRight && <Icon name="arrowRight" size={19} stroke={2.2} />}
      </button>
    );
  }
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
  const { openModal } = React.useContext(LeadModalContext);
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

        <button
          type="button"
          className="header-whatsapp header-cta-btn"
          onClick={() => openModal({ origem_cta: 'header' })}
          aria-label="Mapear Operação"
        >
          <Icon name="target" size={18} stroke={2.2} />
          <span>Mapear Operação</span>
        </button>

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
          <button
            type="button"
            className="mobile-menu-cta"
            onClick={() => {
              closeMenu();
              openModal({ origem_cta: 'mobile_menu' });
            }}
          >
            <Icon name="target" size={20} stroke={2.2} />
            Mapear minha operação
          </button>
        </div>
      </nav>
    </header>
  );
}

function HeroSection() {
  const { openModal } = React.useContext(LeadModalContext);
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
        <p className="hero-kicker">
          <span className="hero-pulse-dot" aria-hidden="true" />
          Ecossistema para crescimento imobiliário
        </p>
        <h1>Onde vendas, operação e tecnologia imobiliária ganham direção<span className="lime-dot">.</span></h1>
        <p className="hero-lead">Mentoria prática, hub operacional e consultoria comercial para transformar esforço comercial em processo, margem e previsibilidade.</p>
        <div className="hero-actions">
          <HomeButton onClick={() => openModal({ origem_cta: 'hero' })} icon="target" iconRight={false}>Mapear minha operação</HomeButton>
          <a className="hero-text-link" href="#como-faz">Ver como funciona <Icon name="arrowDown" size={16} /></a>
        </div>

        <div className="hero-cockpit" aria-label="Operação ativa Imobiturbo">
          <div className="hero-cockpit-chip">
            <span className="chip-icon-box" aria-hidden="true">
              <Icon name="zap" size={16} stroke={2.2} />
            </span>
            <div>
              <strong>IA no WhatsApp</strong>
              <span>Áudio humano em &lt;30s</span>
            </div>
          </div>
          <div className="hero-cockpit-chip">
            <span className="chip-icon-box" aria-hidden="true">
              <Icon name="calendar" size={16} stroke={2.2} />
            </span>
            <div>
              <strong>Visita Agendada</strong>
              <span>Renda R$ 25k+ qualificada</span>
            </div>
          </div>
          <div className="hero-cockpit-chip">
            <span className="chip-icon-box" aria-hidden="true">
              <Icon name="shield" size={16} stroke={2.2} />
            </span>
            <div>
              <strong>Comissão Blindada</strong>
              <span>6% integral garantido</span>
            </div>
          </div>
        </div>
      </div>

      <div className="hero-telemetry-bar" aria-label="Indicadores da Imobiturbo">
        <div className="home-container hero-telemetry-inner">
          <div className="telemetry-item">
            <strong>+5.000</strong>
            <span>corretores acelerados</span>
          </div>
          <div className="telemetry-item">
            <strong>+R$ 150M</strong>
            <span>em VGV transacionado</span>
          </div>
          <div className="telemetry-item">
            <strong>24 estados</strong>
            <span>operações no Brasil</span>
          </div>
          <div className="telemetry-item">
            <strong>98.4%</strong>
            <span>aprovação do método</span>
          </div>
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
  const { openModal } = React.useContext(LeadModalContext);
  const dialogRef = React.useRef(null);
  const pains = [
    'Leads chegando sem\ncritério de qualificação.',
    'Atendimento sem padrão\ne sem tempo de resposta.',
    'Follow-up que para\nna primeira tentativa.',
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
          <HomeButton onClick={() => openModal({ origem_cta: 'problema' })} variant="dark">Identificar o gargalo</HomeButton>
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
            <HomeButton onClick={() => { dialogRef.current?.close(); openModal({ origem_cta: 'problema_dialog' }); }}>Mapear minha operação</HomeButton>
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
  const { openModal } = React.useContext(LeadModalContext);
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
        <div className="mini-community-visual">
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
          <HomeButton onClick={() => openModal({ origem_cta: 'ecossistema' })} variant="dark">Ver o ecossistema em ação</HomeButton>
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

      <div className="home-container ecosystem-apps-wrap">
        <div className="ecosystem-apps-title">Ecossistema de Soluções</div>
        <div className="ecosystem-apps-sub">Tecnologia proprietária e metodologias validadas para cada frente da sua operação comercial.</div>
        <div className="ecosystem-apps-grid">
          {ECOSYSTEM_PRODUCTS.map((prod) => (
            <a
              key={prod.name}
              href="#diagnostico"
              className="ecosystem-app-card"
              onClick={(e) => {
                e.preventDefault();
                openModal({ origem_cta: 'ecossistema_' + prod.name, produto_interesse: prod.name });
              }}
            >
              <img src={prod.logo} alt={prod.name} className="ecosystem-app-logo" />
              <p className="ecosystem-app-desc">{prod.desc}</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function MethodSection() {
  const { openModal } = React.useContext(LeadModalContext);
  return (
    <section className="method-section" id="metodo">
      <img className="method-background" src={HOME_ASSETS.method} alt="Método comercial aplicado da captação ao fechamento." loading="lazy" />
      <div className="method-shade" aria-hidden="true" />
      <div className="home-container method-content">
        <div className="method-copy">
          <h2>Da captação ao fechamento. Método para a rotina real<span className="lime-dot">.</span></h2>
          <p>Um processo claro para priorizar oportunidades, conduzir conversas e avançar decisões.</p>
          <HomeButton onClick={() => openModal({ origem_cta: 'metodo' })}>Conhecer o método</HomeButton>
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
  const { openModal } = React.useContext(LeadModalContext);
  return (
    <section className="proof-section" id="depoimentos">
      <div className="proof-copy">
        <div className="proof-copy-inner">
          <h2>Resultados reais. Conversas reais. Processo que aparece<span className="lime-dot">.</span></h2>
          <p>A prova não vem de promessa genérica. Vem de quem organizou a operação, aplicou o método e começou a avançar.</p>
          <blockquote>“Implementei tudo certinho. Em 4 dias foram 8 leads. Fechei o primeiro apartamento ontem.”</blockquote>
          <HomeButton onClick={() => openModal({ origem_cta: 'depoimentos' })} variant="dark">Quero acelerar minha operação</HomeButton>
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
  const { openModal } = React.useContext(LeadModalContext);
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
          <button
            type="button"
            className="diagnostic-result-cta"
            onClick={() =>
              openModal({
                perfil: result.profile,
                gargalo: result.bottleneck,
                estrutura: result.structure,
                recomendacao: result.recommendation,
                origem_cta: 'diagnostico_quiz',
              })
            }
          >
            <span>Receber plano completo da operação</span>
            <Icon name="arrowRight" size={20} stroke={2.4} />
          </button>
          <p className="diagnostic-time" style={{ marginTop: '10px' }}>
            🔒 Abre o diagnóstico conversacional integrado ao Imobiturbo OS
          </p>
          <button className="diagnostic-reset" type="button" onClick={resetQuiz}>
            Refazer perguntas
          </button>
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

function FaqSection() {
  const [openIndex, setOpenIndex] = React.useState(0);

  const toggleFaq = (idx) => {
    setOpenIndex((current) => (current === idx ? -1 : idx));
  };

  return (
    <section className="home-faq-section" id="faq">
      <div className="home-container">
        <div className="faq-heading">
          <p className="hero-kicker">Tire suas dúvidas</p>
          <h2>Perguntas frequentes sobre a Imobiturbo<span className="lime-dot">.</span></h2>
          <p className="faq-lead">Respostas diretas sobre como o ecossistema, o método e a tecnologia funcionam na prática.</p>
        </div>

        <div className="faq-list">
          {HOME_FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div className={`faq-item ${isOpen ? 'is-open' : ''}`} key={item.question}>
                <button
                  type="button"
                  className="faq-question-btn"
                  onClick={() => toggleFaq(idx)}
                  aria-expanded={isOpen}
                >
                  <span>{item.question}</span>
                  <span className="faq-toggle-icon" aria-hidden="true">
                    {isOpen ? '−' : '+'}
                  </span>
                </button>
                {isOpen && (
                  <div className="faq-answer">
                    <p>{item.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FinalCtaSection() {
  const { openModal } = React.useContext(LeadModalContext);
  return (
    <section className="final-cta">
      <img src={HOME_ASSETS.hero} alt="Operação imobiliária preparada para crescer com direção." loading="lazy" />
      <div className="final-cta-shade" aria-hidden="true" />
      <div className="home-container final-cta-content">
        <h2>A direção que falta pode começar em uma conversa<span className="lime-dot">.</span></h2>
        <p>Mapeie o gargalo, entenda o próximo passo e descubra qual formato faz sentido para a sua operação.</p>
        <HomeButton onClick={() => openModal({ origem_cta: 'final_cta' })} icon="target" iconRight={false}>Mapear minha operação</HomeButton>
        <button
          type="button"
          className="final-testimonials-link final-lead-link"
          onClick={() => openModal({ origem_cta: 'final_cta_secundario' })}
        >
          Falar com especialista <Icon name="arrowRight" size={17} />
        </button>
      </div>
    </section>
  );
}

function HomeFooter() {
  const { openModal } = React.useContext(LeadModalContext);
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
          <a href="#como-faz">Software / OS</a>
          <a href="#como-faz">Comunidade / Club</a>
          <a href="#como-faz">Consultoria</a>
        </div>
        <div className="footer-column">
          <strong>Legal & Suporte</strong>
          <a href="/politica-de-privacidade/">Privacidade</a>
          <a href="/termos-de-servico/">Termos de Serviço</a>
          <a href="/exclusao-de-dados/">Exclusão de Dados</a>
          <a href={HOME_TESTIMONIALS_URL}>Depoimentos</a>
          <button
            type="button"
            className="footer-lead-btn"
            onClick={() => openModal({ origem_cta: 'footer' })}
          >
            Contato comercial
          </button>
        </div>
      </div>
      <div className="home-container footer-bottom">© 2026 Imobiturbo. CNPJ 47.746.249/0001-04 • Rio de Janeiro/RJ • Todos os direitos reservados.</div>
    </footer>
  );
}

function EcosystemPortal() {
  const [modalProduct, setModalProduct] = React.useState(null);
  const [checkEmail, setCheckEmail] = React.useState('');
  const [checkState, setCheckState] = React.useState({ loading: false, result: null, error: null });

  const openGatekeeper = (prod, e) => {
    if (e) e.preventDefault();
    setModalProduct(prod);
    setCheckEmail('');
    setCheckState({ loading: false, result: null, error: null });
  };

  const closeModal = () => {
    setModalProduct(null);
    setCheckState({ loading: false, result: null, error: null });
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!checkEmail || !modalProduct) return;

    setCheckState({ loading: true, result: null, error: null });

    try {
      const res = await fetch('https://api.os.imobiturbo.com.br/rest/v1/rpc/check_user_product_access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1dGgtZ2F0ZWtlZXBlciIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzg4ODMxNDAwLCJleHAiOjIxMDQxODc0MDB9.s1A3R9x7mQ2tL9kP4nB8vX0wY6zC1eD3fG5hJ7kM9aQ'
        },
        body: JSON.stringify({
          p_email: checkEmail.trim().toLowerCase(),
          p_product: modalProduct.slug
        })
      });

      const data = await res.json();
      setCheckState({ loading: false, result: data, error: null });
    } catch (err) {
      setCheckState({ 
        loading: false, 
        result: null, 
        error: 'Erro de conexão com o banco central. Tente novamente em instantes.' 
      });
    }
  };

  const logoDir = 'assets/brand/theme-white';

  const products = [
    {
      name: 'imobiturbo.os',
      slug: 'os',
      desc: 'CRM com IA no seu WhatsApp.',
      badge: 'Entrar →',
      isLive: true,
      url: 'https://os.imobiturbo.com.br',
    },
    {
      name: 'imobiturbo.radar',
      slug: 'radar',
      desc: 'Veja tendências e anúncios em destaque.',
      badge: 'Entrar →',
      isLive: true,
      url: 'https://radar.imobiturbo.com.br',
    },
    {
      name: 'imobiturbo.club',
      slug: 'club',
      desc: 'Aulas e mentorias ao vivo.',
      badge: 'Entrar →',
      isLive: true,
      url: 'https://club.imobiturbo.com.br',
    },
    {
      name: 'imobiturbo.ads',
      slug: 'ads',
      desc: 'Crie anúncios e criativos imobiliários.',
      badge: 'Verificar Acesso 🔒',
      isLive: false,
      url: '#',
    },
    {
      name: 'imobiturbo.sites',
      slug: 'sites',
      desc: 'Crie páginas para vender seus imóveis.',
      badge: 'Verificar Acesso 🔒',
      isLive: false,
      url: '#',
    },
    {
      name: 'imobiturbo.clone',
      slug: 'clone',
      desc: 'Seu clone para apresentações e vídeos.',
      badge: 'Verificar Acesso 🔒',
      isLive: false,
      url: '#',
    },
    {
      name: 'imobiturbo.news',
      slug: 'news',
      desc: 'Acompanhe as notícias do mercado imobiliário.',
      badge: 'Acessar →',
      isLive: true,
      url: 'https://news.imobiturbo.com.br',
    },
  ];

  return (
    <div className="portal-root light-theme">
      {/* Main Container */}
      <main className="portal-main">
        {/* Profile Card */}
        <div className="portal-avatar-wrap">
          <img src="assets/icon-imobiturbo-official.png" alt="Ícone Imobiturbo" className="portal-avatar" />
        </div>

        <h1 className="portal-name"><img src="assets/logo-imobiturbo-black.webp" alt="Imobiturbo" /></h1>
        <div className="portal-role-tag">Aceleração Imobiliária 360º</div>
        <p className="portal-bio">
          Ferramentas para acelerar suas vendas imobiliárias.
        </p>

        {/* Quem sou / Prova real polaroid */}
        <div className="portal-section-tag">sobre nós</div>
        <div className="portal-section-sub">história e resultados</div>

        <div className="portal-polaroids-row">
          <div className="portal-polaroid-card">
            <img 
              src="assets/home-hero-operacao-imobiliaria.webp" 
              alt="VGV Gerado pelos Alunos" 
              className="portal-polaroid-img" 
            />
            <div className="portal-polaroid-metric">500M+</div>
            <div className="portal-polaroid-desc">vgv gerado pelos alunos</div>
          </div>

          <div className="portal-polaroid-card">
            <img 
              src="assets/natan-studio.jpg" 
              alt="Natan Pimentel" 
              className="portal-polaroid-img natan-portrait" 
            />
            <div className="portal-polaroid-metric">Natan Pimentel</div>
            <div className="portal-polaroid-desc">founder &amp; engineer</div>
          </div>

          <div className="portal-polaroid-card">
            <img 
              src="assets/home-consultoria-warroom.webp" 
              alt="Comunidade Imobiturbo" 
              className="portal-polaroid-img" 
            />
            <div className="portal-polaroid-metric">5.000+</div>
            <div className="portal-polaroid-desc">corretores acelerados no mundo</div>
          </div>
        </div>

        {/* Links Estratégicos */}
        <div className="portal-links-stack">
          <a href="https://www.imobiturbo.com.br/vagas/" className="portal-link-btn featured">
            <div className="portal-link-content">
              <span className="portal-link-title">vagas</span>
              <span className="portal-link-subtitle">Entre na comunidade e mentoria.</span>
            </div>
            <span className="portal-link-icon">🎫</span>
          </a>

          <a 
            href="https://wa.me/5521969516183?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20meu%20acesso%20na%20Imobiturbo"
            target="_blank" 
            rel="noopener noreferrer" 
            className="portal-link-btn"
          >
            <div className="portal-link-content">
              <span className="portal-link-title">suporte</span>
              <span className="portal-link-subtitle">Fale com o suporte oficial.</span>
            </div>
            <span className="portal-link-icon">🧑‍💻</span>
          </a>

          <a href="https://club.imobiturbo.com.br" className="portal-link-btn">
            <div className="portal-link-content">
              <span className="portal-link-title">comunidade</span>
              <span className="portal-link-subtitle">Conecte-se com outros membros.</span>
            </div>
            <span className="portal-link-icon">👥</span>
          </a>
        </div>

        {/* Apps da suíte: logo e descrição alinhados à esquerda, ação à direita */}
        <div className="portal-apps-section">
          <div className="portal-apps-heading">apps</div>
          <div className="portal-section-sub">Sua operação imobiliária em um lugar.</div>

          <div className="portal-apps-list">
            {products.map(function(prod) {
              const logoPath = logoDir + '/imobiturbo-' + prod.slug + '.webp';
              const handleClick = function(e) {
                if (!prod.isLive) {
                  openGatekeeper(prod, e);
                }
              };

              return (
                <a 
                  key={prod.slug}
                  href={prod.url}
                  className="portal-app-card"
                  onClick={handleClick}
                  aria-label={`${prod.isLive ? 'Entrar' : 'Verificar acesso'} em ${prod.name}`}
                  target={prod.isLive ? '_blank' : undefined}
                  rel={prod.isLive ? 'noopener noreferrer' : undefined}
                >
                  <div className="portal-app-info">
                    <div className="portal-app-col-logo">
                      <img src={logoPath} alt={prod.name} className="portal-app-logo" />
                    </div>
                    <div className="portal-app-col-text">
                      <p className="portal-app-desc">{prod.desc}</p>
                    </div>
                  </div>
                  <div className="portal-app-col-action">
                    <span className={`portal-app-badge ${prod.isLive ? 'live' : 'locked'}`}>
                      <svg aria-hidden="true" viewBox="0 0 16 16" focusable="false"><path d="m6 3 5 5-5 5" /></svg>
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <footer className="portal-footer">
          <div>CNPJ 47.746.249/0001-04 • Rio de Janeiro/RJ • © 2026</div>
        </footer>
      </main>

      {/* Modal Gatekeeper Universal */}
      {modalProduct && (
        <div className="portal-modal-backdrop" onClick={closeModal}>
          <div className="portal-modal-card" onClick={function(e) { e.stopPropagation(); }}>
            <button type="button" className="portal-modal-close" onClick={closeModal} aria-label="Fechar">✕</button>
            <img 
              src={logoDir + '/imobiturbo-' + modalProduct.slug + '.webp'} 
              alt={modalProduct.name} 
              className="portal-modal-logo" 
            />
            <h2 className="portal-modal-title">Acesso Exclusivo</h2>
            <p className="portal-modal-sub">
              Digite seu e-mail cadastrado na Imobiturbo para validar sua liberação de acesso:
            </p>

            <form onSubmit={handleVerify}>
              <div className="portal-input-group">
                <input 
                  type="email" 
                  className="portal-input" 
                  placeholder="seu-email@exemplo.com.br"
                  value={checkEmail}
                  onChange={function(e) { setCheckEmail(e.target.value); }}
                  required
                />
                <button type="submit" className="portal-btn-primary" disabled={checkState.loading}>
                  {checkState.loading ? 'Verificando no banco central...' : 'Verificar Acesso ➔'}
                </button>
              </div>
            </form>

            {checkState.error && (
              <div className="portal-result-card denied">
                {checkState.error}
              </div>
            )}

            {checkState.result && (
              <div>
                {checkState.result.allowed ? (
                  <div className="portal-result-card allowed">
                    <strong>✅ Acesso Liberado!</strong>
                    <p style={{ margin: '4px 0 0' }}>Seu e-mail está autorizado no banco central para esta ferramenta.</p>
                  </div>
                ) : (
                  <div className="portal-result-card denied">
                    <strong>⚠️ Acesso Não Encontrado</strong>
                    <p style={{ margin: '4px 0 12px' }}>{checkState.result.message || 'Esse e-mail não possui cadastro ativo nesta ferramenta.'}</p>
                    <a href={checkState.result.checkout_url || 'https://www.imobiturbo.com.br/vagas/'} className="portal-btn-checkout">
                      Garantir Minha Vaga na Comunidade 🎫
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function HomePrototypes() {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalData, setModalData] = React.useState({});

  const openModal = React.useCallback((data = {}) => {
    setModalData(data);
    setModalOpen(true);
  }, []);

  const closeModal = React.useCallback(() => {
    setModalOpen(false);
  }, []);

  return (
    <LeadModalContext.Provider value={{ isOpen: modalOpen, openModal, closeModal, modalData }}>
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
          <FaqSection />
          <FinalCtaSection />
        </main>
        <HomeFooter />
        <LeadModal isOpen={modalOpen} onClose={closeModal} initialData={modalData} />
      </div>
    </LeadModalContext.Provider>
  );
}

window.HomePrototypes = HomePrototypes;
window.EcosystemPortal = EcosystemPortal;
