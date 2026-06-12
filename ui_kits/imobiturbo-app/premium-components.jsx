/* eslint-disable */
// Imobiturbo — premium shared components
// Loaded as text/babel after components.jsx. Components exposed on window.

const premiumText = {
  display: '"Futura LT Cond", "Barlow Condensed", sans-serif',
  body: 'Inter, system-ui, sans-serif',
  mono: '"Futura LT Cond", "Barlow Condensed", sans-serif',
};

const premiumLabelText = {
  fontFamily: premiumText.display,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0px',
  lineHeight: 1,
};

function PremiumCard({ children, style, hover = false, active = false, padding = 24 }) {
  const [isHover, setIsHover] = React.useState(false);
  return (
    <div
      onMouseEnter={hover ? () => setIsHover(true) : undefined}
      onMouseLeave={hover ? () => setIsHover(false) : undefined}
      style={{
        background: 'var(--surface-premium-1)',
        border: active ? '1px solid var(--border-lime-soft)' : '1px solid var(--border-subtle)',
        borderRadius: 18,
        padding,
        boxShadow: active || isHover ? 'var(--shadow-premium-card), var(--glow-lime-soft)' : 'var(--shadow-premium-card)',
        transform: hover && isHover ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'transform var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function PremiumEyebrow({ children, style }) {
  return (
    <div style={{
      fontFamily: premiumText.display,
      fontWeight: 800,
      textTransform: 'uppercase',
      letterSpacing: '0px',
      lineHeight: 1,
      fontSize: 13,
      color: 'var(--it-lime)',
      ...style,
    }}>
      {children}
    </div>
  );
}

function PremiumTitle({ children, size = 'section', style }) {
  const sizes = {
    hero: 'var(--type-landing-display)',
    dashboard: 'var(--type-dashboard-display)',
    section: 'var(--type-section-title)',
    card: 'var(--type-card-title)',
  };
  return (
    <div style={{
      fontFamily: premiumText.display,
      fontWeight: 800,
      textTransform: 'uppercase',
      letterSpacing: '-0.04em',
      lineHeight: 0.88,
      color: '#fff',
      fontSize: sizes[size] || sizes.section,
      ...style,
    }}>
      {children}
    </div>
  );
}

function PremiumMetric({ label, value, suffix, delta, icon = 'trending', compact = false }) {
  return (
    <PremiumCard padding={compact ? 18 : 24} hover style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ ...premiumLabelText, fontSize: 13, color: 'var(--fg-3)' }}>{label}</div>
        <Icon name={icon} size={compact ? 16 : 18} color="var(--it-lime)" />
      </div>
      <div style={{
        marginTop: compact ? 8 : 12,
        fontFamily: premiumText.display,
        fontWeight: 800,
        fontSize: compact ? 42 : 58,
        letterSpacing: '-0.035em',
        lineHeight: 0.92,
        color: '#fff',
        textTransform: 'uppercase',
      }}>
        {value}{suffix && <span style={{ fontSize: compact ? 22 : 28, color: 'var(--fg-3)', marginLeft: 4 }}>{suffix}</span>}
      </div>
      {delta && (
        <div style={{ marginTop: 10, color: 'var(--it-lime)', font: '800 13px "Futura LT Cond", "Barlow Condensed", sans-serif', letterSpacing: '0px', textTransform: 'uppercase', lineHeight: 1 }}>
          {delta}
        </div>
      )}
    </PremiumCard>
  );
}

function PremiumCommandBar({ label, placeholder, buttonLabel, icon = 'search', onSubmit, compact = false }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <div style={{
      width: '100%',
      maxWidth: compact ? 760 : 840,
      background: 'var(--surface-command)',
      border: focused ? '1px solid var(--border-command-active)' : '1px solid var(--border-subtle)',
      borderRadius: compact ? 20 : 24,
      boxShadow: focused ? 'var(--glow-lime-command)' : 'var(--shadow-premium-panel)',
      padding: compact ? 18 : 22,
      display: 'grid',
      gridTemplateColumns: compact ? '1fr auto' : '1fr auto',
      gap: 16,
      alignItems: 'end',
      transition: 'border-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)',
    }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: compact ? 8 : 12, minWidth: 0 }}>
        <span style={{
          fontFamily: premiumText.display,
          fontWeight: 800,
          fontSize: 13,
          color: 'var(--fg-3)',
          letterSpacing: '0px',
          textTransform: 'uppercase',
          lineHeight: 1,
        }}>
          {label}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <Icon name={icon} size={compact ? 18 : 22} color="var(--it-lime)" />
          <input
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            style={{
              width: '100%',
              minWidth: 0,
              background: 'transparent',
              border: 0,
              outline: 0,
              color: '#fff',
              fontFamily: premiumText.display,
              fontWeight: 800,
              fontSize: compact ? 'var(--type-command-input)' : 'var(--type-command-input)',
              letterSpacing: '-0.025em',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}
          />
        </span>
      </label>
      <Button variant="primary" size={compact ? 'md' : 'lg'} iconRight="arrowRight" onClick={onSubmit}>
        {buttonLabel}
      </Button>
    </div>
  );
}

function PremiumActionPill({ icon, label, active = false, onClick }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        border: active || hover ? '1px solid var(--border-lime-soft)' : '1px solid var(--border-subtle)',
        background: active ? 'var(--state-selected-bg)' : 'rgba(255,255,255,0.035)',
        color: active || hover ? '#fff' : 'var(--fg-2)',
        borderRadius: 12,
        minHeight: 52,
        padding: '0 18px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        font: '700 13px Inter',
        cursor: 'pointer',
        transition: 'border-color var(--dur-base) var(--ease-out), color var(--dur-base), background var(--dur-base)',
      }}
    >
      <span style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        background: active ? 'var(--it-lime)' : 'rgba(191,215,48,0.10)',
        color: active ? 'var(--it-ink)' : 'var(--it-lime)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Icon name={icon} size={15} />
      </span>
      {label}
    </button>
  );
}

function ProductMockup() {
  const stages = [
    ['Captação', '48', 0.9],
    ['Qualificação', '31', 0.64],
    ['Visita', '19', 0.42],
    ['Proposta', '11', 0.30],
    ['Fechamento', '6', 0.18],
  ];
  const leads = [
    ['Ana Ribeiro', 'Casa Alto de Pinheiros', 'R$ 3,1M', 'quente'],
    ['Marcos Lima', 'Apto Vila Madalena', 'R$ 1,4M', 'visita'],
    ['Paula Nunes', 'Studio Jardins', 'R$ 720K', 'novo'],
  ];
  return (
    <div style={{
      width: '100%',
      maxWidth: 980,
      margin: '0 auto',
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute',
        inset: '-52px 12%',
        background: 'var(--gradient-lime-aura)',
        filter: 'blur(34px)',
        opacity: 0.9,
        pointerEvents: 'none',
      }} />
      <PremiumCard active padding={0} style={{ position: 'relative', overflow: 'hidden', borderRadius: 24 }}>
        <div style={{ height: 42, borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 18px', background: 'var(--surface-sidebar)' }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--it-lime)' }} />
          <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--it-ink-4)' }} />
          <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--it-ink-4)' }} />
          <span style={{ marginLeft: 14, color: 'var(--fg-3)', font: '800 13px "Futura LT Cond", "Barlow Condensed", sans-serif', letterSpacing: '0px', textTransform: 'uppercase', lineHeight: 1 }}>pipeline.imobiturbo</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: 18, padding: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <PremiumEyebrow>FUNIL ATIVO</PremiumEyebrow>
                <PremiumTitle size="card" style={{ marginTop: 6 }}>R$ 18,4M EM NEGOCIAÇÃO</PremiumTitle>
              </div>
              <Badge tone="lime">30 dias</Badge>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stages.map(([stage, count, weight]) => (
                <div key={stage} style={{ display: 'grid', gridTemplateColumns: '112px 1fr 38px', alignItems: 'center', gap: 12 }}>
                  <div style={{ font: '700 12px Inter', color: '#fff' }}>{stage}</div>
                  <div style={{ height: 28, borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--surface-sidebar)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${weight * 100}%`, background: weight < 0.25 ? 'var(--it-lime)' : 'rgba(191,215,48,0.72)', borderRadius: 8 }} />
                  </div>
                  <div style={{ font: '800 13px "Futura LT Cond", "Barlow Condensed", sans-serif', color: 'var(--fg-2)', letterSpacing: '0px', textTransform: 'uppercase', lineHeight: 1, textAlign: 'right' }}>{count}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <PremiumEyebrow>LEADS RECENTES</PremiumEyebrow>
            {leads.map(([name, property, value, tone]) => (
              <div key={name} style={{
                border: '1px solid var(--border-subtle)',
                background: 'rgba(0,0,0,0.34)',
                borderRadius: 14,
                padding: 14,
                display: 'grid',
                gridTemplateColumns: '36px 1fr',
                gap: 12,
                alignItems: 'center',
              }}>
                <Avatar name={name} size={36} tone={tone === 'quente' ? 'lime' : 'dark'} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                    <div style={{ font: '700 13px Inter', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                    <div style={{ color: 'var(--it-lime)', font: '800 13px "Futura LT Cond", "Barlow Condensed", sans-serif', letterSpacing: '0px', textTransform: 'uppercase', lineHeight: 1 }}>{value}</div>
                  </div>
                  <div style={{ marginTop: 4, font: '500 12px Inter', color: 'var(--fg-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{property}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PremiumCard>
    </div>
  );
}

function PricingCard({ name, price, description, features, highlighted = false, cta }) {
  return (
    <PremiumCard active={highlighted} hover padding={24} style={{ display: 'flex', flexDirection: 'column', minHeight: 560 }}>
      {highlighted && (
        <div style={{
          alignSelf: 'flex-start',
          marginBottom: 16,
          padding: '5px 10px',
          borderRadius: 999,
          background: 'var(--state-selected-bg)',
          border: '1px solid var(--border-lime-soft)',
          color: 'var(--it-lime)',
          font: '800 13px "Futura LT Cond", "Barlow Condensed", sans-serif',
          letterSpacing: '0px',
          textTransform: 'uppercase',
        }}>Mais escolhido</div>
      )}
      <PremiumTitle size="card">{name}</PremiumTitle>
      <p style={{ margin: '12px 0 0', color: 'var(--fg-2)', font: '400 14px Inter', lineHeight: 1.55 }}>{description}</p>
      <div style={{ marginTop: 26, display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontFamily: premiumText.display, fontWeight: 800, fontSize: 'var(--type-pricing-number)', lineHeight: 0.86, letterSpacing: '-0.04em', color: '#fff' }}>{price}</span>
        {price !== 'Sob consulta' && <span style={{ color: 'var(--fg-3)', font: '600 13px Inter' }}>/mês</span>}
      </div>
      <Button variant={highlighted ? 'primary' : 'ghost'} size="md" fullWidth iconRight="arrowRight" style={{ marginTop: 22 }}>{cta}</Button>
      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {features.map((feature) => (
          <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--fg-2)', font: '500 13px Inter' }}>
            <span style={{
              width: 18,
              height: 18,
              borderRadius: 999,
              background: 'rgba(191,215,48,0.14)',
              color: 'var(--it-lime)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon name="check" size={12} />
            </span>
            {feature}
          </div>
        ))}
      </div>
    </PremiumCard>
  );
}

function FAQAccordion({ items }) {
  const [open, setOpen] = React.useState(0);
  return (
    <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((item, index) => {
        const isOpen = open === index;
        return (
          <button
            key={item.q}
            onClick={() => setOpen(isOpen ? -1 : index)}
            style={{
              width: '100%',
              textAlign: 'left',
              background: 'var(--surface-premium-1)',
              color: '#fff',
              border: isOpen ? '1px solid var(--border-lime-soft)' : '1px solid var(--border-subtle)',
              borderRadius: 16,
              padding: '20px 22px',
              cursor: 'pointer',
              boxShadow: isOpen ? 'var(--glow-lime-soft)' : 'none',
              transition: 'border-color var(--dur-base), box-shadow var(--dur-base)',
            }}
          >
            <span style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'center', font: '700 15px Inter' }}>
              {item.q}
              <span style={{ color: isOpen ? 'var(--it-lime)' : 'var(--fg-3)', font: '700 20px Inter' }}>{isOpen ? '×' : '+'}</span>
            </span>
            {isOpen && <span style={{ display: 'block', marginTop: 12, color: 'var(--fg-2)', font: '400 14px Inter', lineHeight: 1.6 }}>{item.a}</span>}
          </button>
        );
      })}
    </div>
  );
}

function PremiumSidebar({ active = 'Início' }) {
  const groups = [
    ['01 OPERAÇÃO', [
      ['Início', 'home'],
      ['Funil', 'funnel'],
      ['Leads', 'users'],
      ['Imóveis', 'building'],
      ['Agenda', 'calendar'],
    ]],
    ['02 ACELERAÇÃO', [
      ['Propostas', 'fileText'],
      ['Follow-up', 'clock'],
      ['Relatórios', 'trending'],
      ['Ajustes', 'settings'],
    ]],
  ];
  return (
    <aside style={{
      width: 268,
      background: 'var(--surface-sidebar)',
      borderRight: '1px solid var(--border-subtle)',
      padding: 18,
      display: 'flex',
      flexDirection: 'column',
      gap: 18,
      minHeight: '100%',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '4px 4px 14px' }}>
        <img src="../../assets/logo-imobiturbo-white.png" alt="Imobiturbo" style={{ width: 150, height: 'auto', display: 'block' }} />
      </div>
      {groups.map(([label, items]) => (
        <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--fg-3)', font: '800 13px "Futura LT Cond", "Barlow Condensed", sans-serif', letterSpacing: '0px' }}>
            <span style={{ color: 'var(--it-lime)' }}>{label.slice(0, 2)}</span>
            <span>{label.slice(3)}</span>
          </div>
          {items.map(([name, icon]) => {
            const isActive = active === name;
            return (
              <button key={name} style={{
                minHeight: 42,
                border: isActive ? '1px solid var(--border-lime-soft)' : '1px solid transparent',
                background: isActive ? 'var(--state-selected-bg)' : 'transparent',
                color: isActive ? '#fff' : 'var(--fg-2)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '0 11px',
                font: '600 14px Inter',
                cursor: 'pointer',
                textAlign: 'left',
              }}>
                <Icon name={icon} size={17} color={isActive ? 'var(--it-lime)' : 'var(--fg-3)'} />
                {name}
              </button>
            );
          })}
        </div>
      ))}
      <div style={{ marginTop: 'auto' }}>
        <PremiumCard padding={14} style={{ borderRadius: 14, background: 'rgba(255,255,255,0.035)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar name="Natan Pimentel" size={36} tone="lime" />
            <div style={{ minWidth: 0 }}>
              <div style={{ font: '700 13px Inter', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Natan Pimentel</div>
              <div style={{ font: '800 13px "Futura LT Cond", "Barlow Condensed", sans-serif', color: 'var(--fg-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Workspace Imobiturbo</div>
            </div>
          </div>
        </PremiumCard>
      </div>
    </aside>
  );
}

function PremiumTopbar({ onOpenLanding }) {
  return (
    <header style={{
      height: 66,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '0 22px',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(0,0,0,0.72)',
      backdropFilter: 'blur(18px) saturate(160%)',
      position: 'sticky',
      top: 0,
      zIndex: 5,
    }}>
      <div style={{ color: 'var(--fg-2)', font: '700 13px Inter' }}>Dashboard</div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Badge tone="neutral">42 créditos</Badge>
        <Button variant="ghost" size="sm" onClick={onOpenLanding}>Landing</Button>
        <button style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          border: '1px solid var(--border-subtle)',
          background: 'rgba(255,255,255,0.035)',
          color: '#fff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}>
          <Icon name="bell" size={17} />
        </button>
        <UserMenu />
      </div>
    </header>
  );
}

function UserMenu() {
  return (
    <button style={{
      border: '1px solid var(--border-subtle)',
      background: 'rgba(255,255,255,0.035)',
      color: '#fff',
      borderRadius: 12,
      padding: '6px 9px 6px 6px',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      cursor: 'pointer',
    }}>
      <Avatar name="Natan Pimentel" size={28} tone="dark" />
      <span style={{ font: '700 12px Inter' }}>NP</span>
      <Icon name="chevron" size={14} color="var(--fg-3)" />
    </button>
  );
}

function RecentCard({ title, status, value, date, progress, icon }) {
  return (
    <PremiumCard hover padding={0} style={{ overflow: 'hidden' }}>
      <div style={{
        height: 132,
        background:
          'radial-gradient(circle at 28% 18%, rgba(191,215,48,0.28), rgba(191,215,48,0.00) 34%), linear-gradient(135deg, var(--bg-2) 0%, var(--surface-sidebar) 100%)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: 16,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
      }}>
        <span style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--it-lime)', color: 'var(--it-ink)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={19} />
        </span>
        <Badge tone={status === 'novo' ? 'lime' : 'neutral'}>{status}</Badge>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ font: '700 15px Inter', color: '#fff', lineHeight: 1.35 }}>{title}</div>
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', gap: 12, color: 'var(--fg-3)', font: '800 13px "Futura LT Cond", "Barlow Condensed", sans-serif', letterSpacing: '0px', textTransform: 'uppercase', lineHeight: 1 }}>
          <span>{date}</span>
          <span style={{ color: 'var(--it-lime)' }}>{value}</span>
        </div>
        <div style={{ marginTop: 14, height: 6, borderRadius: 999, background: 'var(--surface-sidebar)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'var(--it-lime)', borderRadius: 999 }} />
        </div>
      </div>
    </PremiumCard>
  );
}

function DashboardPanel({ title, label, children, action }) {
  return (
    <PremiumCard padding={22}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <PremiumEyebrow>{label}</PremiumEyebrow>
          <PremiumTitle size="card" style={{ marginTop: 6 }}>{title}</PremiumTitle>
        </div>
        {action}
      </div>
      {children}
    </PremiumCard>
  );
}

function EmptyState({ title, body, actionLabel }) {
  return (
    <div style={{
      border: '1px solid var(--state-empty-border)',
      borderRadius: 16,
      padding: 24,
      minHeight: 160,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      justifyContent: 'center',
      background: 'rgba(255,255,255,0.025)',
    }}>
      <PremiumTitle size="card">{title}</PremiumTitle>
      <p style={{ margin: '10px 0 18px', color: 'var(--fg-2)', font: '400 14px Inter', lineHeight: 1.55 }}>{body}</p>
      <Button variant="ghost" size="sm" icon="plus">{actionLabel}</Button>
    </div>
  );
}

Object.assign(window, {
  PremiumCard,
  PremiumEyebrow,
  PremiumTitle,
  PremiumMetric,
  PremiumCommandBar,
  PremiumActionPill,
  ProductMockup,
  PricingCard,
  FAQAccordion,
  PremiumSidebar,
  PremiumTopbar,
  UserMenu,
  RecentCard,
  DashboardPanel,
  EmptyState,
});
