/* eslint-disable */
// Imobiturbo — reusable atoms
// Loaded as text/babel. Components exposed on window for cross-script use.

const { useState } = React;

// ---------- Icon ----------
// Lucide icons inlined as SVG. Stroke 1.75, round caps. Pass `name` from the set below.
const ICON_PATHS = {
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  funnel: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  chevron: '<polyline points="9 18 15 12 9 6"/>',
  arrowUp: '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>',
  arrowDown: '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',
  arrowRight: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/>',
  whatsapp: '<path d="M3 21l1.9-5.7a8.5 8.5 0 1 1 3.8 3.7Z"/><path d="M9 10a3 3 0 0 0 3 3l1.2-1.2a1 1 0 0 1 1-.25l2.3.75a1 1 0 0 1 .7 1V14a2 2 0 0 1-2 2 9 9 0 0 1-9-9 2 2 0 0 1 2-2h.7a1 1 0 0 1 1 .7l.75 2.3a1 1 0 0 1-.25 1L9 10Z"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  trending: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 14l2 2 4-4"/>',
  fileText: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>',
  wallet: '<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v14a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>',
  filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/>',
};

function Icon({ name, size = 20, color = 'currentColor', stroke = 1.75, fill = 'none', style }) {
  const inner = ICON_PATHS[name] || '';
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill={fill}
      stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}

// ---------- Button ----------
function Button({ children, variant = 'primary', size = 'md', icon, iconRight, onClick, fullWidth, disabled, style }) {
  const sizes = {
    sm: { padding: '8px 14px', font: '600 13px Inter', icon: 14 },
    md: { padding: '12px 20px', font: '600 15px Inter', icon: 16 },
    lg: { padding: '16px 28px', font: '700 17px Inter', icon: 18 },
  };
  const variants = {
    primary: { background: '#BFD730', color: '#0A0A0A', border: '0' },
    ghost:   { background: 'transparent', color: '#fff', border: '1.5px solid #2A2A2A' },
    limeGhost:{background: 'transparent', color: '#BFD730', border: '1.5px solid #BFD730' },
    text:    { background: 'transparent', color: '#fff', border: '0' },
    dark:    { background: '#0A0A0A', color: '#fff', border: '1.5px solid #0A0A0A' },
  };
  const s = sizes[size]; const v = variants[variant];
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);
  let bg = v.background, c = v.color, border = v.border, shadow = 'none', tr = 'none';
  if (variant === 'primary' && hover) { bg = '#D2E854'; shadow = '0 8px 32px rgba(191, 215, 48, 0.35)'; }
  if (variant === 'primary' && press) { bg = '#A6BC1F'; tr = 'scale(0.98)'; }
  if (variant === 'ghost' && hover) { border = '1.5px solid #BFD730'; c = '#BFD730'; }
  if (disabled) { bg = '#2A2A2A'; c = '#5C5C5C'; border = '0'; shadow = 'none'; }
  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)} onMouseUp={() => setPress(false)}
      style={{
        ...s, padding: s.padding, font: s.font, background: bg, color: c, border,
        borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        boxShadow: shadow, transform: tr, transition: 'background 200ms var(--ease-out), color 200ms, transform 80ms, box-shadow 240ms',
        width: fullWidth ? '100%' : undefined, letterSpacing: '-0.005em',
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={s.icon} />}
      {children}
      {iconRight && <Icon name={iconRight} size={s.icon} />}
    </button>
  );
}

// ---------- Badge ----------
function Badge({ children, tone = 'neutral', solid = false }) {
  const tones = {
    lime:     { bg: '#BFD730', fg: '#0A0A0A' },
    success:  { bg: '#6FD16F', fg: '#0A0A0A' },
    danger:   { bg: '#FF5A4E', fg: '#fff' },
    warning:  { bg: '#FFB020', fg: '#0A0A0A' },
    info:     { bg: '#6FA8FF', fg: '#0A0A0A' },
    neutral:  { bg: '#1F1F1F', fg: '#fff', border: '1px solid #2A2A2A' },
    ghost:    { bg: 'transparent', fg: '#8A8A8A', border: '1px solid #2A2A2A' },
  };
  const t = tones[tone];
  return (
    <span style={{
      background: t.bg, color: t.fg, border: t.border || 'none',
      padding: '4px 10px', borderRadius: 999, font: '800 13px "Futura LT Cond", "Barlow Condensed", sans-serif',
      letterSpacing: '0px', textTransform: 'uppercase', whiteSpace: 'nowrap',
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>{children}</span>
  );
}

// ---------- KpiTile ----------
function KpiTile({ label, value, suffix, delta, deltaTone = 'up', icon }) {
  const dColor = deltaTone === 'up' ? '#BFD730' : deltaTone === 'down' ? '#FF5A4E' : '#8A8A8A';
  return (
    <div style={{
      flex: 1, background: '#141414', border: '1px solid #2A2A2A',
      borderTop: '4px solid #BFD730', borderRadius: 14, padding: 20,
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ font: '800 13px "Futura LT Cond", "Barlow Condensed", sans-serif', letterSpacing: '0px', textTransform: 'uppercase', color: '#8A8A8A' }}>{label}</div>
        {icon && <Icon name={icon} size={16} color="#BFD730" />}
      </div>
      <div style={{
        fontFamily: 'Futura LT Cond, Barlow Condensed, sans-serif', fontWeight: 800,
        textTransform: 'uppercase', letterSpacing: '-0.01em', lineHeight: 0.92,
        fontSize: 56, color: '#fff', marginTop: 6,
      }}>
        {value}{suffix && <span style={{ fontSize: 28, color: '#8A8A8A' }}>{suffix}</span>}
      </div>
      {delta && (
        <div style={{ font: '500 13px "Futura LT Cond", "Barlow Condensed", sans-serif', color: dColor, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
          {deltaTone === 'up' ? '↗' : deltaTone === 'down' ? '↘' : '·'} {delta}
        </div>
      )}
    </div>
  );
}

// ---------- Card ----------
function Card({ children, style, padding = 20, hover }) {
  const [h, setH] = useState(false);
  return (
    <div
      onMouseEnter={hover ? () => setH(true) : undefined}
      onMouseLeave={hover ? () => setH(false) : undefined}
      style={{
        background: '#141414', border: '1px solid #2A2A2A',
        borderRadius: 14, padding,
        transform: hover && h ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hover && h
          ? '0 12px 40px rgba(0,0,0,0.18)'
          : '0 2px 6px rgba(0,0,0,0.10), 0 8px 24px rgba(0,0,0,0.08)',
        transition: 'transform 200ms var(--ease-out), box-shadow 200ms',
        ...style,
      }}
    >{children}</div>
  );
}

// ---------- Input ----------
function Input({ label, value, onChange, placeholder, icon, error }) {
  const [focus, setFocus] = useState(false);
  const inputValueProps = onChange ? { value: value || '', onChange } : { defaultValue: value || '' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      {label && (
        <label style={{
          font: '800 13px "Futura LT Cond", "Barlow Condensed", sans-serif', textTransform: 'uppercase', letterSpacing: '0px',
          color: error ? '#FF5A4E' : '#8A8A8A',
        }}>{label}</label>
      )}
      <div style={{
        position: 'relative', display: 'flex', alignItems: 'center',
        background: '#141414',
        border: error ? '1px solid #FF5A4E' : focus ? '1.5px solid #BFD730' : '1px solid #2A2A2A',
        borderRadius: 8,
        boxShadow: focus ? '0 0 0 3px rgba(191, 215, 48, 0.45)' : 'none',
        transition: 'border 120ms, box-shadow 120ms',
      }}>
        {icon && <span style={{ paddingLeft: 12, color: '#8A8A8A', display: 'flex' }}><Icon name={icon} size={16} /></span>}
        <input
          {...inputValueProps} placeholder={placeholder}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{
            background: 'transparent', border: 0, outline: 'none', color: '#fff',
            font: '400 15px Inter', padding: '12px 14px', flex: 1, minWidth: 0,
          }}
        />
      </div>
    </div>
  );
}

// ---------- Avatar ----------
function Avatar({ name, size = 36, tone = 'lime' }) {
  const initials = (name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const tones = {
    lime: { bg: '#BFD730', fg: '#0A0A0A' },
    dark: { bg: '#2A2A2A', fg: '#fff' },
    ink:  { bg: '#0A0A0A', fg: '#BFD730' },
  };
  const t = tones[tone];
  return (
    <div style={{
      width: size, height: size, borderRadius: '999px', background: t.bg, color: t.fg,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      font: `700 ${Math.round(size * 0.38)}px Inter`, flexShrink: 0, letterSpacing: '-0.01em',
    }}>{initials}</div>
  );
}

// ---------- Sidebar ----------
function Sidebar({ active = 'home', onNavigate }) {
  const items = [
    { id: 'home', label: 'Início', icon: 'home' },
    { id: 'funnel', label: 'Funil', icon: 'funnel' },
    { id: 'leads', label: 'Leads', icon: 'users' },
    { id: 'imoveis', label: 'Imóveis', icon: 'building' },
    { id: 'agenda', label: 'Agenda', icon: 'calendar' },
    { id: 'time', label: 'Time', icon: 'users' },
  ];
  return (
    <aside style={{
      width: 240, background: '#000', borderRight: '1px solid #1F1F1F',
      display: 'flex', flexDirection: 'column', padding: '20px 14px', gap: 4, flexShrink: 0,
      height: '100%',
    }}>
      <div style={{ padding: '4px 8px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="../../assets/symbol-imobiturbo-black-bg.png" style={{ width: 28, height: 28, borderRadius: 6 }} />
        <span style={{
          font: '800 18px "Futura LT Cond", Barlow Condensed, sans-serif',
          textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#fff',
        }}>imobiturbo</span>
      </div>
      {items.map(it => {
        const isActive = it.id === active;
        return (
          <button key={it.id} onClick={() => onNavigate && onNavigate(it.id)}
            style={{
              background: isActive ? '#1F1F1F' : 'transparent',
              color: isActive ? '#fff' : '#8A8A8A',
              border: 0, padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 10, font: '500 14px Inter',
              textAlign: 'left',
              borderLeft: isActive ? '2px solid #BFD730' : '2px solid transparent',
              transition: 'background 120ms',
            }}>
            <Icon name={it.icon} size={18} color={isActive ? '#BFD730' : '#8A8A8A'} />
            {it.label}
          </button>
        );
      })}
      <div style={{ marginTop: 'auto', borderTop: '1px solid #1F1F1F', paddingTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar name="Marina Costa" size={32} tone="dark" />
        <div style={{ font: '500 12px Inter', color: '#fff', lineHeight: 1.3 }}>
          Marina Costa<br/>
          <span style={{ color: '#5C5C5C' }}>Imobiliária Pinheiros</span>
        </div>
      </div>
    </aside>
  );
}

// ---------- TopNav ----------
function TopNav({ title, breadcrumb, action }) {
  return (
    <header style={{
      height: 72, background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(20px) saturate(180%)',
      borderBottom: '1px solid #1F1F1F', padding: '0 32px',
      display: 'flex', alignItems: 'center', gap: 24, position: 'sticky', top: 0, zIndex: 10,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {breadcrumb && (
          <div style={{ font: '800 13px "Futura LT Cond", "Barlow Condensed", sans-serif', color: '#8A8A8A', display: 'flex', alignItems: 'center', gap: 6 }}>
            {breadcrumb.map((b, i) => (
              <React.Fragment key={i}>
                <span style={{ color: i === breadcrumb.length - 1 ? '#fff' : '#8A8A8A' }}>{b}</span>
                {i < breadcrumb.length - 1 && <span style={{ color: '#BFD730' }}>›</span>}
              </React.Fragment>
            ))}
          </div>
        )}
        <div style={{
          font: '800 22px "Futura LT Cond", Barlow Condensed, sans-serif',
          textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#fff', lineHeight: 1,
        }}>{title}</div>
      </div>
      <div style={{ flex: 1, maxWidth: 420, marginLeft: 16, position: 'relative' }}>
        <Input icon="search" placeholder="Buscar lead, imóvel, código…" />
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button style={{
          background: 'transparent', border: '1px solid #2A2A2A', borderRadius: 8, padding: 8,
          color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', position: 'relative',
        }}>
          <Icon name="bell" size={18} />
          <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, background: '#BFD730', borderRadius: '999px' }}></span>
        </button>
        {action}
      </div>
    </header>
  );
}

Object.assign(window, { Icon, Button, Badge, KpiTile, Card, Input, Avatar, Sidebar, TopNav });
