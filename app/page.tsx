'use client';
import { BoltIcon, BuildingStorefrontIcon, CameraIcon, ChatBubbleLeftRightIcon, ClipboardDocumentListIcon, EnvelopeOpenIcon, ExclamationTriangleIcon, FireIcon, HeartIcon, MapPinIcon, ShoppingCartIcon, SparklesIcon, StarIcon } from '@heroicons/react/24/outline';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// MODO palette
const C = {
  green: '#1F3D2E',
  greenDark: '#142820',
  lime: '#A8C63A',
  cream: '#E7E1D6',
  orange: '#F07A27',
  black: '#1A1A1A',
};

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.15 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.8s cubic-bezier(.16,1,.3,1) ${delay}ms, transform 0.8s cubic-bezier(.16,1,.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Line icons (stroke-based, currentColor)
// ---------------------------------------------------------------------------

const iconProps = { width: 28, height: 28, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

function IconLeaf() {
  return (
    <svg {...iconProps}>
      <path d="M5 19c8-1 14-6 14-14-8 1-14 6-14 14Z" />
      <path d="M5 19c2-4 5-7 9-9" />
    </svg>
  );
}
function IconDumbbell() {
  return (
    <svg {...iconProps}>
      <rect x="2.5" y="9" width="3" height="6" rx="1" />
      <rect x="18.5" y="9" width="3" height="6" rx="1" />
      <rect x="6" y="7" width="2.5" height="10" rx="1" />
      <rect x="15.5" y="7" width="2.5" height="10" rx="1" />
      <path d="M8.5 12h7" />
    </svg>
  );
}
function IconScale() {
  return (
    <svg {...iconProps}>
      <path d="M12 3v18" />
      <path d="M5 7h14" />
      <path d="M5 7l-2.5 5a2.5 2.5 0 0 0 5 0L5 7Z" />
      <path d="M19 7l-2.5 5a2.5 2.5 0 0 0 5 0L19 7Z" />
      <path d="M8 21h8" />
    </svg>
  );
}
function IconSmile() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14c1 1.5 2.5 2.3 4 2.3s3-.8 4-2.3" />
      <circle cx="9" cy="9.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="15" cy="9.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconPerson() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1-3.5 4-5.5 7.5-5.5s6.5 2 7.5 5.5" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function IconDroplet() {
  return (
    <svg {...iconProps}>
      <path d="M12 3c4 5 6.5 8.3 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 11.3 8 8 12 3Z" />
    </svg>
  );
}
function IconSliders() {
  return (
    <svg {...iconProps}>
      <path d="M4 6h10M17 6h3" />
      <path d="M4 12h3M10 12h10" />
      <path d="M4 18h10M17 18h3" />
      <circle cx="17" cy="6" r="2" fill="currentColor" stroke="none" />
      <circle cx="7" cy="12" r="2" fill="currentColor" stroke="none" />
      <circle cx="14" cy="18" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconStar() {
  return (
    <svg {...iconProps}>
      <path d="M12 3.5l2.6 5.3 5.9.8-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.6l5.9-.8L12 3.5Z" />
    </svg>
  );
}
function IconTag() {
  return (
    <svg {...iconProps}>
      <path d="M11.5 3.5 20 12l-7 7-8.5-8.5V3.5h7.5Z" />
      <circle cx="8" cy="7" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconHistory() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
      <path d="M3.5 9A9 9 0 0 1 12 3" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg {...iconProps}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}
function IconPin() {
  return (
    <svg {...iconProps}>
      <path d="M12 21c4.5-4.2 7-7.8 7-11a7 7 0 0 0-14 0c0 3.2 2.5 6.8 7 11Z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  );
}
function IconPhone() {
  return (
    <svg {...iconProps}>
      <path d="M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 5.5 5.5L15 13l4 1.5V18a2 2 0 0 1-2 2C10 20 4 14 4 7a2 2 0 0 1 1-2Z" />
    </svg>
  );
}
function IconBike() {
  return (
    <svg {...iconProps}>
      <circle cx="6" cy="17" r="3" />
      <circle cx="18" cy="17" r="3" />
      <path d="M6 17 10 9h4l4 8M10 9l1.5 4h4M8 5h2l1 3" />
    </svg>
  );
}
function IconUtensils() {
  return (
    <svg {...iconProps}>
      <path d="M6 2v7a2 2 0 0 0 2 2v11M6 2v9M9 2v9" />
      <path d="M16 2c-1.4 1.6-2 3.4-2 5.5 0 1.8.9 3 2 3.3V22" />
    </svg>
  );
}
function IconParking() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M9 16V8h3.4a2.6 2.6 0 0 1 0 5.2H9" />
    </svg>
  );
}
function IconWheelchair() {
  return (
    <svg {...iconProps}>
      <circle cx="10" cy="4.5" r="1.6" fill="currentColor" stroke="none" />
      <path d="M10 7.5v4.5h4.5l3 6M10 12H6.5" />
      <circle cx="11" cy="17" r="4.5" />
    </svg>
  );
}
function IconInstagram() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconChat() {
  return (
    <svg {...iconProps}>
      <path d="M4 12a8 8 0 1 1 3.2 6.4L4 19l1-3.4A8 8 0 0 1 4 12Z" />
    </svg>
  );
}
function IconNavigation() {
  return (
    <svg {...iconProps}>
      <path d="M3 11 21 3 13 21 11 13 3 11Z" />
    </svg>
  );
}

// Filled ingredient glyphs (white, for photo tiles)
function GlyphAvocado() {
  return (
    <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1">
      <ellipse cx="12" cy="13" rx="6.5" ry="8" />
      <ellipse cx="12" cy="13" rx="3" ry="4" fill="#fff" stroke="none" />
      <circle cx="12" cy="13" r="1.4" fill="#1A1A1A" stroke="none" />
    </svg>
  );
}
function GlyphChicken() {
  return (
    <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1">
      <path d="M8 4c4-1 8 1 9 5 1 5-2 9-6 10-3 .7-5-1-5-3 0-2 2-2 3-3.5C10.5 11 7 9 6 6c-.5-1.2.4-1.7 2-2Z" />
    </svg>
  );
}
function GlyphQuinoa() {
  return (
    <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1">
      <ellipse cx="8" cy="9" rx="2.4" ry="1.7" />
      <ellipse cx="14" cy="7" rx="2.4" ry="1.7" />
      <ellipse cx="17" cy="13" rx="2.4" ry="1.7" />
      <ellipse cx="10" cy="15" rx="2.4" ry="1.7" />
      <ellipse cx="6" cy="16" rx="2.4" ry="1.7" />
    </svg>
  );
}
function GlyphKale() {
  return (
    <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1">
      <path d="M12 21V9" />
      <path d="M12 9c0-4 3-6 7-6-1 4-3 6-7 6Z" />
      <path d="M12 13c0-4-3-6-7-6 1 4 3 6 7 6Z" />
    </svg>
  );
}
function GlyphTomato() {
  return (
    <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1">
      <circle cx="9" cy="13" r="5" />
      <circle cx="17" cy="15" r="3.5" />
      <path d="M9 8c1-2 3-2.5 4-1M16 12c.7-1.4 2-1.8 2.8-1" />
    </svg>
  );
}
function GlyphEdamame() {
  return (
    <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1">
      <path d="M7 3c-2 4-2 9 0 13s6 4 9 3c-1-3-3-4-5-4" />
      <circle cx="9" cy="8" r="1.6" fill="#fff" stroke="none" />
      <circle cx="10.5" cy="13" r="1.6" fill="#fff" stroke="none" />
      <circle cx="13" cy="17.5" r="1.6" fill="#fff" stroke="none" />
    </svg>
  );
}
function GlyphRice() {
  return (
    <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1">
      <ellipse cx="12" cy="9" rx="9" ry="3" />
      <path d="M3 9v5c0 1.7 4 3 9 3s9-1.3 9-3V9" />
      <path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3" />
    </svg>
  );
}
function GlyphCheese() {
  return (
    <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1">
      <path d="M3 10 12 4l9 6-1.5 9h-15Z" />
      <circle cx="9" cy="13" r="1" fill="#fff" stroke="none" />
      <circle cx="14" cy="15" r="1" fill="#fff" stroke="none" />
      <circle cx="12" cy="10.5" r="1" fill="#fff" stroke="none" />
    </svg>
  );
}
function GlyphChili() {
  return (
    <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1">
      <path d="M9 5c1-1.5 2.5-2 4-1.5" />
      <path d="M8 6c-3 2-4 6-2.5 9.5C7 18.5 11 19 14 16c2.5-2.5 3-7 1-10-1-1.4-2.7-1-3.5.3C10.5 8 8.5 9 6.5 8.5" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Shared blocks
// ---------------------------------------------------------------------------

function PhotoBlock({ gradient, style, children, onClick }: { gradient: string; style?: React.CSSProperties; children?: React.ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{ position: 'relative', overflow: 'hidden', borderRadius: 20, background: gradient, cursor: onClick ? 'zoom-in' : undefined, ...style }}
    >
      {children}
    </div>
  );
}

// Extracts the first url(...) reference from a CSS background/gradient string
function extractPhotoUrl(gradient: string): string | null {
  const m = gradient.match(/url\(['"]?([^'")]+)['"]?\)/);
  return m ? m[1] : null;
}

function ModoCard({ icon, title, desc, accent, delay }: { icon: React.ReactNode; title: string; desc: string; accent?: boolean; delay: number }) {
  return (
    <Reveal delay={delay}>
      <div
        className="modo-card"
        style={{
          background: '#fff',
          border: '1px solid rgba(26,26,26,0.08)',
          borderRadius: 18,
          padding: '36px 22px',
          textAlign: 'center',
          height: '100%',
        }}
      >
        <div style={{ color: accent ? C.orange : C.green, marginBottom: 18, display: 'flex', justifyContent: 'center' }}>{icon}</div>
        <h3 style={{ fontSize: 17, fontWeight: 800, letterSpacing: '0.03em', color: accent ? C.orange : C.black, marginBottom: 8 }}>{title}</h3>
        <p style={{ fontSize: 14, color: 'rgba(26,26,26,0.55)', lineHeight: 1.5, margin: 0 }}>{desc}</p>
      </div>
    </Reveal>
  );
}

function WhyBlock({ icon, title, desc, delay }: { icon: React.ReactNode; title: string; desc: string; delay: number }) {
  return (
    <Reveal delay={delay}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: C.green, marginBottom: 16, display: 'flex', justifyContent: 'center' }}>{icon}</div>
        <h4 style={{ fontSize: 15, fontWeight: 800, letterSpacing: '0.05em', color: C.black, marginBottom: 6, textTransform: 'uppercase' }}>{title}</h4>
        <p style={{ fontSize: 14, color: 'rgba(26,26,26,0.55)', lineHeight: 1.5, margin: 0 }}>{desc}</p>
      </div>
    </Reveal>
  );
}

function IngredientPhoto({ name, gradient, icon, delay, onClick }: { name: string; gradient: string; icon: React.ReactNode; delay: number; onClick?: () => void }) {
  return (
    <Reveal delay={delay}>
      <div>
        <PhotoBlock gradient={gradient} onClick={onClick} style={{ aspectRatio: '1 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </PhotoBlock>
        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 13, fontWeight: 800, letterSpacing: '0.12em', color: C.black }}>{name}</div>
      </div>
    </Reveal>
  );
}

function TestimonialCard({ text, name, delay }: { text: string; name: string; delay: number }) {
  return (
    <Reveal delay={delay}>
      <div style={{ background: '#fff', borderRadius: 18, padding: '32px 28px', height: '100%' }}>
        <div style={{ color: C.orange, fontSize: 16, letterSpacing: '0.15em', marginBottom: 16 }}>★★★★★</div>
        <p style={{ fontSize: 17, color: C.black, lineHeight: 1.5, fontWeight: 500, marginBottom: 18 }}>&ldquo;{text}&rdquo;</p>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.green }}>— {name}</div>
      </div>
    </Reveal>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: 250, height: 510, borderRadius: 36, background: '#1A1A1A', padding: 10,
      boxShadow: '0 30px 60px rgba(0,0,0,0.25)', flexShrink: 0,
    }}>
      <div style={{ width: '100%', height: '100%', borderRadius: 28, overflow: 'hidden', position: 'relative', background: '#fff' }}>
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 110, height: 24, background: '#1A1A1A', borderRadius: '0 0 16px 16px', zIndex: 5 }} />
        {children}
      </div>
    </div>
  );
}

const MENU_DETAILS: Record<string, { kcal: number; allergens: string[] }> = {
  'Bowl Fresh Greens': { kcal: 410, allergens: ['Gluten', 'Soya'] },
  'Bowl Power Protein': { kcal: 540, allergens: ['Pescado', 'Sésamo'] },
  'Bowl Tex-Mex': { kcal: 590, allergens: ['Gluten', 'Lácteos'] },
  'Burrito Clásico': { kcal: 620, allergens: ['Gluten', 'Lácteos'] },
  'Burrito Veggie': { kcal: 480, allergens: ['Gluten'] },
  'Burrito Pollo Picante': { kcal: 580, allergens: ['Gluten', 'Lácteos'] },
  'Wrap Mediterráneo': { kcal: 390, allergens: ['Gluten', 'Sésamo'] },
  'Ensalada Power': { kcal: 360, allergens: ['Frutos secos'] },
  'Limonada de coco': { kcal: 95, allergens: [] },
  'Smoothie verde': { kcal: 130, allergens: [] },
};

function MenuItemCard({ name, desc, price, gradient, delay, onPhotoClick, popular, badge }: { name: string; desc: string; price: string; gradient: string; delay: number; onPhotoClick?: () => void; popular?: boolean; badge?: string }) {
  const [expanded, setExpanded] = useState(false);
  const details = MENU_DETAILS[name];
  return (
    <Reveal delay={delay}>
      <div className="menu-card" style={{ background: '#fff', border: popular ? `2px solid ${C.lime}` : '1px solid rgba(26,26,26,0.08)', borderRadius: 18, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'relative' }}>
          <PhotoBlock gradient={gradient} onClick={onPhotoClick} style={{ aspectRatio: '4 / 3', borderRadius: 0 }} />
          {popular && (
            <div style={{ position: 'absolute', top: 12, left: 12, background: C.lime, color: C.greenDark, fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', padding: '5px 12px', borderRadius: 999 }}>
              <FireIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> MÁS POPULAR
            </div>
          )}
          {badge && !popular && (
            <div style={{ position: 'absolute', top: 12, left: 12, background: C.green, color: '#fff', fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', padding: '5px 12px', borderRadius: 999 }}>
              {badge}
            </div>
          )}
        </div>
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
            <h4 style={{ fontSize: 16, fontWeight: 800, color: C.black, margin: 0 }}>{name}</h4>
            <span style={{ fontSize: 15, fontWeight: 900, color: C.green, whiteSpace: 'nowrap' }}>{price}</span>
          </div>
          <p style={{ fontSize: 13.5, color: 'rgba(26,26,26,0.55)', lineHeight: 1.5, margin: 0, flex: 1 }}>{desc}</p>
          {details && (
            <div style={{ overflow: 'hidden', maxHeight: expanded ? 80 : 0, transition: 'max-height 0.35s cubic-bezier(.16,1,.3,1)', marginTop: expanded ? 12 : 0 }}>
              <div style={{ display: 'flex', gap: 16, padding: '10px 14px', background: 'rgba(31,61,46,0.05)', borderRadius: 10 }}>
                <div style={{ fontSize: 12, color: C.green }}>
                  <span style={{ fontWeight: 800 }}>{details.kcal}</span> <span style={{ opacity: 0.7 }}>kcal</span>
                </div>
                {details.allergens.length > 0 && (
                  <div style={{ fontSize: 12, color: 'rgba(26,26,26,0.5)' }}>
                    <ExclamationTriangleIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> {details.allergens.join(', ')}
                  </div>
                )}
              </div>
            </div>
          )}
          <button onClick={() => setExpanded(v => !v)} style={{ marginTop: 10, background: 'none', border: 'none', color: 'rgba(26,26,26,0.4)', fontSize: 12, fontWeight: 700, cursor: 'pointer', textAlign: 'left', padding: 0, letterSpacing: '0.04em' }}>
            {expanded ? '▲ Menos info' : '▼ Ver calorías y alérgenos'}
          </button>
          <button className="menu-order-btn" style={{ marginTop: 12, width: '100%', padding: '11px 0', borderRadius: 999, border: `1.5px solid ${C.green}`, background: 'transparent', color: C.green, fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', cursor: 'pointer', transition: 'all 0.2s ease' }}>
            AGREGAR AL PEDIDO →
          </button>
        </div>
      </div>
    </Reveal>
  );
}

function StatBlock({ value, label, delay }: { value: string; label: string; delay: number }) {
  const { ref, visible } = useReveal();
  const match = value.match(/^([^\d]*)([\d.]+)(.*)$/);
  const decimals = match && match[2].includes('.') ? match[2].split('.')[1].length : 0;
  const [display, setDisplay] = useState(() => (0).toFixed(decimals));

  useEffect(() => {
    if (!visible || !match) return;
    const target = parseFloat(match[2]);
    const duration = 1400;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay((target * eased).toFixed(decimals));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const shown = match ? `${match[1]}${display}${match[3]}` : value;

  return (
    <div
      ref={ref}
      style={{
        textAlign: 'center',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.8s cubic-bezier(.16,1,.3,1) ${delay}ms, transform 0.8s cubic-bezier(.16,1,.3,1) ${delay}ms`,
      }}
    >
      <div style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 900, color: C.lime, fontVariantNumeric: 'tabular-nums' }}>{shown}</div>
      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.7)', marginTop: 8, textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}

function LocationCard({ city, address, hours, phone, rating, gradient, delay, waitTime, tags, instagram, whatsapp, highlighted, openHour = 8, closeHour = 22, onPhotoClick, onOrderClick }: { city: string; address: string; hours: string; phone: string; rating: number; gradient: string; delay: number; waitTime?: string; tags?: string[]; instagram?: string; whatsapp?: string; highlighted?: boolean; openHour?: number; closeHour?: number; onPhotoClick?: () => void; onOrderClick?: () => void }) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, ${city}, Colombia`)}`;
  const open = isOpenNow(openHour, closeHour);
  return (
    <Reveal delay={delay}>
      <div
        className="location-card"
        style={{
          background: '#fff',
          border: highlighted ? `2px solid ${C.lime}` : '1px solid rgba(26,26,26,0.08)',
          boxShadow: highlighted ? '0 12px 32px rgba(166,212,55,0.35)' : undefined,
          borderRadius: 18,
          overflow: 'hidden',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <PhotoBlock gradient={gradient} onClick={onPhotoClick} style={{ aspectRatio: '16 / 9', borderRadius: 0 }}>
          <div style={{ position: 'absolute', top: 14, left: 14, right: 14, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ background: open ? 'rgba(255,255,255,0.95)' : 'rgba(26,26,26,0.7)', borderRadius: 999, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: open ? C.green : 'rgba(255,255,255,0.85)' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: open ? '#3CB371' : '#e05252', display: 'inline-block', animation: open ? 'pulse 1.6s infinite' : 'none' }} />
              {open ? 'ABIERTO AHORA' : 'CERRADO'}
            </div>
            {waitTime && (
              <div style={{ background: 'rgba(26,26,26,0.55)', borderRadius: 999, padding: '6px 14px', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', color: '#fff', whiteSpace: 'nowrap' }}>
                ⏱ {waitTime}
              </div>
            )}
          </div>
          {highlighted && (
            <div style={{ position: 'absolute', top: 50, left: 14, background: C.lime, borderRadius: 999, padding: '5px 12px', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: C.greenDark }}>
              MÁS CERCANO A TI
            </div>
          )}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '40px 18px 14px', background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.6))' }}>
            <h4 style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: 0 }}>{city}</h4>
          </div>
        </PhotoBlock>
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ color: C.orange, fontSize: 13, letterSpacing: '0.12em', marginBottom: 14 }}>
            ★★★★★ <span style={{ color: 'rgba(26,26,26,0.45)', fontWeight: 700, letterSpacing: 'normal' }}>{rating.toFixed(1)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
            <span style={{ color: C.green, flexShrink: 0, marginTop: 1 }}><IconPin /></span>
            <p style={{ fontSize: 14, color: 'rgba(26,26,26,0.6)', lineHeight: 1.5, margin: 0 }}>{address}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ color: C.green, flexShrink: 0 }}><IconClock /></span>
            <p style={{ fontSize: 13, color: 'rgba(26,26,26,0.5)', margin: 0 }}>{hours}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ color: C.green, flexShrink: 0 }}><IconPhone /></span>
            <p style={{ fontSize: 13, color: 'rgba(26,26,26,0.5)', margin: 0 }}>{phone}</p>
          </div>
          {tags && tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
              {tags.map((tag) => (
                <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(31,61,46,0.06)', borderRadius: 999, padding: '5px 11px', fontSize: 11.5, fontWeight: 700, color: C.green }}>
                  <span style={{ display: 'flex', width: 14, height: 14 }}>{LOCATION_TAG_ICONS[tag]}</span>
                  {tag}
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 'auto' }}>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 800, letterSpacing: '0.06em', color: C.green, textDecoration: 'none' }}
            >
              CÓMO LLEGAR →
            </a>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {instagram && (
                <a href={`https://instagram.com/${instagram}`} target="_blank" rel="noopener noreferrer" aria-label={`Instagram MODO ${city}`} style={{ color: C.green, display: 'flex' }}>
                  <span style={{ width: 18, height: 18, display: 'flex' }}><IconInstagram /></span>
                </a>
              )}
              {whatsapp && (
                <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp MODO ${city}`} style={{ color: C.green, display: 'flex' }}>
                  <span style={{ width: 18, height: 18, display: 'flex' }}><IconChat /></span>
                </a>
              )}
            </div>
          </div>
          <button
            onClick={onOrderClick}
            style={{ marginTop: 14, textAlign: 'center', background: C.green, color: '#fff', fontWeight: 800, fontSize: 12.5, letterSpacing: '0.08em', padding: '12px 0', borderRadius: 999, border: 'none', cursor: 'pointer' }}
          >
            PEDIR EN ESTE LOCAL →
          </button>
        </div>
      </div>
    </Reveal>
  );
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const MODOS = [
  { icon: <IconLeaf />, title: 'MODO FRESH', desc: 'Ligero, fresco y lleno de color.' },
  { icon: <IconDumbbell />, title: 'MODO PROTEÍNA', desc: 'Más proteína. Más resultados.' },
  { icon: <IconScale />, title: 'MODO BALANCE', desc: 'El equilibrio perfecto.' },
  { icon: <IconSmile />, title: 'MODO CHEAT', desc: 'Disfrutar también es parte del plan.', accent: true },
  { icon: <IconPerson />, title: 'CREA TU MODO', desc: 'Diseñado por ti.' },
];

const BOWL_STEPS = [
  {
    n: '01', label: 'Escoge tu base', options: [
      { name: 'Arroz integral', kcal: 215, protein: 5, emoji: '', price: 5000 },
      { name: 'Quinoa', kcal: 222, protein: 8, emoji: '', price: 7000 },
      { name: 'Mix de hojas verdes', kcal: 15, protein: 1, emoji: '', price: 4000 },
      { name: 'Fideos de calabacín', kcal: 20, protein: 1, emoji: '', price: 6000 },
    ],
  },
  {
    n: '02', label: 'Escoge tu proteína', options: [
      { name: 'Pollo a la plancha', kcal: 165, protein: 31, emoji: '', price: 8000 },
      { name: 'Carne de res', kcal: 250, protein: 26, emoji: '', price: 10000 },
      { name: 'Salmón', kcal: 208, protein: 20, emoji: '', price: 12000 },
      { name: 'Tofu marinado', kcal: 144, protein: 15, emoji: '🫘', price: 7000 },
      { name: 'Garbanzos', kcal: 164, protein: 9, emoji: '🫛', price: 6000 },
    ],
  },
  {
    n: '03', label: 'Vegetales frescos', options: [
      { name: 'Aguacate', kcal: 160, protein: 2, emoji: '', price: 4000 },
      { name: 'Tomate cherry', kcal: 18, protein: 1, emoji: '', price: 2000 },
      { name: 'Kale', kcal: 33, protein: 3, emoji: '', price: 2000 },
      { name: 'Edamame', kcal: 121, protein: 11, emoji: '🫛', price: 3000 },
      { name: 'Pico de gallo', kcal: 20, protein: 1, emoji: '', price: 2000 },
      { name: 'Maíz', kcal: 96, protein: 3, emoji: '', price: 2000 },
    ],
  },
  {
    n: '04', label: 'Salsas y toppings', options: [
      { name: 'Tahini', kcal: 89, protein: 3, emoji: '', price: 2000 },
      { name: 'Chipotle', kcal: 35, protein: 0, emoji: '', price: 1000 },
      { name: 'Vinagreta cítrica', kcal: 45, protein: 0, emoji: '', price: 1000 },
      { name: 'Queso feta', kcal: 75, protein: 4, emoji: '', price: 3000 },
      { name: 'Semillas tostadas', kcal: 52, protein: 2, emoji: '', price: 2000 },
    ],
  },
];

const MENU = [
  {
    category: 'BOWLS',
    items: [
      { name: 'Bowl Fresh Greens', desc: 'Mix verde, pollo a la plancha, aguacate, edamame y vinagreta cítrica.', price: '$28.000', popular: true },
      { name: 'Bowl Power Protein', desc: 'Quinoa, salmón, kale, tomate cherry y salsa tahini.', price: '$32.000', badge: 'NUEVO' },
      { name: 'Bowl Tex-Mex', desc: 'Arroz, carne de res, frijoles negros, pico de gallo y guacamole.', price: '$30.000' },
    ],
  },
  {
    category: 'BURRITOS',
    items: [
      { name: 'Burrito Clásico', desc: 'Arroz, frijoles, carne de res, queso fundido y pico de gallo.', price: '$26.000', popular: true },
      { name: 'Burrito Veggie', desc: 'Arroz, frijoles negros, guacamole y vegetales asados.', price: '$24.000' },
      { name: 'Burrito Pollo Picante', desc: 'Pollo al chipotle, arroz, maíz y salsa habanero.', price: '$27.000', badge: ' PICANTE' },
    ],
  },
  {
    category: 'WRAPS & ENSALADAS',
    items: [
      { name: 'Wrap Mediterráneo', desc: 'Hummus, falafel, tomate, pepino y salsa de yogurt.', price: '$22.000' },
      { name: 'Ensalada Power', desc: 'Mix verde, pollo, quinoa, aguacate y semillas tostadas.', price: '$25.000' },
    ],
  },
  {
    category: 'BEBIDAS',
    items: [
      { name: 'Limonada de coco', desc: 'Limón fresco, agua de coco y hierbabuena.', price: '$8.000' },
      { name: 'Smoothie verde', desc: 'Espinaca, manzana, jengibre y piña.', price: '$10.000' },
    ],
  },
];

const MENU_GRADIENTS = [
  `url('/images/bowl.jpg') center/cover no-repeat`,
  `url('/images/burrito-1.jpg') center/cover no-repeat`,
  `url('/images/tacos.jpg') center/cover no-repeat`,
  `url('/images/burrito-2.jpg') center/cover no-repeat`,
  `url('/images/ing-pollo.jpg') center/cover no-repeat`,
  `url('/images/ing-aguacate.jpg') center/cover no-repeat`,
];

const STATS = [
  { value: '+40', label: 'Locales en el país' },
  { value: '+2M', label: 'Bowls servidos' },
  { value: '100%', label: 'Ingredientes frescos' },
  { value: '4.9★', label: 'Calificación promedio' },
];

function isOpenNow(openHour: number, closeHour: number) {
  // Colombia time = UTC-5
  const now = new Date();
  const colombiaHour = (now.getUTCHours() - 5 + 24) % 24;
  return colombiaHour >= openHour && colombiaHour < closeHour;
}

const LOCATIONS = [
  {
    city: 'Bogotá', address: 'Cra. 13 #85-32, Zona G', hours: 'Lun - Dom · 8:00 - 22:00', phone: '+57 1 555 0101', rating: 4.9,
    gradient: `url('/images/burrito-1.jpg') center/cover no-repeat`,
    lat: 4.6668, lng: -74.0539, waitTime: '~8 min', tags: ['Domicilio', 'Mesas', 'Parqueadero'],
    instagram: 'modo.bogota', whatsapp: '5715550101', openHour: 8, closeHour: 22,
  },
  {
    city: 'Medellín', address: 'Cl. 10 #38-15, El Poblado', hours: 'Lun - Dom · 8:00 - 22:00', phone: '+57 4 555 0102', rating: 4.8,
    gradient: `url('/images/tacos.jpg') center/cover no-repeat`,
    lat: 6.2086, lng: -75.5659, waitTime: '~10 min', tags: ['Domicilio', 'Mesas', 'Accesible'],
    instagram: 'modo.medellin', whatsapp: '5745550102', openHour: 8, closeHour: 22,
  },
  {
    city: 'Cali', address: 'Av. 9N #14-50, Granada', hours: 'Lun - Dom · 9:00 - 21:00', phone: '+57 2 555 0103', rating: 4.9,
    gradient: `url('/images/bowl.jpg') center/cover no-repeat`,
    lat: 3.4698, lng: -76.5320, waitTime: '~12 min', tags: ['Domicilio', 'Parqueadero'],
    instagram: 'modo.cali', whatsapp: '5725550103', openHour: 9, closeHour: 21,
  },
  {
    city: 'Cartagena', address: 'Cl. 25 #8-129, Bocagrande', hours: 'Lun - Dom · 9:00 - 22:00', phone: '+57 5 555 0104', rating: 5.0,
    gradient: `url('/images/burrito-2.jpg') center/cover no-repeat`,
    lat: 10.3997, lng: -75.5547, waitTime: '~9 min', tags: ['Domicilio', 'Mesas', 'Accesible'],
    instagram: 'modo.cartagena', whatsapp: '5755550104', openHour: 9, closeHour: 22,
  },
];

const LOCATION_TAG_ICONS: Record<string, React.ReactNode> = {
  Domicilio: <IconBike />,
  Mesas: <IconUtensils />,
  Parqueadero: <IconParking />,
  Accesible: <IconWheelchair />,
};

const LOCATION_STATS = [
  { value: '+40', label: 'Locales en Colombia' },
  { value: '4', label: 'Ciudades' },
  { value: '15', label: 'Min. promedio de entrega' },
  { value: '100%', label: 'Ingredientes frescos' },
];

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function mapEmbedSrc(cityFilter: string) {
  if (cityFilter === 'Todas') {
    return 'https://www.openstreetmap.org/export/embed.html?bbox=-76.6%2C1.8%2C-73.5%2C11.3&layer=mapnik';
  }
  const loc = LOCATIONS.find((l) => l.city === cityFilter);
  if (!loc) return 'https://www.openstreetmap.org/export/embed.html?bbox=-76.6%2C1.8%2C-73.5%2C11.3&layer=mapnik';
  const d = 0.07;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${loc.lng - d}%2C${loc.lat - d}%2C${loc.lng + d}%2C${loc.lat + d}&layer=mapnik&marker=${loc.lat}%2C${loc.lng}`;
}

const WHY = [
  { icon: <IconLeaf />, title: 'Frescura', desc: 'Ingredientes preparados cada día.' },
  { icon: <IconSliders />, title: 'Personalización', desc: 'Miles de combinaciones hechas para ti.' },
  { icon: <IconDroplet />, title: 'Nutrición', desc: 'Comidas equilibradas para tu bienestar.' },
  { icon: <IconClock />, title: 'Rapidez', desc: 'Listo en minutos.' },
];

const INGREDIENTS = [
  { name: 'AGUACATE', icon: <GlyphAvocado />, gradient: `url('/images/ing-aguacate.jpg') center/cover no-repeat` },
  { name: 'POLLO GRILLADO', icon: <GlyphChicken />, gradient: `url('/images/ing-pollo.jpg') center/cover no-repeat` },
  { name: 'QUINOA', icon: <GlyphQuinoa />, gradient: `url('/images/ing-quinoa.jpg') center/cover no-repeat` },
  { name: 'KALE', icon: <GlyphKale />, gradient: `url('/images/ing-kale.jpg') center/cover no-repeat` },
  { name: 'TOMATES CHERRY', icon: <GlyphTomato />, gradient: `url('/images/ing-pico-de-gallo.jpg') center/cover no-repeat` },
  { name: 'EDAMAME', icon: <GlyphEdamame />, gradient: `url('/images/ing-edamame.jpg') center/cover no-repeat` },
  { name: 'ARROZ INTEGRAL', icon: <GlyphRice />, gradient: `url('/images/ing-arroz-integral.jpg') center/cover no-repeat` },
  { name: 'QUESO FETA', icon: <GlyphCheese />, gradient: `url('/images/ing-queso.jpg') center/cover no-repeat` },
  { name: 'JALAPEÑO', icon: <GlyphChili />, gradient: `url('/images/ing-jalapeno.jpg') center/cover no-repeat` },
];

const TESTIMONIALS = [
  { text: 'La mejor forma de comer saludable sin aburrirse.', name: 'Camila R.' },
  { text: 'Rápido, delicioso y totalmente personalizable.', name: 'Andrés M.' },
  { text: 'Mi comida favorita después del gimnasio.', name: 'Valentina P.' },
  { text: 'Cada bowl se siente hecho a mi medida. Ya no pido en otro lado.', name: 'Sebastián G.' },
  { text: 'Por fin un lugar saludable que también es delicioso de verdad.', name: 'Mariana T.' },
];

const CERTS = ['100% INGREDIENTES FRESCOS', 'OPCIONES VEGANAS', 'SIN GLUTEN DISPONIBLE', 'BAJO EN SODIO'];

const UGC_POSTS = [
  { handle: '@camila.fit', gradient: `url('/images/bowl.jpg') center/cover no-repeat` },
  { handle: '@andres_runs', gradient: `url('/images/ing-pollo.jpg') center/cover no-repeat` },
  { handle: '@valeentrena', gradient: `url('/images/tacos.jpg') center/cover no-repeat` },
  { handle: '@sebasg', gradient: `url('/images/burrito-1.jpg') center/cover no-repeat` },
  { handle: '@marianalife', gradient: `url('/images/ing-aguacate.jpg') center/cover no-repeat` },
  { handle: '@modolovers', gradient: `url('/images/burrito-2.jpg') center/cover no-repeat` },
];

const FAQS = [
  { q: '¿Cómo funciona la personalización de mi bowl?', a: 'Eliges base, proteína, vegetales y salsas en 4 pasos sencillos. Cada combinación se prepara al momento, justo como la armaste.' },
  { q: '¿Hacen envíos a domicilio?', a: 'Sí, llegamos a la mayoría de zonas en menos de 35 minutos. El envío es gratis en pedidos superiores a $50.000.' },
  { q: '¿Tienen opciones vegetarianas, veganas o sin gluten?', a: 'Sí. Puedes armar tu bowl 100% vegano o sin gluten eligiendo entre nuestras bases, proteínas y toppings marcados como aptos.' },
  { q: '¿Cómo uso el código MODO20?', a: 'Ingresa el código MODO20 al finalizar tu primer pedido para obtener 20% de descuento y envío gratis.' },
  { q: '¿Puedo acumular puntos por mis pedidos?', a: 'Claro. Cada compra suma puntos en la app MODO que luego puedes redimir por bowls, bebidas y descuentos exclusivos.' },
];

const PROMOS = [
  { tag: 'NUEVO', title: 'Bowl Power Protein', desc: 'Quinoa, salmón, kale y salsa tahini. Ya disponible en el menú.' },
  { tag: 'PROMO', title: '2x1 en Burritos los martes', desc: 'Todos los martes, lleva 2 burritos por el precio de 1 en cualquier local.' },
  { tag: 'LIMITADO', title: 'Smoothie de temporada: Mango-Maracuyá', desc: 'Solo por tiempo limitado, mientras dure la cosecha.' },
  { tag: 'APP', title: 'Doble de puntos en tu primer pedido', desc: 'Descarga la app MODO y duplica tus puntos esta semana.' },
];

const NUTRITION_TABLE = [
  { name: 'Bowl Fresh Greens', kcal: 410, protein: 34, carbs: 28, fat: 16 },
  { name: 'Bowl Power Protein', kcal: 540, protein: 38, carbs: 45, fat: 20 },
  { name: 'Bowl Tex-Mex', kcal: 590, protein: 30, carbs: 58, fat: 22 },
  { name: 'Burrito Clásico', kcal: 620, protein: 28, carbs: 65, fat: 24 },
  { name: 'Burrito Veggie', kcal: 480, protein: 16, carbs: 70, fat: 14 },
  { name: 'Burrito Pollo Picante', kcal: 580, protein: 35, carbs: 60, fat: 18 },
  { name: 'Wrap Mediterráneo', kcal: 390, protein: 14, carbs: 48, fat: 16 },
  { name: 'Ensalada Power', kcal: 360, protein: 32, carbs: 22, fat: 14 },
];

const FOOTER_COLUMNS = [
  { title: 'MENÚ', links: ['Nuestros Modos', 'Arma tu Bowl', 'Bebidas', 'Postres'] },
  { title: 'MODO', links: ['Sobre nosotros', 'Ingredientes', 'Nutrición', 'Sostenibilidad'] },
  { title: 'LOCALES', links: ['Encuentra tu MODO', 'Trabaja con nosotros', 'Franquicias'] },
  { title: 'APP', links: ['Descargar app', 'Beneficios', 'Preguntas'] },
];

// ---------------------------------------------------------------------------
// View navigation (each "page" is its own full view, switched via top menu)
// ---------------------------------------------------------------------------

type ViewKey = 'inicio' | 'menu' | 'modo' | 'locales' | 'app' | 'promos' | 'comunidad' | 'puntos' | 'equipo';

const NAV_ITEMS: { key: ViewKey; label: string }[] = [
  { key: 'inicio', label: 'INICIO' },
  { key: 'menu', label: 'MENÚ' },
  { key: 'promos', label: 'PROMOS' },
  { key: 'comunidad', label: 'COMUNIDAD' },
  { key: 'puntos', label: 'PUNTOS' },
  { key: 'modo', label: 'NUESTRO MODO' },
  { key: 'locales', label: 'LOCALES' },
  { key: 'equipo', label: 'ÚNETE' },
  { key: 'app', label: 'APP' },
];

// ---------------------------------------------------------------------------
// Custom cursor (desktop only)
// ---------------------------------------------------------------------------
function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) return;
    let rafId: number;
    let mx = -200, my = -200, rx = -200, ry = -200;
    const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };
    const animate = () => {
      rx += (mx - rx) * 0.13;
      ry += (my - ry) * 0.13;
      if (dotRef.current) dotRef.current.style.transform = `translate(${mx - 5}px,${my - 5}px)`;
      if (ringRef.current) ringRef.current.style.transform = `translate(${rx - 20}px,${ry - 20}px)`;
      rafId = requestAnimationFrame(animate);
    };
    window.addEventListener('mousemove', onMove);
    rafId = requestAnimationFrame(animate);
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(rafId); };
  }, [mounted]);
  if (!mounted) return null;
  return createPortal(
    <>
      <div ref={dotRef} className="custom-cursor-dot" style={{ position: 'fixed', top: 0, left: 0, width: 10, height: 10, borderRadius: '50%', background: C.lime, pointerEvents: 'none', zIndex: 99999, transition: 'opacity 0.2s' }} />
      <div ref={ringRef} className="custom-cursor-ring" style={{ position: 'fixed', top: 0, left: 0, width: 40, height: 40, borderRadius: '50%', border: `2px solid ${C.lime}`, pointerEvents: 'none', zIndex: 99998, opacity: 0.55 }} />
    </>,
    document.body
  );
}

// Wave section divider
function WaveDivider({ topColor = 'transparent', bottomColor = C.greenDark }: { topColor?: string; bottomColor?: string }) {
  return (
    <div style={{ position: 'relative', height: 56, overflow: 'hidden', background: topColor, marginBottom: -1 }}>
      <svg viewBox="0 0 1440 56" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, width: '100%', height: '100%' }}>
        <path d="M0,28 C240,56 480,0 720,28 C960,56 1200,0 1440,28 L1440,56 L0,56 Z" fill={bottomColor} />
      </svg>
    </div>
  );
}

function WaveDividerInv({ topColor = C.greenDark, bottomColor = 'transparent' }: { topColor?: string; bottomColor?: string }) {
  return (
    <div style={{ position: 'relative', height: 56, overflow: 'hidden', background: topColor, marginTop: -1 }}>
      <svg viewBox="0 0 1440 56" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, width: '100%', height: '100%' }}>
        <path d="M0,28 C240,0 480,56 720,28 C960,0 1200,56 1440,28 L1440,0 L0,0 Z" fill={bottomColor} />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Promo sub-components
// ---------------------------------------------------------------------------

function JobApplicationForm() {
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '', cargo: '', mensaje: '' });
  const [fileName, setFileName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 12, padding: '12px 16px', fontSize: 14, color: '#fff', outline: 'none',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => { setSubmitting(false); setSubmitted(true); }, 1400);
  };

  if (submitted) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 16px' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}><SparklesIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></div>
        <h4 style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: 0, marginBottom: 10 }}>¡Recibimos tu CV!</h4>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: 0 }}>
          El equipo de talento MODO lo revisará y te escribirá en menos de 48 horas a <strong style={{ color: C.lime }}>{form.email}</strong>.
        </p>
        <button onClick={() => { setSubmitted(false); setForm({ nombre: '', email: '', telefono: '', cargo: '', mensaje: '' }); setFileName(''); }} style={{ marginTop: 24, background: 'transparent', color: C.lime, fontWeight: 800, fontSize: 13, border: `1px solid ${C.lime}`, borderRadius: 999, padding: '10px 24px', cursor: 'pointer' }}>
          Enviar otra solicitud
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>NOMBRE COMPLETO *</label>
          <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Tu nombre" style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>TELÉFONO</label>
          <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="+57 300 000 0000" style={inputStyle} />
        </div>
      </div>
      <div>
        <label style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>CORREO ELECTRÓNICO *</label>
        <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="tu@correo.com" style={inputStyle} />
      </div>
      <div>
        <label style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>CARGO DE INTERÉS *</label>
        <select required value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}>
          <option value="" style={{ background: C.greenDark }}>Selecciona una posición…</option>
          {['Chef de línea', 'Cajero/a', 'Repartidor', 'Community Manager', 'Asesor de punto de venta', 'Otra posición'].map((o) => (
            <option key={o} value={o} style={{ background: C.greenDark }}>{o}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>CUÉNTANOS DE TI</label>
        <textarea value={form.mensaje} onChange={(e) => setForm({ ...form, mensaje: e.target.value })} placeholder="¿Por qué quieres ser parte de MODO? (opcional)" rows={3} style={{ ...inputStyle, resize: 'none', lineHeight: 1.55 }} />
      </div>
      {/* CV upload */}
      <div>
        <label style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>HOJA DE VIDA / CV *</label>
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" required style={{ display: 'none' }} onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')} />
        <button type="button" onClick={() => fileRef.current?.click()} style={{ width: '100%', background: fileName ? 'rgba(168,198,58,0.1)' : 'rgba(255,255,255,0.04)', border: `1px dashed ${fileName ? C.lime : 'rgba(255,255,255,0.2)'}`, borderRadius: 12, padding: '18px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, color: fileName ? C.lime : 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 700, transition: 'all 0.2s ease' }}>
          <span style={{ fontSize: 22 }}>{fileName ? '' : '📎'}</span>
          <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {fileName || 'Adjuntar CV (PDF, DOC, DOCX — máx 5 MB)'}
          </span>
          {!fileName && <span style={{ flexShrink: 0, background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '4px 12px', fontSize: 11 }}>SUBIR</span>}
          {fileName && <span style={{ flexShrink: 0, color: C.lime, fontSize: 16 }}>✓</span>}
        </button>
      </div>
      <button type="submit" disabled={submitting} style={{ marginTop: 4, background: submitting ? 'rgba(168,198,58,0.5)' : C.lime, color: C.greenDark, fontWeight: 900, fontSize: 14, letterSpacing: '0.06em', padding: '15px 28px', borderRadius: 999, border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {submitting ? (
          <><span style={{ display: 'inline-block', width: 16, height: 16, border: `2px solid ${C.greenDark}40`, borderTop: `2px solid ${C.greenDark}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />ENVIANDO…</>
        ) : 'ENVIAR MI CV →'}
      </button>
    </form>
  );
}

function PromoHeroCard({ goTo }: { goTo: (v: 'menu') => void }) {
  return (
    <Reveal delay={60}>
      <div className="promo-featured" style={{ background: `linear-gradient(135deg, ${C.green} 0%, #0B4D2F 100%)`, borderRadius: 28, padding: '56px 64px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 48, marginBottom: 28, overflow: 'hidden', position: 'relative', alignItems: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 85% 50%, rgba(168,198,58,0.12) 0%, transparent 55%)' }} />
        <div style={{ position: 'absolute', right: -60, top: -60, width: 360, height: 360, borderRadius: '50%', border: '1px solid rgba(168,198,58,0.1)' }} />
        <div style={{ position: 'absolute', right: 0, top: 0, width: 180, height: 180, borderRadius: '50%', border: '1px solid rgba(168,198,58,0.07)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(168,198,58,0.2)', border: '1px solid rgba(168,198,58,0.4)', borderRadius: 999, padding: '6px 18px', fontSize: 11, fontWeight: 900, letterSpacing: '0.14em', color: C.lime, marginBottom: 24 }}><StarIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> PROMO ESTRELLA DE LA SEMANA</div>
          <h2 style={{ fontSize: 'clamp(32px, 4vw, 56px)', fontWeight: 900, color: '#fff', margin: 0, marginBottom: 16, lineHeight: 1.05, letterSpacing: '-0.02em' }}>2×1 en Burritos<br /><span style={{ color: C.lime }}>todos los martes</span></h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', margin: 0, marginBottom: 32, maxWidth: 440, lineHeight: 1.65 }}>Lleva 2 burritos por el precio de 1 en cualquier local de Colombia. Sin límite de pedidos. Solo los martes.</p>
          <div style={{ display: 'flex', gap: 14 }}>
            <button onClick={() => goTo('menu')} style={{ background: C.lime, color: C.greenDark, fontWeight: 900, fontSize: 13, letterSpacing: '0.06em', padding: '15px 36px', borderRadius: 999, border: 'none', cursor: 'pointer' }}>VER BURRITOS →</button>
            <button style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: 800, fontSize: 13, padding: '15px 28px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>¿CÓMO FUNCIONA?</button>
          </div>
        </div>
        <div className="float-badge" style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 100, filter: 'drop-shadow(0 16px 32px rgba(0,0,0,0.35))' }}></div>
          <div style={{ background: 'rgba(168,198,58,0.25)', border: '1px solid rgba(168,198,58,0.4)', borderRadius: 16, padding: '12px 22px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: C.lime }}>2×1</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 700, letterSpacing: '0.08em', marginTop: 2 }}>SOLO MARTES</div>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

function PromoCountdown() {
  const [time, setTime] = useState({ h: 0, m: 0, s: 0 });
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const colombiaOffset = -5 * 60;
      const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes();
      const localMin = (utcMin + colombiaOffset + 1440) % 1440;
      const mondayReset = 8 * 60;
      const dayOfWeek = ((now.getUTCDay() + Math.floor((utcMin + colombiaOffset) / 1440)) % 7 + 7) % 7;
      const daysToMonday = (8 - dayOfWeek) % 7 || 7;
      const totalSecs = daysToMonday * 86400 - (localMin - mondayReset) * 60 - now.getUTCSeconds();
      const clamped = Math.max(0, totalSecs % 604800);
      setTime({ h: Math.floor(clamped / 3600) % 24, m: Math.floor(clamped / 60) % 60, s: clamped % 60 });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <Reveal delay={80}>
      <div style={{ background: `${C.orange}12`, border: `1px solid ${C.orange}30`, borderRadius: 18, padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.orange, animation: 'promoPulse 1.5s ease-in-out infinite' }} />
          <span style={{ fontSize: 13, fontWeight: 800, color: C.orange, letterSpacing: '0.08em' }}>RENOVACIÓN DE PROMOS</span>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'rgba(26,26,26,0.5)', fontWeight: 600 }}>Nuevas ofertas en:</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ val: pad(time.h), label: 'HRS' }, { val: pad(time.m), label: 'MIN' }, { val: pad(time.s), label: 'SEG' }].map((t, i) => (
              <div key={t.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{ background: C.green, color: '#fff', borderRadius: 10, padding: '6px 14px', fontSize: 22, fontWeight: 900, fontVariantNumeric: 'tabular-nums', minWidth: 52, textAlign: 'center' }}>{t.val}</div>
                <div style={{ fontSize: 9, fontWeight: 900, color: 'rgba(26,26,26,0.35)', letterSpacing: '0.1em' }}>{t.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Reveal>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeMenuTab, setActiveMenuTab] = useState(MENU[0].category);
  const [bowlStep, setBowlStep] = useState(0);
  const [bowlSelections, setBowlSelections] = useState<(string | null)[]>([null, null, null, null]);
  const [orderCount, setOrderCount] = useState(1842);
  const [timeLeft, setTimeLeft] = useState('');
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [showExitPopup, setShowExitPopup] = useState(false);
  const [exitPopupShown, setExitPopupShown] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSent, setNewsletterSent] = useState(false);
  const [activeView, setActiveView] = useState<ViewKey>('inicio');
  const [viewKey, setViewKey] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [showFloatingCta, setShowFloatingCta] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [activePromo, setActivePromo] = useState(0);
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [activeCityFilter, setActiveCityFilter] = useState('Todas');
  const [nearestCity, setNearestCity] = useState<string | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [comingSoonEmail, setComingSoonEmail] = useState('');
  const [comingSoonSent, setComingSoonSent] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [orderFlash, setOrderFlash] = useState(false);
  const [navPill, setNavPill] = useState({ left: 0, width: 0 });
  const navLinksRef = useRef<HTMLDivElement>(null);
  const navBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const goTo = (view: ViewKey, target?: string, skipHistory?: boolean) => {
    setMobileMenuOpen(false);
    if (view === activeView && !target) return;
    setIsLeaving(true);
    window.setTimeout(() => {
      setActiveView(view);
      setViewKey((k) => k + 1);
      setScrollTarget(target ?? null);
      setIsLeaving(false);
      if (!skipHistory) window.history.pushState(null, '', `#${view}`);
    }, 220);
  };

  const findNearestCity = () => {
    if (!('geolocation' in navigator)) {
      setGeoStatus('error');
      return;
    }
    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        let best = LOCATIONS[0];
        let bestDist = Infinity;
        for (const loc of LOCATIONS) {
          const dist = haversine(latitude, longitude, loc.lat, loc.lng);
          if (dist < bestDist) {
            bestDist = dist;
            best = loc;
          }
        }
        setNearestCity(best.city);
        setActiveCityFilter(best.city);
        setGeoStatus('done');
      },
      () => setGeoStatus('error')
    );
  };

  useEffect(() => {
    if (scrollTarget) {
      requestAnimationFrame(() => {
        document.getElementById(scrollTarget)?.scrollIntoView({ behavior: 'smooth' });
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewKey]);

  // Deep-link: read the view from the URL hash on load and on back/forward navigation
  useEffect(() => {
    const applyHash = () => {
      const key = window.location.hash.replace('#', '') as ViewKey;
      if (NAV_ITEMS.some((item) => item.key === key) && key !== activeView) {
        setActiveView(key);
        setViewKey((k) => k + 1);
      }
    };
    applyHash();
    window.addEventListener('popstate', applyHash);
    return () => window.removeEventListener('popstate', applyHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard navigation: ArrowLeft / ArrowRight cycle through the top-level views
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const idx = NAV_ITEMS.findIndex((item) => item.key === activeView);
      if (e.key === 'ArrowRight' && idx < NAV_ITEMS.length - 1) goTo(NAV_ITEMS[idx + 1].key);
      if (e.key === 'ArrowLeft' && idx > 0) goTo(NAV_ITEMS[idx - 1].key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView]);

  // Sliding nav-pill: measure the active nav button's position/size
  useLayoutEffect(() => {
    const measure = () => {
      const btn = navBtnRefs.current[activeView];
      const container = navLinksRef.current;
      if (btn && container) {
        const btnBox = btn.getBoundingClientRect();
        const containerBox = container.getBoundingClientRect();
        setNavPill({ left: btnBox.left - containerBox.left, width: btnBox.width });
      }
    };
    measure();
    const raf = requestAnimationFrame(measure);
    document.fonts?.ready?.then(measure);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
    };
  }, [activeView, checkingAuth]);

  // Swipe navigation on touch devices
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    const idx = NAV_ITEMS.findIndex((item) => item.key === activeView);
    if (delta < -60 && idx < NAV_ITEMS.length - 1) goTo(NAV_ITEMS[idx + 1].key);
    if (delta > 60 && idx > 0) goTo(NAV_ITEMS[idx - 1].key);
    touchStartX.current = null;
  };

  useEffect(() => {
    const id = setInterval(() => {
      setOrderCount((c) => c + Math.floor(Math.random() * 2) + 1);
      setOrderFlash(true);
      setTimeout(() => setOrderFlash(false), 800);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      const diff = end.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        setScrollY(window.scrollY);
        const nearBottom = window.innerHeight + window.scrollY > document.body.offsetHeight - 280;
        setShowFloatingCta(window.scrollY > 480 && !nearBottom);
        raf = 0;
      });
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setActivePromo((p) => (p + 1) % PROMOS.length), 4500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !exitPopupShown) {
        setShowExitPopup(true);
        setExitPopupShown(true);
      }
    };
    document.addEventListener('mouseout', onLeave);
    return () => document.removeEventListener('mouseout', onLeave);
  }, [exitPopupShown]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          router.replace('/admin/generate');
        } else {
          setCheckingAuth(false);
        }
      })
      .catch(() => setCheckingAuth(false));
  }, [router]);

  if (checkingAuth) {
    return <div style={{ minHeight: '100vh', background: C.cream }} />;
  }

  const bowlPhoto = `url('/images/bowl.jpg') center/cover no-repeat`;

  const heroPhoto = `
    radial-gradient(circle at 78% 35%, rgba(240,122,39,0.25), transparent 45%),
    radial-gradient(circle at 60% 70%, rgba(168,198,58,0.18), transparent 50%),
    linear-gradient(120deg, rgba(26,26,26,0.55) 0%, rgba(26,26,26,0.35) 55%, rgba(16,15,12,0.7) 100%),
    url('/images/hero.jpg') center/cover no-repeat
  `;

  const restaurantPhoto = `
    linear-gradient(0deg, rgba(20,40,32,0.55), rgba(20,40,32,0.15)),
    url('/images/burrito-1.jpg') center/cover no-repeat
  `;

  const ctaPhoto = `
    radial-gradient(circle at 75% 50%, rgba(168,198,58,0.22), transparent 55%),
    linear-gradient(90deg, rgba(20,40,32,0.92) 0%, rgba(20,40,32,0.55) 45%, rgba(20,40,32,0.35) 100%),
    url('/images/tacos.jpg') center/cover no-repeat
  `;

  return (
    <div style={{ background: C.cream, color: C.black, fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif", overflowX: 'hidden' }}>
      <CustomCursor />
      {/* ============ PROMO BAR ============ */}
      <div style={{ background: C.lime, color: C.greenDark, textAlign: 'center', padding: '10px 16px', fontSize: 13, fontWeight: 800, letterSpacing: '0.04em' }}>
        <FireIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> 20% DE DESCUENTO EN TU PRIMER PEDIDO — usa el código <span style={{ textDecoration: 'underline' }}>MODO20</span> · Envío gratis desde $50.000
        {timeLeft && <span style={{ marginLeft: 10, fontVariantNumeric: 'tabular-nums' }}>· Termina en {timeLeft}</span>}
      </div>

      {/* ============ NAV (persistent — switches the active view) ============ */}
      <nav className="main-nav" style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, padding: '20px 48px', background: C.greenDark, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '0.08em', color: '#fff', flexShrink: 0 }}>MODO</div>
        <div ref={navLinksRef} className="nav-links" style={{ position: 'relative', display: 'flex', gap: 8, fontSize: 13, fontWeight: 800, letterSpacing: '0.08em' }}>
          <div
            className="nav-pill"
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: navPill.left,
              width: navPill.width,
              background: C.lime,
              borderRadius: 999,
              zIndex: 0,
              transition: 'left 0.4s cubic-bezier(.16,1,.3,1), width 0.4s cubic-bezier(.16,1,.3,1)',
            }}
          />
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              ref={(el) => { navBtnRefs.current[item.key] = el; }}
              onClick={() => goTo(item.key)}
              className="nav-btn"
              style={{
                position: 'relative',
                zIndex: 1,
                background: 'transparent',
                color: activeView === item.key ? C.greenDark : 'rgba(255,255,255,0.75)',
                border: '1px solid transparent',
                borderRadius: 999,
                padding: '10px 20px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <Link href="/verificar" style={{ background: C.orange, color: '#fff', fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', padding: '10px 22px', borderRadius: 999, textDecoration: 'none' }}>
            PEDIR AHORA
          </Link>
          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="nav-hamburger"
            aria-label="Abrir menú"
            style={{ display: 'none', background: 'transparent', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10, width: 40, height: 40, color: '#fff', fontSize: 20, cursor: 'pointer', alignItems: 'center', justifyContent: 'center' }}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="mobile-nav-menu" style={{ position: 'sticky', top: 0, zIndex: 49, background: C.greenDark, borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '8px 24px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => goTo(item.key)}
              style={{
                textAlign: 'left',
                background: activeView === item.key ? C.lime : 'transparent',
                color: activeView === item.key ? C.greenDark : 'rgba(255,255,255,0.85)',
                border: 'none',
                borderRadius: 10,
                padding: '12px 16px',
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: '0.06em',
                cursor: 'pointer',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* ============ ACTIVE VIEW ============ */}
      <main
        key={viewKey}
        className={`view-transition ${isLeaving ? 'view-leaving' : ''}`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
      {activeView === 'inicio' && (
      <>
      {/* ============ HERO ============ */}
      <header style={{ position: 'relative', minHeight: 'calc(100vh - 76px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '130%', background: heroPhoto, transform: `translateY(${scrollY * 0.3}px)`, willChange: 'transform' }} />
        <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', alignItems: 'center', padding: '40px 48px 100px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
          <Reveal>
            <div style={{ maxWidth: 560 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 999, padding: '8px 18px', fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 24 }}>
                <span style={{ color: C.lime }}>★★★★★</span> 4.9/5 · +2M bowls servidos
              </div>
              <h1 style={{ fontSize: 'clamp(48px, 7vw, 84px)', fontWeight: 900, lineHeight: 1.05, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>
                TU MODO.<br /><span style={{ color: C.lime }}>TU COMIDA.</span>
              </h1>
              <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.8)', marginTop: 22, marginBottom: 34, maxWidth: 440, lineHeight: 1.6 }}>
                Construye la comida perfecta para tu cuerpo, tu energía y tu estilo de vida.
              </p>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <button onClick={() => goTo('menu', 'bowl')} className="btn-shimmer" style={{ background: C.orange, color: '#fff', fontWeight: 800, fontSize: 14, letterSpacing: '0.06em', padding: '16px 32px', borderRadius: 999, border: 'none', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                  CREAR MI MODO
                </button>
                <button onClick={() => goTo('menu')} style={{ border: '1px solid rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', color: '#fff', fontWeight: 800, fontSize: 14, letterSpacing: '0.06em', padding: '16px 32px', borderRadius: 999, cursor: 'pointer', transition: 'background 0.2s ease' }}>
                  VER MENÚ
                </button>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.lime, display: 'inline-block', animation: 'pulse 1.6s infinite' }} />
                <span style={{ fontVariantNumeric: 'tabular-nums', color: orderFlash ? C.lime : 'rgba(255,255,255,0.75)', fontWeight: orderFlash ? 800 : 600, transition: 'color 0.3s ease, font-weight 0.3s ease' }}>
                  {orderCount.toLocaleString('es-CO')}
                </span>
                {' '}personas pidieron su MODO hoy
                {orderFlash && <span style={{ fontSize: 11, fontWeight: 800, color: C.lime, animation: 'flashBadge 0.8s ease forwards', background: 'rgba(168,198,58,0.15)', borderRadius: 999, padding: '3px 9px', letterSpacing: '0.06em' }}>+NUEVO</span>}
              </p>
            </div>
          </Reveal>

          {/* Floating food chips — desktop only */}
          <div className="hero-chips" style={{ position: 'absolute', right: 80, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 16, zIndex: 3 }}>
            {[
              { emoji: '', name: 'Bowl Fresh Greens', sub: '410 kcal · $28.000', delay: '0s' },
              { emoji: '', name: 'Burrito Clásico', sub: '620 kcal · $26.000', delay: '0.12s' },
              { emoji: '', name: 'Bowl Tex-Mex', sub: '590 kcal · $30.000', delay: '0.24s' },
            ].map((chip) => (
              <button
                key={chip.name}
                onClick={() => goTo('menu')}
                className="hero-chip"
                style={{ animationDelay: chip.delay, display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 16, padding: '14px 20px', color: '#fff', cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s ease, transform 0.2s ease' }}
              >
                <span style={{ fontSize: 30, flexShrink: 0 }}>{chip.emoji}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 3 }}>{chip.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{chip.sub}</div>
                </div>
                <span style={{ marginLeft: 6, color: C.lime, fontSize: 16 }}>→</span>
              </button>
            ))}
          </div>
        </div>

        {/* Scroll down arrow */}
        <div style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', cursor: 'pointer' }} onClick={() => window.scrollBy({ top: window.innerHeight * 0.85, behavior: 'smooth' })}>
          <span>DESCUBRIR</span>
          <div className="scroll-bounce" style={{ width: 34, height: 34, border: '1px solid rgba(255,255,255,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>↓</div>
        </div>
      </header>

      {/* wave into stats */}
      <WaveDivider topColor={C.cream} bottomColor={C.greenDark} />
      {/* ============ STATS ============ */}
      <section style={{ background: C.greenDark, padding: '56px 48px' }}>
        <div className="stats-grid" style={{ maxWidth: 1400, margin: '0 auto' }}>
          {STATS.map((s, i) => (
            <StatBlock key={s.label} value={s.value} label={s.label} delay={i * 80} />
          ))}
        </div>
      </section>

      {/* wave out of stats */}
      <WaveDividerInv topColor={C.greenDark} bottomColor={C.cream} />
      {/* ============ PRESS / MEDIA STRIP ============ */}
      <section style={{ padding: '36px 48px', maxWidth: 1400, margin: '0 auto' }}>
        <Reveal>
          <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 800, letterSpacing: '0.18em', color: 'rgba(26,26,26,0.35)', marginBottom: 22 }}>
            COMO LO VISTE EN
          </p>
          <div className="press-strip">
            {['EL TIEMPO', 'VOGUE', 'FORBES', 'PUBLIMETRO', 'LA REPÚBLICA'].map((name) => (
              <span key={name} style={{ fontSize: 18, fontWeight: 900, letterSpacing: '0.06em', color: 'rgba(26,26,26,0.28)', fontFamily: "'Georgia', serif" }}>
                {name}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ============ PROMO CAROUSEL ============ */}
      <section style={{ padding: '0 48px 36px', maxWidth: 1400, margin: '0 auto' }}>
        <Reveal>
          <div style={{ position: 'relative', background: C.green, borderRadius: 24, padding: '32px 40px 44px', overflow: 'hidden', minHeight: 110, display: 'flex', alignItems: 'center' }}>
            {PROMOS.map((promo, i) => (
              <div
                key={promo.title}
                style={{
                  position: i === activePromo ? 'relative' : 'absolute',
                  inset: i === activePromo ? undefined : 0,
                  opacity: i === activePromo ? 1 : 0,
                  transform: i === activePromo ? 'translateY(0)' : 'translateY(12px)',
                  transition: 'opacity 0.6s ease, transform 0.6s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  flexWrap: 'wrap',
                  width: '100%',
                  pointerEvents: i === activePromo ? 'auto' : 'none',
                }}
              >
                <span style={{ background: C.lime, color: C.greenDark, fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', padding: '6px 14px', borderRadius: 999, flexShrink: 0 }}>{promo.tag}</span>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>{promo.title}</div>
                  <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>{promo.desc}</div>
                </div>
              </div>
            ))}
            <div style={{ position: 'absolute', bottom: 16, right: 24, display: 'flex', gap: 6 }}>
              {PROMOS.map((_, i) => (
                <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i === activePromo ? C.lime : 'rgba(255,255,255,0.25)' }} />
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ============ ELIGE TU MODO ============ */}
      <section id="modos" style={{ padding: '100px 48px', maxWidth: 1400, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, color: C.green, margin: 0 }}>ELIGE TU MODO</h2>
            <p style={{ fontSize: 16, color: 'rgba(26,26,26,0.55)', marginTop: 12 }}>Cada modo está diseñado para un objetivo. Tú eliges el tuyo.</p>
          </div>
        </Reveal>
        <div className="modos-grid">
          {MODOS.map((m, i) => (
            <ModoCard key={m.title} icon={m.icon} title={m.title} desc={m.desc} accent={m.accent} delay={i * 80} />
          ))}
        </div>
      </section>
      </>
      )}

      {activeView === 'menu' && (
      <>
      {/* ============ MENÚ ============ */}
      <section id="menu" style={{ padding: '90px 48px', maxWidth: 1400, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, color: C.green, margin: 0 }}>NUESTRO MENÚ</h2>
            <p style={{ fontSize: 16, color: 'rgba(26,26,26,0.55)', marginTop: 12 }}>Bowls, burritos, wraps y más. Hechos al momento, a tu manera.</p>
          </div>
        </Reveal>
        <Reveal>
          <div className="menu-tabs" style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 48, flexWrap: 'wrap' }}>
            {MENU.map((cat) => (
              <button
                key={cat.category}
                onClick={() => setActiveMenuTab(cat.category)}
                style={{
                  padding: '12px 26px',
                  borderRadius: 999,
                  border: `1px solid ${activeMenuTab === cat.category ? C.green : 'rgba(26,26,26,0.15)'}`,
                  background: activeMenuTab === cat.category ? C.green : 'transparent',
                  color: activeMenuTab === cat.category ? '#fff' : C.black,
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {cat.category}
              </button>
            ))}
          </div>
        </Reveal>
        {MENU.map((cat, ci) => (
          activeMenuTab === cat.category && (
            <div key={cat.category} className="menu-grid">
              {cat.items.map((item, i) => (
                <MenuItemCard
                  key={item.name}
                  name={item.name}
                  desc={item.desc}
                  price={item.price}
                  delay={i * 70}
                  gradient={MENU_GRADIENTS[(ci * 3 + i) % MENU_GRADIENTS.length]}
                  onPhotoClick={() => setLightboxImage(extractPhotoUrl(MENU_GRADIENTS[(ci * 3 + i) % MENU_GRADIENTS.length]))}
                  popular={(item as { popular?: boolean }).popular}
                  badge={(item as { badge?: string }).badge}
                />
              ))}
            </div>
          )
        ))}
      </section>

      {/* ============ CREA TU BOWL ============ */}
      <section id="bowl" style={{ background: C.green, padding: '90px 48px' }}>
        <div className="two-col" style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', gap: 64, alignItems: 'center' }}>
          <Reveal className="two-col-photo">
            <PhotoBlock gradient={bowlPhoto} style={{ width: '100%', aspectRatio: '4 / 3' }} />
          </Reveal>
          <Reveal delay={120} className="two-col-text">
            <div>
              <div style={{ color: C.lime, fontSize: 13, fontWeight: 800, letterSpacing: '0.18em', marginBottom: 14 }}>100% PERSONALIZADO</div>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, color: '#fff', margin: 0, lineHeight: 1.2, marginBottom: 28 }}>
                CREA TU BOWL EN 4 PASOS
              </h2>

              {/* step indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                {BOWL_STEPS.map((s, i) => (
                  <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: i < BOWL_STEPS.length - 1 ? 1 : undefined }}>
                    <button
                      onClick={() => setBowlStep(i)}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        border: `1px solid ${i <= bowlStep ? C.lime : 'rgba(255,255,255,0.25)'}`,
                        background: i === bowlStep ? C.lime : i < bowlStep ? 'rgba(168,198,58,0.2)' : 'transparent',
                        color: i === bowlStep ? C.greenDark : i < bowlStep ? C.lime : 'rgba(255,255,255,0.5)',
                        fontWeight: 900,
                        fontSize: 13,
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {bowlSelections[i] ? '✓' : s.n}
                    </button>
                    {i < BOWL_STEPS.length - 1 && (
                      <div style={{ flex: 1, height: 1, background: i < bowlStep ? C.lime : 'rgba(255,255,255,0.15)' }} />
                    )}
                  </div>
                ))}
              </div>
              {/* progress bar */}
              <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.12)', marginBottom: 24, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 999, background: C.lime, width: `${((bowlStep + (bowlSelections[bowlStep] ? 1 : 0)) / BOWL_STEPS.length) * 100}%`, transition: 'width 0.4s cubic-bezier(.16,1,.3,1)' }} />
              </div>

              {/* active step */}
              <div style={{ marginBottom: 34, minHeight: 160 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 18, color: '#fff', marginBottom: 16 }}>
                  <span style={{ color: C.lime, fontWeight: 900, fontSize: 15, letterSpacing: '0.05em' }}>{BOWL_STEPS[bowlStep].n}</span>
                  <span style={{ fontWeight: 800 }}>{BOWL_STEPS[bowlStep].label}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, paddingLeft: 32 }}>
                  {BOWL_STEPS[bowlStep].options.map((opt) => {
                    const selected = bowlSelections[bowlStep] === opt.name;
                    return (
                      <button
                        key={opt.name}
                        onClick={() => {
                          const next = [...bowlSelections];
                          next[bowlStep] = opt.name;
                          setBowlSelections(next);
                          if (bowlStep < BOWL_STEPS.length - 1) setBowlStep(bowlStep + 1);
                        }}
                        style={{
                          fontSize: 13,
                          fontWeight: selected ? 800 : 500,
                          color: selected ? C.greenDark : 'rgba(255,255,255,0.85)',
                          background: selected ? C.lime : 'rgba(255,255,255,0.07)',
                          border: `1px solid ${selected ? C.lime : 'rgba(255,255,255,0.18)'}`,
                          borderRadius: 999,
                          padding: '9px 18px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 7,
                        }}
                      >
                        <span style={{ fontSize: 16 }}>{(opt as { emoji?: string }).emoji}</span>
                        {opt.name}
                        {selected && <span style={{ fontSize: 11, opacity: 0.7 }}>{opt.kcal} kcal</span>}
                      </button>
                    );
                  })}
                </div>
                {bowlStep > 0 && (
                  <button
                    onClick={() => setBowlStep(bowlStep - 1)}
                    style={{ marginTop: 20, marginLeft: 32, background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                  >
                    ← Paso anterior
                  </button>
                )}
              </div>

              {/* macro calculator */}
              {bowlSelections.some((s) => s) && (() => {
                const totalKcal = BOWL_STEPS.reduce((sum, step, i) => {
                  const sel = step.options.find((o) => o.name === bowlSelections[i]);
                  return sum + (sel?.kcal ?? 0);
                }, 0);
                const totalProtein = BOWL_STEPS.reduce((sum, step, i) => {
                  const sel = step.options.find((o) => o.name === bowlSelections[i]);
                  return sum + (sel?.protein ?? 0);
                }, 0);
                const totalPrice = BOWL_STEPS.reduce((sum, step, i) => {
                  const sel = step.options.find((o) => o.name === bowlSelections[i]);
                  return sum + ((sel as { price?: number })?.price ?? 0);
                }, 0);
                const proteinGoal = 35;
                const pct = Math.min(totalProtein / proteinGoal, 1);
                const r = 30;
                const circumference = 2 * Math.PI * r;
                return (
                  <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginBottom: 28, padding: '16px 20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14 }}>
                    <svg width="72" height="72" viewBox="0 0 72 72" style={{ flexShrink: 0 }}>
                      <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="6" />
                      <circle
                        cx="36" cy="36" r={r} fill="none" stroke={C.lime} strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference * (1 - pct)}
                        transform="rotate(-90 36 36)"
                        style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(.16,1,.3,1)' }}
                      />
                      <text x="36" y="41" textAnchor="middle" fontSize="15" fontWeight="900" fill="#fff">{Math.round(pct * 100)}%</text>
                    </svg>
                    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: C.lime }}>{totalKcal}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>Calorías aprox.</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: C.lime }}>{totalProtein}g</div>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>Proteína · meta {proteinGoal}g</div>
                      </div>
                      {totalPrice > 0 && (
                        <div>
                          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>${totalPrice.toLocaleString('es-CO')}</div>
                          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>Precio estimado</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              <Link href="/verificar" style={{ background: C.lime, color: C.greenDark, fontWeight: 800, fontSize: 14, letterSpacing: '0.06em', padding: '16px 36px', borderRadius: 999, textDecoration: 'none', display: 'inline-block' }}>
                EMPEZAR AHORA
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ POR QUÉ MODO ============ */}
      <section style={{ padding: '90px 48px', maxWidth: 1400, margin: '0 auto' }}>
        <div className="why-grid">
          {WHY.map((w, i) => (
            <WhyBlock key={w.title} icon={w.icon} title={w.title} desc={w.desc} delay={i * 80} />
          ))}
        </div>
      </section>

      {/* ============ INGREDIENTES REALES ============ */}
      <section style={{ padding: '90px 48px', maxWidth: 1400, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, color: C.green, margin: 0 }}>INGREDIENTES REALES</h2>
            <p style={{ fontSize: 16, color: 'rgba(26,26,26,0.55)', marginTop: 12 }}>Seleccionamos lo mejor de la naturaleza y lo preparamos cada día.</p>
          </div>
        </Reveal>
        <div className="ingredients-grid">
          {INGREDIENTS.map((ing, i) => (
            <IngredientPhoto
              key={ing.name}
              name={ing.name}
              gradient={ing.gradient}
              icon={ing.icon}
              delay={i * 60}
              onClick={() => setLightboxImage(extractPhotoUrl(ing.gradient))}
            />
          ))}
        </div>
        <Reveal delay={120}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap', marginTop: 48 }}>
            {CERTS.map((cert) => (
              <span key={cert} style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: C.green, border: `1px solid ${C.green}`, borderRadius: 999, padding: '8px 18px' }}>
                ✓ {cert}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ============ INFORMACIÓN NUTRICIONAL ============ */}
      <section style={{ padding: '90px 48px', maxWidth: 1000, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, color: C.green, margin: 0 }}>INFORMACIÓN NUTRICIONAL</h2>
            <p style={{ fontSize: 16, color: 'rgba(26,26,26,0.55)', marginTop: 12 }}>Transparencia total. Sabe exactamente qué hay en tu plato.</p>
          </div>
        </Reveal>
        <Reveal delay={80}>
          <div style={{ overflowX: 'auto', borderRadius: 18, border: '1px solid rgba(26,26,26,0.08)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, background: '#fff', minWidth: 520 }}>
              <thead>
                <tr style={{ background: C.green, color: '#fff' }}>
                  <th style={{ textAlign: 'left', padding: '16px 20px', fontWeight: 800, letterSpacing: '0.05em' }}>PLATO</th>
                  <th style={{ padding: '16px 12px', fontWeight: 800 }}>KCAL</th>
                  <th style={{ padding: '16px 12px', fontWeight: 800 }}>PROTEÍNA</th>
                  <th style={{ padding: '16px 12px', fontWeight: 800 }}>CARBS</th>
                  <th style={{ padding: '16px 12px', fontWeight: 800 }}>GRASA</th>
                </tr>
              </thead>
              <tbody>
                {NUTRITION_TABLE.map((row, i) => (
                  <tr key={row.name} style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(26,26,26,0.06)', background: i % 2 === 1 ? 'rgba(231,225,214,0.4)' : 'transparent' }}>
                    <td style={{ padding: '14px 20px', fontWeight: 700, color: C.black }}>{row.name}</td>
                    <td style={{ padding: '14px 12px', textAlign: 'center', color: 'rgba(26,26,26,0.65)' }}>{row.kcal}</td>
                    <td style={{ padding: '14px 12px', textAlign: 'center', color: 'rgba(26,26,26,0.65)' }}>{row.protein}g</td>
                    <td style={{ padding: '14px 12px', textAlign: 'center', color: 'rgba(26,26,26,0.65)' }}>{row.carbs}g</td>
                    <td style={{ padding: '14px 12px', textAlign: 'center', color: 'rgba(26,26,26,0.65)' }}>{row.fat}g</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </section>
      </>
      )}

      {activeView === 'modo' && (
      <>
      {/* ============ EXPERIENCIA MODO ============ */}
      <section id="experiencia" style={{ padding: '90px 48px', maxWidth: 1400, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, color: C.green, margin: 0 }}>EXPERIENCIA MODO</h2>
            <p style={{ fontSize: 16, color: 'rgba(26,26,26,0.55)', marginTop: 12 }}>Un espacio pensado para ti. Natural, cálido y lleno de energía.</p>
          </div>
        </Reveal>
        <div className="experience-grid">
          <Reveal delay={0} className="exp-hero">
            <PhotoBlock
              gradient={restaurantPhoto}
              style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 36 }}
              onClick={() => setLightboxImage('/images/burrito-1.jpg')}
            >
              <div style={{ color: C.lime, fontSize: 13, fontWeight: 800, letterSpacing: '0.18em', marginBottom: 10 }}>NUESTROS LOCALES</div>
              <h3 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 900, color: '#fff', margin: 0, marginBottom: 12, maxWidth: 380, lineHeight: 1.25 }}>
                Espacios cálidos, naturales y pensados para quedarte
              </h3>
              <p style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.75)', maxWidth: 380, lineHeight: 1.6, marginBottom: 22 }}>
                Madera, plantas y luz natural. Cada local MODO está diseñado para que comer bien también se sienta bien.
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); goTo('locales'); }}
                style={{ alignSelf: 'flex-start', background: C.lime, color: C.greenDark, fontWeight: 800, fontSize: 13, letterSpacing: '0.06em', padding: '14px 28px', borderRadius: 999, border: 'none', cursor: 'pointer' }}
              >
                ENCUENTRA TU MODO
              </button>
            </PhotoBlock>
          </Reveal>

          <Reveal delay={80} className="exp-cell">
            <div style={{ height: '100%', borderRadius: 20, background: `linear-gradient(135deg, ${C.green}, ${C.greenDark})`, padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.lime }}>
                <IconClock />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 6 }}>Listo en minutos</div>
                <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, margin: 0 }}>Tu bowl, preparado al momento, justo como lo pediste.</p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={160} className="exp-cell">
            <div className="exp-photo" style={{ position: 'relative', height: '100%', borderRadius: 20, overflow: 'hidden' }}>
              <PhotoBlock gradient="url('/images/burrito-2.jpg') center/cover no-repeat" style={{ height: '100%', borderRadius: 0 }} onClick={() => setLightboxImage('/images/burrito-2.jpg')} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '36px 20px 16px', background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.6))', pointerEvents: 'none' }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Ambiente cálido</span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={240} className="exp-cell">
            <div className="exp-photo" style={{ position: 'relative', height: '100%', borderRadius: 20, overflow: 'hidden' }}>
              <PhotoBlock gradient="url('/images/tacos.jpg') center/cover no-repeat" style={{ height: '100%', borderRadius: 0 }} onClick={() => setLightboxImage('/images/tacos.jpg')} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '36px 20px 16px', background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.6))', pointerEvents: 'none' }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Ingredientes frescos a la vista</span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={320} className="exp-cell">
            <div style={{ height: '100%', borderRadius: 20, background: C.lime, padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(20,40,32,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.greenDark }}>
                <IconLeaf />
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 900, color: C.greenDark, marginBottom: 4 }}>+40</div>
                <p style={{ fontSize: 13.5, color: 'rgba(20,40,32,0.7)', lineHeight: 1.5, margin: 0, fontWeight: 700 }}>Locales en todo el país, cada uno con su propio sabor local.</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ UGC / MODO EN TU FEED ============ */}
      <section style={{ padding: '90px 48px', maxWidth: 1400, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, color: C.green, margin: 0 }}>MODO EN TU FEED</h2>
            <p style={{ fontSize: 16, color: 'rgba(26,26,26,0.55)', marginTop: 12 }}>Comparte tu bowl con <strong>#MiModo</strong> y aparece aquí.</p>
          </div>
        </Reveal>
        <div className="ugc-grid">
          {UGC_POSTS.map((post, i) => (
            <Reveal key={post.handle} delay={i * 60}>
              <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden' }}>
                <PhotoBlock gradient={post.gradient} style={{ aspectRatio: '1 / 1', borderRadius: 0 }} onClick={() => setLightboxImage(extractPhotoUrl(post.gradient))} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 14px 12px', background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.55))' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{post.handle}</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ TESTIMONIOS ============ */}
      <section style={{ background: C.greenDark, padding: '90px 48px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <Reveal>
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 36px)', fontWeight: 900, color: '#fff', textAlign: 'center', marginBottom: 48 }}>
              LO QUE DICEN NUESTROS MODO LOVERS
            </h2>
          </Reveal>
          <div className="testimonials-grid">
            {TESTIMONIALS.map((t, i) => (
              <TestimonialCard key={t.name} text={t.text} name={t.name} delay={i * 100} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 36 }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i === 0 ? C.lime : 'rgba(255,255,255,0.25)' }} />
            ))}
          </div>
        </div>
      </section>
      </>
      )}

      {activeView === 'app' && (
      <>
      {/* ============ APP ============ */}
      <section id="app" style={{ padding: '100px 48px', maxWidth: 1400, margin: '0 auto' }}>
        <div className="two-col" style={{ display: 'flex', gap: 64, alignItems: 'center' }}>
          <Reveal className="two-col-text">
            <div style={{ maxWidth: 460 }}>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 900, color: C.green, margin: 0, lineHeight: 1.2 }}>
                TU MODO,<br />SIEMPRE CONTIGO
              </h2>
              <p style={{ fontSize: 16, color: 'rgba(26,26,26,0.6)', marginTop: 18, marginBottom: 26, lineHeight: 1.6 }}>
                Descarga nuestra app y lleva tu estilo de vida saludable a otro nivel.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
                {[
                  { label: 'Pide rápido y fácil', icon: <IconClock /> },
                  { label: 'Acumula puntos', icon: <IconStar /> },
                  { label: 'Descuentos exclusivos', icon: <IconTag /> },
                  { label: 'Historial de pedidos', icon: <IconHistory /> },
                  { label: 'Información nutricional', icon: <IconChart /> },
                ].map((f) => (
                  <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 15, fontWeight: 600, color: C.black }}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', background: 'rgba(168,198,58,0.18)', color: C.green, flexShrink: 0 }}>
                      {f.icon}
                    </span>
                    {f.label}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ background: C.black, color: '#fff', borderRadius: 12, padding: '10px 20px', fontSize: 12, fontWeight: 700, lineHeight: 1.3 }}>
                  <div style={{ opacity: 0.7, fontSize: 10 }}>Download on the</div>App Store
                </div>
                <div style={{ background: C.black, color: '#fff', borderRadius: 12, padding: '10px 20px', fontSize: 12, fontWeight: 700, lineHeight: 1.3 }}>
                  <div style={{ opacity: 0.7, fontSize: 10 }}>GET IT ON</div>Google Play
                </div>
              </div>
            </div>
          </Reveal>
          <Reveal delay={120} className="two-col-photo">
            <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
              <PhoneFrame>
                <div style={{ position: 'absolute', inset: 0, background: bowlPhoto }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(20,40,32,0.55), rgba(20,40,32,0.85))' }} />
                <div style={{ position: 'relative', zIndex: 1, padding: '46px 20px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
                  <div style={{ color: C.lime, fontWeight: 900, fontSize: 14, letterSpacing: '0.1em' }}>MODO</div>
                  <div style={{ marginTop: 'auto', color: '#fff', fontWeight: 900, fontSize: 26, lineHeight: 1.2 }}>
                    TU MODO.<br /><span style={{ color: C.lime }}>TU COMIDA.</span>
                  </div>
                  <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ background: C.lime, color: C.greenDark, fontWeight: 800, fontSize: 13, textAlign: 'center', padding: '12px 0', borderRadius: 999 }}>INICIAR SESIÓN</div>
                    <div style={{ border: '1px solid rgba(255,255,255,0.5)', color: '#fff', fontWeight: 800, fontSize: 13, textAlign: 'center', padding: '12px 0', borderRadius: 999 }}>CREAR CUENTA</div>
                  </div>
                </div>
              </PhoneFrame>
              <PhoneFrame>
                <div style={{ padding: '46px 18px', height: '100%', boxSizing: 'border-box', background: '#fff' }}>
                  <div style={{ fontWeight: 900, fontSize: 17, color: C.green }}>¡Hola, MODO Lover!</div>
                  <div style={{ fontSize: 12, color: 'rgba(26,26,26,0.5)', marginTop: 4, marginBottom: 16 }}>¿Qué vas a pedir hoy?</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {['Mis pedidos', 'Favoritos', 'Puntos · 1.250 pts', 'Descuentos', 'Nutrición'].map((item) => (
                      <div key={item} style={{ background: C.cream, borderRadius: 12, padding: '12px 14px', fontSize: 13, fontWeight: 700, color: C.black }}>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </PhoneFrame>
            </div>
          </Reveal>
        </div>
      </section>
      </>
      )}

      {activeView === 'locales' && (
      <>
      {/* ============ LOCALES ============ */}
      <section id="locales" style={{ padding: '90px 48px', maxWidth: 1400, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, color: C.green, margin: 0 }}>ENCUENTRA TU MODO</h2>
            <p style={{ fontSize: 16, color: 'rgba(26,26,26,0.55)', marginTop: 12 }}>Cada vez más cerca de ti.</p>
          </div>
        </Reveal>

        <Reveal delay={40}>
          <div style={{ background: C.green, borderRadius: 24, padding: '36px 24px', marginBottom: 40 }}>
            <div className="location-stats-grid">
              {LOCATION_STATS.map((s, i) => (
                <StatBlock key={s.label} value={s.value} label={s.label} delay={i * 80} />
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={60}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 24 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {['Todas', ...LOCATIONS.map((l) => l.city)].map((c) => (
                <button
                  key={c}
                  onClick={() => { setActiveCityFilter(c); if (c !== nearestCity) setNearestCity(null); }}
                  style={{
                    background: activeCityFilter === c ? C.green : 'transparent',
                    color: activeCityFilter === c ? '#fff' : C.green,
                    border: `1px solid ${activeCityFilter === c ? C.green : 'rgba(31,61,46,0.25)'}`,
                    fontWeight: 800,
                    fontSize: 12.5,
                    letterSpacing: '0.06em',
                    padding: '10px 20px',
                    borderRadius: 999,
                    cursor: 'pointer',
                    transition: 'background 0.2s ease, color 0.2s ease',
                  }}
                >
                  {c.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={findNearestCity}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'transparent',
                color: C.orange,
                border: `1px solid ${C.orange}`,
                fontWeight: 800,
                fontSize: 12.5,
                letterSpacing: '0.06em',
                padding: '10px 20px',
                borderRadius: 999,
                cursor: 'pointer',
              }}
            >
              <span style={{ width: 15, height: 15, display: 'flex' }}><IconNavigation /></span>
              {geoStatus === 'loading' ? 'BUSCANDO...' : 'LOCALES CERCA DE TI'}
            </button>
          </div>
          {geoStatus === 'error' && (
            <p style={{ fontSize: 13, color: C.orange, marginBottom: 16, marginTop: -8 }}>
              No pudimos acceder a tu ubicación. Revisa los permisos del navegador e inténtalo de nuevo.
            </p>
          )}
          {geoStatus === 'done' && nearestCity && (
            <p style={{ fontSize: 13, color: C.green, marginBottom: 16, marginTop: -8, fontWeight: 700 }}>
              <MapPinIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> Tu local más cercano es {nearestCity}.
            </p>
          )}
        </Reveal>

        <Reveal delay={80}>
          <div className="locations-map" style={{ borderRadius: 24, overflow: 'hidden', marginBottom: 48, border: '1px solid rgba(26,26,26,0.08)', height: 480, boxShadow: '0 20px 50px rgba(26,26,26,0.06)' }}>
            <iframe
              key={activeCityFilter}
              title="Mapa de locales MODO"
              src={mapEmbedSrc(activeCityFilter)}
              style={{ width: '100%', height: '100%', border: 0 }}
              loading="lazy"
            />
          </div>
        </Reveal>

        <div className="locations-grid">
          {LOCATIONS.filter((loc) => activeCityFilter === 'Todas' || loc.city === activeCityFilter).map((loc, i) => (
            <LocationCard
              key={loc.city}
              city={loc.city}
              address={loc.address}
              hours={loc.hours}
              phone={loc.phone}
              rating={loc.rating}
              gradient={loc.gradient}
              waitTime={loc.waitTime}
              tags={loc.tags}
              instagram={loc.instagram}
              whatsapp={loc.whatsapp}
              highlighted={loc.city === nearestCity}
              openHour={loc.openHour}
              closeHour={loc.closeHour}
              delay={i * 120}
              onPhotoClick={() => setLightboxImage(extractPhotoUrl(loc.gradient))}
              onOrderClick={() => goTo('menu', 'bowl')}
            />
          ))}
          {activeCityFilter === 'Todas' && (
            <Reveal delay={LOCATIONS.length * 70}>
              <div className="location-card" style={{ border: `2px dashed rgba(31,61,46,0.25)`, borderRadius: 18, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '32px 24px', gap: 14 }}>
                <div style={{ color: C.orange, fontSize: 12, fontWeight: 800, letterSpacing: '0.18em' }}>PRÓXIMAMENTE</div>
                <h4 style={{ fontSize: 22, fontWeight: 900, color: C.green, margin: 0 }}>Barranquilla</h4>
                <p style={{ fontSize: 13.5, color: 'rgba(26,26,26,0.55)', lineHeight: 1.5, margin: 0 }}>
                  Estamos preparando un nuevo local. Déjanos tu correo y te avisamos cuando abramos.
                </p>
                {comingSoonSent ? (
                  <p style={{ fontSize: 13, fontWeight: 800, color: C.green, margin: 0 }}>✓ ¡Listo! Te avisaremos pronto.</p>
                ) : (
                  <form
                    onSubmit={(e) => { e.preventDefault(); if (comingSoonEmail) setComingSoonSent(true); }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}
                  >
                    <input
                      type="email"
                      required
                      value={comingSoonEmail}
                      onChange={(e) => setComingSoonEmail(e.target.value)}
                      placeholder="tu@correo.com"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 999, border: '1px solid rgba(26,26,26,0.15)', fontSize: 13, boxSizing: 'border-box' }}
                    />
                    <button type="submit" style={{ background: C.green, color: '#fff', fontWeight: 800, fontSize: 12.5, letterSpacing: '0.06em', padding: '10px 0', borderRadius: 999, border: 'none', cursor: 'pointer' }}>
                      NOTIFÍCAME
                    </button>
                  </form>
                )}
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* ============ REFERIDOS + NEWSLETTER ============ */}
      <section style={{ padding: '90px 48px', maxWidth: 1400, margin: '0 auto' }}>
        <div className="referral-grid">
          <Reveal>
            <div style={{ background: C.green, borderRadius: 24, padding: '40px 36px', height: '100%' }}>
              <div style={{ color: C.lime, fontSize: 13, fontWeight: 800, letterSpacing: '0.18em', marginBottom: 14 }}>PROGRAMA DE REFERIDOS</div>
              <h3 style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 900, color: '#fff', margin: 0, marginBottom: 14 }}>
                Invita a un amigo. Ambos ganan $10.000.
              </h3>
              <p style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginBottom: 24, maxWidth: 420 }}>
                Comparte tu código de referido. Cuando tu amigo haga su primer pedido, ambos reciben $10.000 en saldo MODO.
              </p>
              <Link href="/verificar" style={{ background: C.lime, color: C.greenDark, fontWeight: 800, fontSize: 14, letterSpacing: '0.06em', padding: '14px 30px', borderRadius: 999, textDecoration: 'none', display: 'inline-block' }}>
                OBTENER MI CÓDIGO
              </Link>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div style={{ background: '#fff', border: '1px solid rgba(26,26,26,0.08)', borderRadius: 24, padding: '40px 36px', height: '100%' }}>
              <div style={{ color: C.orange, fontSize: 13, fontWeight: 800, letterSpacing: '0.18em', marginBottom: 14 }}>NO TE PIERDAS NADA</div>
              <h3 style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 900, color: C.black, margin: 0, marginBottom: 14 }}>
                Suscríbete y recibe 10% extra
              </h3>
              <p style={{ fontSize: 14.5, color: 'rgba(26,26,26,0.6)', lineHeight: 1.6, marginBottom: 24, maxWidth: 420 }}>
                Únete a nuestra lista y recibe novedades, recetas y un cupón adicional del 10% para tu próximo pedido.
              </p>
              {newsletterSent ? (
                <p style={{ fontSize: 14, fontWeight: 800, color: C.green }}>✓ ¡Listo! Revisa tu correo para tu cupón.</p>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newsletterEmail) setNewsletterSent(true);
                  }}
                  style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}
                >
                  <input
                    type="email"
                    required
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    style={{ flex: '1 1 200px', padding: '14px 18px', borderRadius: 999, border: '1px solid rgba(26,26,26,0.15)', fontSize: 14, outline: 'none' }}
                  />
                  <button type="submit" style={{ background: C.green, color: '#fff', fontWeight: 800, fontSize: 14, letterSpacing: '0.06em', padding: '14px 28px', borderRadius: 999, border: 'none', cursor: 'pointer' }}>
                    SUSCRIBIRME
                  </button>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      </>
      )}

      {activeView === 'app' && (
      <>
      {/* ============ FAQ ============ */}
      <section style={{ padding: '90px 48px', maxWidth: 900, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, color: C.green, margin: 0 }}>PREGUNTAS FRECUENTES</h2>
          </div>
        </Reveal>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {FAQS.map((faq, i) => {
            const open = faqOpen === i;
            return (
              <Reveal key={faq.q} delay={i * 50}>
                <div style={{ border: '1px solid rgba(26,26,26,0.1)', borderRadius: 14, overflow: 'hidden' }}>
                  <button
                    onClick={() => setFaqOpen(open ? null : i)}
                    style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}
                  >
                    <span style={{ fontSize: 15.5, fontWeight: 800, color: C.black }}>{faq.q}</span>
                    <span style={{ fontSize: 20, fontWeight: 900, color: C.green, flexShrink: 0, transform: open ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s ease' }}>+</span>
                  </button>
                  {open && (
                    <div style={{ padding: '0 24px 20px', fontSize: 14.5, color: 'rgba(26,26,26,0.6)', lineHeight: 1.6 }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section style={{ background: ctaPhoto, padding: '100px 48px' }}>
        <Reveal>
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <div style={{ color: C.lime, fontSize: 13, fontWeight: 800, letterSpacing: '0.18em', marginBottom: 14 }}>OFERTA POR TIEMPO LIMITADO</div>
            <h2 style={{ fontSize: 'clamp(28px, 4.5vw, 44px)', fontWeight: 900, color: '#fff', margin: 0, marginBottom: 16 }}>
              COME BIEN. VIVE TU MODO.
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.75)', marginBottom: 28, maxWidth: 480 }}>
              Usa el código <strong style={{ color: C.lime }}>MODO20</strong> y obtén 20% de descuento + envío gratis en tu primer pedido.
            </p>
            <Link href="/verificar" style={{ background: C.lime, color: C.greenDark, fontWeight: 800, fontSize: 14, letterSpacing: '0.06em', padding: '16px 36px', borderRadius: 999, textDecoration: 'none', display: 'inline-block' }}>
              PEDIR AHORA Y AHORRAR
            </Link>
          </div>
        </Reveal>
      </section>
      </>
      )}
      {/* ============ PROMOS ============ */}
      {activeView === 'promos' && (
      <>
      <style>{`
        @keyframes promoPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
        @keyframes countdownTick { 0%{opacity:1;transform:translateY(0)} 45%{opacity:0;transform:translateY(-8px)} 55%{opacity:0;transform:translateY(8px)} 100%{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        @keyframes floatBadge { 0%,100%{transform:translateY(0) rotate(-2deg)} 50%{transform:translateY(-6px) rotate(2deg)} }
        @keyframes scanLine { 0%{transform:translateY(-100%)} 100%{transform:translateY(400%)} }
        .promo-card-v2:hover { transform:translateY(-6px) scale(1.01); box-shadow:0 20px 60px rgba(31,61,46,0.15); }
        .promo-card-v2 { transition: transform 0.35s cubic-bezier(.16,1,.3,1), box-shadow 0.35s ease; }
        .promo-featured { animation: promoPulse 4s ease-in-out infinite; }
        .float-badge { animation: floatBadge 3s ease-in-out infinite; }
      `}</style>
      <section style={{ padding: '80px 48px', maxWidth: 1400, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(240,122,39,0.1)', border: `1px solid ${C.orange}`, borderRadius: 999, padding: '6px 18px', fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', color: C.orange, marginBottom: 16 }}><FireIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> OFERTAS ACTIVAS</div>
            <h2 style={{ fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 900, color: C.green, margin: 0, letterSpacing: '-0.02em' }}>PROMOS<br /><span style={{ color: C.orange }}>DE LA SEMANA</span></h2>
            <p style={{ fontSize: 16, color: 'rgba(26,26,26,0.5)', marginTop: 16, maxWidth: 480, margin: '16px auto 0' }}>Aprovecha antes de que se acaben — se renuevan cada lunes a las 8 am.</p>
          </div>
        </Reveal>

        {/* ── FEATURED PROMO ── */}
        <PromoHeroCard goTo={goTo} />

        {/* ── COUNTDOWN TIMER STRIP ── */}
        <PromoCountdown />

        {/* ── PROMO CARDS GRID ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 56 }}>
          {[
            { emoji: '', tag: 'BIENVENIDA', title: 'MODO20 — 20% OFF', desc: 'Tu primer pedido con 20% de descuento y envío gratis. Solo para nuevos usuarios.', color: C.orange, bg: 'linear-gradient(135deg,#FFF5EC,#FFF)', border: `2px solid ${C.orange}22`, cta: 'USAR CÓDIGO' },
            { emoji: '', tag: 'APP EXCLUSIVO', title: 'Doble puntos', desc: 'Descarga la app y gana 2× puntos en todos tus pedidos hasta el domingo.', color: C.green, bg: 'linear-gradient(135deg,#EAF2EC,#FFF)', border: '2px solid #1F3D2E22', cta: 'DESCARGAR APP' },
            { emoji: '', tag: 'LIMITADO ', title: 'Smoothie gratis', desc: 'Smoothie de mango-maracuyá gratis en pedidos superiores a $45.000.', color: '#0C7C59', bg: 'linear-gradient(135deg,#E6F5F0,#FFF)', border: '2px solid #0C7C5922', cta: 'PEDIR AHORA' },
            { emoji: '', tag: 'REFERIDOS', title: 'Invita y gana $10k', desc: 'Cada amigo que invites y pida, ambos reciben $10.000 de saldo en la app.', color: '#7B5EA7', bg: 'linear-gradient(135deg,#F4EFF9,#FFF)', border: '2px solid #7B5EA722', cta: 'OBTENER CÓDIGO' },
            { emoji: '', tag: 'VEGANO VIERNES', title: 'Bowl verde $20.000', desc: 'Todos los viernes, cualquier bowl 100% vegano a precio especial.', color: '#2E8B57', bg: 'linear-gradient(135deg,#E8F5EE,#FFF)', border: '2px solid #2E8B5722', cta: 'VER BOWLS' },
            { emoji: '', tag: 'MODO PRO', title: 'Proteína extra gratis', desc: 'Sube a MODO PRO y recibe proteína extra gratis en cada pedido siempre.', color: C.green, bg: 'linear-gradient(135deg,#EAF2EC,#FFF)', border: '2px solid #1F3D2E22', cta: 'SER MODO PRO' },
          ].map((p, i) => (
            <Reveal key={p.title} delay={i * 60}>
              <div className="promo-card-v2" style={{ background: p.bg, border: p.border, borderRadius: 22, padding: '32px 28px 26px', display: 'flex', flexDirection: 'column', gap: 14, height: '100%', cursor: 'pointer' }}>
                <div style={{ fontSize: 44, lineHeight: 1 }}>{p.emoji}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', background: `${p.color}18`, color: p.color, fontSize: 10, fontWeight: 900, letterSpacing: '0.14em', padding: '4px 14px', borderRadius: 999, alignSelf: 'flex-start' }}>{p.tag}</div>
                <h4 style={{ fontSize: 18, fontWeight: 900, color: C.black, margin: 0, lineHeight: 1.25 }}>{p.title}</h4>
                <p style={{ fontSize: 13.5, color: 'rgba(26,26,26,0.55)', lineHeight: 1.6, margin: 0, flex: 1 }}>{p.desc}</p>
                <button onClick={() => goTo('menu')} style={{ marginTop: 4, background: p.color, color: '#fff', fontWeight: 800, fontSize: 12, letterSpacing: '0.08em', padding: '12px 22px', borderRadius: 999, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}>{p.cta} <span style={{ opacity: 0.7 }}>→</span></button>
              </div>
            </Reveal>
          ))}
        </div>

        {/* ── SAVINGS VISUAL ── */}
        <Reveal delay={60}>
          <div style={{ background: C.green, borderRadius: 24, padding: '48px 56px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, marginBottom: 56, overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 80% 50%, rgba(168,198,58,0.15) 0%, transparent 60%)' }} />
            {[
              { value: '$2.3M', label: 'Ahorrados por la comunidad este mes', icon: '' },
              { value: '8.400', label: 'Promos canjeadas esta semana', icon: '' },
              { value: '4.2×', label: 'Pedidos promedio por cliente activo', icon: '' },
            ].map((stat, i) => (
              <div key={stat.label} style={{ textAlign: 'center', padding: '24px 32px', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.1)' : 'none', position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{stat.icon}</div>
                <div style={{ fontSize: 'clamp(28px, 3vw, 42px)', fontWeight: 900, color: C.lime, letterSpacing: '-0.02em', lineHeight: 1 }}>{stat.value}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 8, maxWidth: 160, margin: '8px auto 0' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* ── NEWSLETTER ── */}
        <Reveal delay={80}>
          <div style={{ background: `linear-gradient(135deg, ${C.greenDark} 0%, #0B1F16 100%)`, borderRadius: 24, padding: '44px 56px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 32, flexWrap: 'wrap', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: -60, bottom: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(168,198,58,0.07)' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.14em', color: C.lime, marginBottom: 10 }}><EnvelopeOpenIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> NEWSLETTER MODO</div>
              <h3 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: 0, marginBottom: 8 }}>Promos antes que nadie</h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', margin: 0 }}>Cada lunes a las 8 am, las nuevas ofertas directo a tu correo.</p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexShrink: 0, position: 'relative', zIndex: 1 }}>
              <input type="email" placeholder="tu@correo.com" style={{ padding: '13px 20px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.07)', color: '#fff', fontSize: 14, outline: 'none', minWidth: 240, backdropFilter: 'blur(8px)' }} />
              <button style={{ background: C.lime, color: C.greenDark, fontWeight: 900, fontSize: 12, letterSpacing: '0.1em', padding: '13px 28px', borderRadius: 999, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>SUSCRIBIRME</button>
            </div>
          </div>
        </Reveal>
      </section>
      </>
      )}

      {/* ============ COMUNIDAD ============ */}
      {activeView === 'comunidad' && (
      <>
      <style>{`
        @keyframes liveCount { 0%{transform:scale(1)} 50%{transform:scale(1.08)} 100%{transform:scale(1)} }
        @keyframes slideInLeft { from{opacity:0;transform:translateX(-24px)} to{opacity:1;transform:translateX(0)} }
        @keyframes marqueeScroll { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        .ugc-card-v2:hover .ugc-overlay { opacity:1 !important; }
        .ugc-card-v2:hover { transform:scale(1.02); }
        .ugc-card-v2 { transition:transform 0.3s cubic-bezier(.16,1,.3,1); }
        .testimonial-card:hover { transform:translateY(-4px); box-shadow:0 16px 48px rgba(31,61,46,0.12); }
        .testimonial-card { transition:transform 0.3s ease, box-shadow 0.3s ease; }
        .stat-live { animation:liveCount 2s ease-in-out infinite; }
      `}</style>
      {/* ── HERO BANNER ── */}
      <div style={{ background: `linear-gradient(160deg, ${C.greenDark} 0%, ${C.green} 55%, #2D6A4F 100%)`, padding: '80px 48px 64px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 15% 80%, rgba(168,198,58,0.18) 0%, transparent 45%), radial-gradient(circle at 85% 20%, rgba(240,122,39,0.1) 0%, transparent 40%)' }} />
        {/* Decorative circles */}
        <div style={{ position: 'absolute', right: 80, top: -80, width: 400, height: 400, borderRadius: '50%', border: '1px solid rgba(168,198,58,0.12)' }} />
        <div style={{ position: 'absolute', right: 140, top: -20, width: 240, height: 240, borderRadius: '50%', border: '1px solid rgba(168,198,58,0.1)' }} />
        <div style={{ maxWidth: 1400, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <Reveal>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(168,198,58,0.15)', border: '1px solid rgba(168,198,58,0.3)', borderRadius: 999, padding: '6px 18px', fontSize: 11, fontWeight: 900, letterSpacing: '0.14em', color: C.lime, marginBottom: 20 }}>
              <span className="stat-live" style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: C.lime }} />
              50.234 MODISTAS ACTIVOS
            </div>
            <h1 style={{ fontSize: 'clamp(40px, 6vw, 80px)', fontWeight: 900, color: '#fff', margin: 0, lineHeight: 1.05, letterSpacing: '-0.03em' }}>LA COMUNIDAD<br /><span style={{ color: C.lime }}>MÁS SANA</span><br />DE COLOMBIA</h1>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.65)', marginTop: 20, maxWidth: 520, lineHeight: 1.65 }}>Más de 50 mil personas eligieron comer mejor sin sacrificar el sabor. Fotos reales, historias reales, resultados reales.</p>
          </Reveal>
          {/* Live stats row */}
          <Reveal delay={100}>
            <div style={{ display: 'flex', gap: 48, marginTop: 48, flexWrap: 'wrap' }}>
              {[
                { val: '50.234', label: 'Miembros', icon: '' },
                { val: '4.8★', label: 'Calificación promedio', icon: '' },
                { val: '380K', label: 'Posts con #MiModoReal', icon: '' },
                { val: '12', label: 'Ciudades de Colombia', icon: '' },
              ].map((s) => (
                <div key={s.label} style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 700, letterSpacing: '0.1em' }}>{s.icon} {s.label.toUpperCase()}</span>
                  <span style={{ fontSize: 28, fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>{s.val}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>

      <section style={{ padding: '72px 48px', maxWidth: 1400, margin: '0 auto' }}>
        {/* ── UGC MASONRY GRID ── */}
        <Reveal>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.16em', color: C.lime, marginBottom: 8 }}>#MIMODOREAL</div>
              <h2 style={{ fontSize: 'clamp(26px, 3vw, 40px)', fontWeight: 900, color: C.green, margin: 0 }}>LA COMUNIDAD EN FOTOS</h2>
            </div>
            <button style={{ background: C.green, color: '#fff', fontWeight: 800, fontSize: 12, letterSpacing: '0.08em', padding: '12px 24px', borderRadius: 999, border: 'none', cursor: 'pointer' }}>VER INSTAGRAM →</button>
          </div>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'auto', gap: 16, marginBottom: 72 }}>
          {UGC_POSTS.map((post, i) => (
            <Reveal key={post.handle} delay={i * 50}>
              <div
                className="ugc-card-v2"
                style={{ borderRadius: 18, overflow: 'hidden', aspectRatio: i === 0 || i === 3 ? '3/4' : '1/1', position: 'relative', cursor: 'pointer', gridRow: i === 0 || i === 3 ? 'span 2' : 'span 1' }}
                onClick={() => setLightboxImage(extractPhotoUrl(post.gradient))}
              >
                <div style={{ position: 'absolute', inset: 0, background: post.gradient }} />
                <div className="ugc-overlay" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.75) 100%)', opacity: 0.6, transition: 'opacity 0.3s ease' }} />
                <div style={{ position: 'absolute', top: 12, left: 12 }}>
                  <div style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)', borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 800, color: '#fff' }}>{post.handle}</div>
                </div>
                <div style={{ position: 'absolute', bottom: 14, left: 14, right: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', borderRadius: 999, padding: '4px 10px', fontSize: 11, color: '#fff', fontWeight: 700 }}><HeartIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> {120 + i * 37}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', borderRadius: 999, padding: '4px 10px', fontSize: 11, color: '#fff', fontWeight: 700 }}><ChatBubbleLeftRightIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> {8 + i * 5}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* ── TESTIMONIALS MASONRY ── */}
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.16em', color: C.orange, marginBottom: 10 }}>★★★★★ 4.8 DE 5</div>
            <h2 style={{ fontSize: 'clamp(26px, 3vw, 42px)', fontWeight: 900, color: C.green, margin: 0 }}>LO QUE DICE<br />LA COMUNIDAD</h2>
          </div>
        </Reveal>
        <div style={{ columns: 3, gap: 20, marginBottom: 72 }}>
          {[...TESTIMONIALS,
            { text: 'Me cambió la forma de ver la comida saludable. Ya no siento que me estoy privando de nada.', name: 'Laura V.', city: 'Bogotá', stars: 5 },
            { text: 'El bowl builder es adictivo. Llevo 3 semanas armando uno diferente cada día y todos quedan deliciosos.', name: 'Felipe C.', city: 'Medellín', stars: 5 },
            { text: 'Sé exactamente lo que como. Sin letra pequeña, sin aceites raros. Solo ingredientes de verdad.', name: 'Natalia H.', city: 'Cali', stars: 5 },
            { text: 'El servicio es increíble y los bowls llegan frescos siempre. 10 de 10.', name: 'Andrés M.', city: 'Cartagena', stars: 5 },
            { text: 'Ideal para mi dieta de entrenamiento. Alta proteína, bajo en calorías vacías.', name: 'Valeria R.', city: 'Bogotá', stars: 5 },
          ].map((t, i) => (
            <Reveal key={`${t.name}-${i}`} delay={i * 40}>
              <div className="testimonial-card" style={{ background: i % 3 === 0 ? C.green : i % 3 === 1 ? '#fff' : C.cream, borderRadius: 20, padding: '28px', marginBottom: 20, breakInside: 'avoid', display: 'block' }}>
                <div style={{ color: C.lime, fontSize: 16, letterSpacing: 2, marginBottom: 14 }}>{'★'.repeat((t as {stars?: number}).stars ?? 5)}</div>
                <p style={{ fontSize: 14.5, color: i % 3 === 0 ? 'rgba(255,255,255,0.85)' : 'rgba(26,26,26,0.75)', lineHeight: 1.65, margin: 0, marginBottom: 18, fontStyle: 'italic' }}>"{t.text}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: i % 3 === 0 ? 'rgba(255,255,255,0.15)' : `${C.lime}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: i % 3 === 0 ? '#fff' : C.green }}>
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: i % 3 === 0 ? '#fff' : C.green }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: i % 3 === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(26,26,26,0.4)', fontWeight: 600 }}>{'city' in t ? (t as {city?:string}).city : 'Colombia'}</div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* ── CHALLENGE CARD ── */}
        <Reveal delay={60}>
          <div style={{ background: `linear-gradient(135deg, ${C.green} 0%, #0B4D2F 100%)`, borderRadius: 28, padding: '64px 72px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 48, alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: -100, top: -100, width: 500, height: 500, borderRadius: '50%', border: '1px solid rgba(168,198,58,0.1)' }} />
            <div style={{ position: 'absolute', right: -30, top: -30, width: 300, height: 300, borderRadius: '50%', border: '1px solid rgba(168,198,58,0.07)' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(168,198,58,0.15)', border: '1px solid rgba(168,198,58,0.25)', borderRadius: 999, padding: '6px 18px', fontSize: 11, fontWeight: 900, letterSpacing: '0.14em', color: C.lime, marginBottom: 24 }}><CameraIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> RETO SEMANAL ACTIVO</div>
              <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 48px)', fontWeight: 900, color: '#fff', margin: 0, marginBottom: 16, lineHeight: 1.1 }}>Comparte tu MODO<br /><span style={{ color: C.lime }}>y gana $30.000</span></h2>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', margin: 0, marginBottom: 32, maxWidth: 460, lineHeight: 1.65 }}>Sube una foto de tu bowl con <strong style={{ color: C.lime }}>#MiModoReal</strong>, etiqueta a @modo en Instagram y participa. Elegimos un ganador cada domingo a las 6 pm.</p>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <button style={{ background: C.lime, color: C.greenDark, fontWeight: 900, fontSize: 13, letterSpacing: '0.06em', padding: '15px 32px', borderRadius: 999, border: 'none', cursor: 'pointer' }}>PARTICIPAR AHORA</button>
                <button style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: 800, fontSize: 13, padding: '15px 28px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>VER GANADORES</button>
              </div>
            </div>
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 90, filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.3))' }}><CameraIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></div>
              <div style={{ background: 'rgba(168,198,58,0.2)', border: '1px solid rgba(168,198,58,0.35)', borderRadius: 16, padding: '14px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: C.lime }}>380K+</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 700, letterSpacing: '0.08em' }}>POSTS CREADOS</div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
      </>
      )}

      {/* ============ PUNTOS ============ */}
      {activeView === 'puntos' && (
      <>
      <style>{`
        @keyframes pointsFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes progressFill { from{width:0} to{width:var(--target-w)} }
        @keyframes orbPulse { 0%,100%{opacity:0.4;transform:scale(1)} 50%{opacity:0.7;transform:scale(1.08)} }
        .tier-card:hover { transform:translateY(-8px) scale(1.01); }
        .tier-card { transition:transform 0.35s cubic-bezier(.16,1,.3,1), box-shadow 0.35s ease; }
        .reward-row:hover { background:rgba(168,198,58,0.08) !important; }
        .reward-row { transition:background 0.2s ease; }
        .pts-orb { animation:orbPulse 3s ease-in-out infinite; }
      `}</style>

      {/* ── HERO ── */}
      <div style={{ background: `linear-gradient(145deg, ${C.greenDark} 0%, #0B3D24 50%, ${C.green} 100%)`, padding: '80px 48px 72px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(ellipse at 10% 90%, rgba(168,198,58,0.2) 0%, transparent 50%), radial-gradient(ellipse at 90% 10%, rgba(240,122,39,0.08) 0%, transparent 45%)' }} />
        {[0,1,2,3,4].map((i) => (
          <div key={i} className="pts-orb" style={{ position: 'absolute', width: [120,80,160,60,100][i], height: [120,80,160,60,100][i], borderRadius: '50%', border: `1px solid rgba(168,198,58,${[0.15,0.1,0.08,0.12,0.06][i]})`, top: ['10%','60%','30%','75%','20%'][i], left: ['75%','85%','5%','20%','45%'][i], animationDelay: `${i * 0.6}s` }} />
        ))}
        <div style={{ maxWidth: 1400, margin: '0 auto', position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1fr auto', gap: 48, alignItems: 'center' }}>
          <Reveal>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.16em', color: C.lime, marginBottom: 16 }}><BoltIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> PROGRAMA DE LEALTAD</div>
            <h1 style={{ fontSize: 'clamp(40px, 5.5vw, 72px)', fontWeight: 900, color: '#fff', margin: 0, lineHeight: 1.05, letterSpacing: '-0.03em' }}>TUS<br /><span style={{ color: C.lime }}>PUNTOS</span><br />MODO</h1>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', marginTop: 20, maxWidth: 460, lineHeight: 1.65 }}>Cada peso que gastas en MODO se convierte en puntos. Acumula, sube de nivel y canjea por recompensas reales.</p>
            <div style={{ display: 'flex', gap: 14, marginTop: 32 }}>
              <button onClick={() => goTo('app')} style={{ background: C.lime, color: C.greenDark, fontWeight: 900, fontSize: 13, letterSpacing: '0.06em', padding: '14px 32px', borderRadius: 999, border: 'none', cursor: 'pointer' }}>DESCARGAR APP</button>
              <button style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: 800, fontSize: 13, padding: '14px 28px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>VER NIVELES ↓</button>
            </div>
          </Reveal>
          {/* Points widget */}
          <Reveal delay={120}>
            <div style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 28, padding: '36px 40px', minWidth: 280, textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>TUS PUNTOS ACTUALES</div>
              <div style={{ fontSize: 64, fontWeight: 900, color: C.lime, lineHeight: 1, animation: 'pointsFloat 4s ease-in-out infinite' }}>742</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 6 }}>MODO PRO · Nivel 2</div>
              <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.1)', marginTop: 24, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '37%', borderRadius: 999, background: `linear-gradient(90deg, ${C.lime}, #D4F147)`, transition: 'width 1.5s cubic-bezier(.16,1,.3,1)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>
                <span>500</span><span>742 pts</span><span>2.000</span>
              </div>
              <div style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(168,198,58,0.12)', borderRadius: 12, fontSize: 12, color: C.lime, fontWeight: 700 }}>
                Te faltan 1.258 pts para ELITE <StarIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" />
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      <section style={{ padding: '72px 48px', maxWidth: 1400, margin: '0 auto' }}>
        {/* ── HOW IT WORKS ── */}
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.16em', color: C.orange, marginBottom: 10 }}>FÁCIL Y AUTOMÁTICO</div>
            <h2 style={{ fontSize: 'clamp(26px, 3vw, 42px)', fontWeight: 900, color: C.green, margin: 0 }}>ASÍ FUNCIONA</h2>
          </div>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, marginBottom: 80, background: '#fff', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(26,26,26,0.08)', boxShadow: '0 4px 32px rgba(31,61,46,0.06)' }}>
          {[
            { step: '01', icon: '', title: 'Pide', desc: '$1.000 gastados = 1 punto. En la app, web o local.', color: C.orange },
            { step: '02', icon: '', title: 'Acumula', desc: 'Tus puntos aparecen en la app en segundos tras pagar.', color: C.lime },
            { step: '03', icon: '✕2', title: 'Multiplica', desc: 'Martes y app = doble de puntos. Automáticamente.', color: C.green },
            { step: '04', icon: '', title: 'Canjea', desc: 'Bowls, bebidas, descuentos y más desde la app.', color: '#7B5EA7' },
          ].map((s, i) => (
            <Reveal key={s.step} delay={i * 80}>
              <div style={{ padding: '40px 32px', borderRight: i < 3 ? '1px solid rgba(26,26,26,0.07)' : 'none', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: s.color }} />
                <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.16em', color: 'rgba(26,26,26,0.3)', marginBottom: 16 }}>PASO {s.step}</div>
                <div style={{ fontSize: 36, marginBottom: 16 }}>{s.icon}</div>
                <h4 style={{ fontSize: 20, fontWeight: 900, color: C.green, margin: 0, marginBottom: 10 }}>{s.title}</h4>
                <p style={{ fontSize: 13.5, color: 'rgba(26,26,26,0.55)', lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* ── TIER CARDS ── */}
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.16em', color: C.lime, marginBottom: 10 }}>CUANTO MÁS PIDES, MÁS GANAS</div>
            <h2 style={{ fontSize: 'clamp(26px, 3vw, 42px)', fontWeight: 900, color: C.green, margin: 0 }}>TUS NIVELES MODO</h2>
          </div>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 72 }}>
          {[
            {
              tier: 'STARTER', icon: '', pts: '0 – 499', mult: '1×',
              bg: '#fff', border: '1px solid rgba(26,26,26,0.1)', textColor: C.black, accent: C.green,
              perks: ['1 pto / $1.000 gastado', 'Bowl gratis en tu cumpleaños', 'Acceso a promos semanales', 'Historial de pedidos en app'],
            },
            {
              tier: 'PRO', icon: '', pts: '500 – 1.999', mult: '1.5×',
              bg: C.green, border: `2px solid ${C.lime}`, textColor: '#fff', accent: C.lime,
              badge: 'MÁS POPULAR',
              perks: ['1.5 pts / $1.000 gastado', 'Proteína extra siempre gratis', 'Envío gratis en todos los pedidos', 'Acceso anticipado a productos', 'Línea de atención prioritaria'],
            },
            {
              tier: 'ELITE', icon: '', pts: '2.000+', mult: '2×',
              bg: C.greenDark, border: '1px solid rgba(168,198,58,0.2)', textColor: '#fff', accent: C.lime,
              perks: ['2 pts / $1.000 gastado', 'Mesa reservada en locales', 'Degustaciones exclusivas', 'Bowl mensual de cortesía', 'Concierge personal MODO'],
            },
          ].map((tier, i) => (
            <Reveal key={tier.tier} delay={i * 80}>
              <div className="tier-card" style={{ background: tier.bg, borderRadius: 24, padding: '40px 36px', display: 'flex', flexDirection: 'column', gap: 0, border: tier.border, position: 'relative', overflow: 'hidden', height: '100%' }}>
                {tier.badge && <div style={{ position: 'absolute', top: 18, right: 18, background: C.lime, color: C.greenDark, fontSize: 9, fontWeight: 900, letterSpacing: '0.12em', padding: '4px 12px', borderRadius: 999 }}>{tier.badge}</div>}
                {/* Decorative orb */}
                <div style={{ position: 'absolute', bottom: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: `${tier.accent}10` }} />
                <div style={{ fontSize: 52, marginBottom: 20 }}>{tier.icon}</div>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.16em', color: tier.accent, marginBottom: 6 }}>{tier.pts} PTS · {tier.mult} MULTIPLICADOR</div>
                  <h3 style={{ fontSize: 28, fontWeight: 900, color: tier.textColor, margin: 0 }}>MODO {tier.tier}</h3>
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12, flex: 1, marginBottom: 28 }}>
                  {tier.perks.map((perk) => (
                    <li key={perk} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: i === 0 ? 'rgba(26,26,26,0.65)' : 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>
                      <span style={{ width: 20, height: 20, borderRadius: '50%', background: `${tier.accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: tier.accent, fontWeight: 900, flexShrink: 0, marginTop: 1 }}>✓</span>
                      {perk}
                    </li>
                  ))}
                </ul>
                <button onClick={() => goTo('app')} style={{ background: tier.accent, color: i === 0 ? C.greenDark : C.greenDark, fontWeight: 900, fontSize: 12, letterSpacing: '0.08em', padding: '13px 28px', borderRadius: 999, border: 'none', cursor: 'pointer', alignSelf: 'flex-start' }}>
                  {i === 0 ? 'EMPEZAR' : i === 1 ? 'SUBIR A PRO' : 'SER ELITE'} →
                </button>
              </div>
            </Reveal>
          ))}
        </div>

        {/* ── REWARDS TABLE ── */}
        <Reveal>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.16em', color: C.orange, marginBottom: 8 }}>CANJEA CUANDO QUIERAS</div>
              <h2 style={{ fontSize: 'clamp(24px, 2.5vw, 36px)', fontWeight: 900, color: C.green, margin: 0 }}>TABLA DE RECOMPENSAS</h2>
            </div>
            <span style={{ fontSize: 13, color: 'rgba(26,26,26,0.4)', fontWeight: 600 }}>Sin fecha de vencimiento</span>
          </div>
        </Reveal>
        <Reveal delay={60}>
          <div style={{ background: '#fff', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(26,26,26,0.08)', boxShadow: '0 4px 32px rgba(31,61,46,0.06)', marginBottom: 64 }}>
            {[
              { pts: 100, reward: 'Bebida gratis', detail: 'Smoothie o limonada natural de cualquier sabor', emoji: '', tier: 'STARTER' },
              { pts: 250, reward: 'Topping premium', detail: 'Aguacate, salmón ahumado o queso feta', emoji: '', tier: 'STARTER' },
              { pts: 500, reward: '$10.000 de descuento', detail: 'Aplica en cualquier pedido, sin mínimo', emoji: '', tier: 'PRO' },
              { pts: 800, reward: 'Bowl completo gratis', detail: 'Cualquier combinación del menú sin costo', emoji: '', tier: 'PRO' },
              { pts: 1200, reward: 'Combo para 2 personas', detail: '2 bowls + 2 bebidas, ideal para compartir', emoji: '', tier: 'ELITE' },
              { pts: 2000, reward: 'Caja sorpresa MODO', detail: 'Productos premium, merch exclusivo y $30.000 en saldo', emoji: '', tier: 'ELITE' },
            ].map((r, i) => (
              <div key={r.reward} className="reward-row" style={{ display: 'grid', gridTemplateColumns: '56px 1fr auto auto', gap: 20, alignItems: 'center', padding: '20px 32px', borderBottom: i < 5 ? '1px solid rgba(26,26,26,0.05)' : 'none' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: `rgba(168,198,58,0.1)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{r.emoji}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.black }}>{r.reward}</div>
                  <div style={{ fontSize: 13, color: 'rgba(26,26,26,0.45)', marginTop: 3 }}>{r.detail}</div>
                </div>
                <div style={{ background: r.tier === 'STARTER' ? 'rgba(26,26,26,0.06)' : r.tier === 'PRO' ? `${C.green}15` : `${C.lime}20`, color: r.tier === 'STARTER' ? 'rgba(26,26,26,0.5)' : r.tier === 'PRO' ? C.green : C.greenDark, fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', padding: '4px 12px', borderRadius: 999 }}>{r.tier}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, background: C.green, borderRadius: 12, padding: '8px 18px', flexShrink: 0 }}>
                  <span style={{ fontSize: 18, fontWeight: 900, color: C.lime }}>{r.pts}</span>
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em' }}>PTS</span>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* ── APP CTA ── */}
        <Reveal delay={80}>
          <div style={{ background: C.lime, borderRadius: 28, padding: '56px 64px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 48, alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: -80, bottom: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(31,61,46,0.06)' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.16em', color: C.green, opacity: 0.7, marginBottom: 12 }}><SparklesIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> REGALO DE BIENVENIDA</div>
              <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 48px)', fontWeight: 900, color: C.greenDark, margin: 0, marginBottom: 14, lineHeight: 1.1 }}>Empieza con<br /><span style={{ fontSize: '1.15em' }}>200 puntos gratis</span></h2>
              <p style={{ fontSize: 15, color: C.green, margin: 0, maxWidth: 460, lineHeight: 1.65 }}>Descarga la app, crea tu cuenta y tu primer pedido te da <strong>200 puntos de bienvenida</strong> automáticamente. Suficientes para una bebida gratis.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', zIndex: 1, flexShrink: 0 }}>
              <div style={{ background: C.greenDark, color: '#fff', borderRadius: 16, padding: '14px 28px', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ fontSize: 10, opacity: 0.55, letterSpacing: '0.06em', marginBottom: 2 }}>Download on the</div>
                <div style={{ fontSize: 16, fontWeight: 900 }}>App Store</div>
              </div>
              <div style={{ background: C.greenDark, color: '#fff', borderRadius: 16, padding: '14px 28px', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ fontSize: 10, opacity: 0.55, letterSpacing: '0.06em', marginBottom: 2 }}>GET IT ON</div>
                <div style={{ fontSize: 16, fontWeight: 900 }}>Google Play</div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
      </>
      )}

      {/* ============ EQUIPO / ÚNETE ============ */}
      {activeView === 'equipo' && (
      <>
      {/* Hero */}
      <div style={{ background: `linear-gradient(150deg, ${C.greenDark} 0%, #0B3D24 55%, ${C.green} 100%)`, padding: '80px 48px 72px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 15% 85%, rgba(168,198,58,0.15) 0%, transparent 45%), radial-gradient(circle at 85% 15%, rgba(240,122,39,0.07) 0%, transparent 40%)' }} />
        <div style={{ position: 'absolute', right: -80, top: -80, width: 400, height: 400, borderRadius: '50%', border: '1px solid rgba(168,198,58,0.08)' }} />
        <div style={{ position: 'absolute', right: -20, top: -20, width: 220, height: 220, borderRadius: '50%', border: '1px solid rgba(168,198,58,0.06)' }} />
        <div style={{ maxWidth: 1400, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <Reveal>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(168,198,58,0.12)', border: '1px solid rgba(168,198,58,0.25)', borderRadius: 999, padding: '6px 18px', fontSize: 11, fontWeight: 900, letterSpacing: '0.14em', color: C.lime, marginBottom: 20 }}>
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#4ADE80', animation: 'promoPulse 2s ease-in-out infinite' }} />
              5 VACANTES ABIERTAS
            </div>
            <h1 style={{ fontSize: 'clamp(40px, 6vw, 76px)', fontWeight: 900, color: '#fff', margin: 0, lineHeight: 1.05, letterSpacing: '-0.03em' }}>
              ÚNETE AL<br /><span style={{ color: C.lime }}>EQUIPO MODO</span>
            </h1>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.6)', marginTop: 20, maxWidth: 540, lineHeight: 1.65 }}>
              Buscamos personas apasionadas por la comida real y el buen servicio. Sin importar tu experiencia, si tienes actitud, aquí tienes un lugar.
            </p>
          </Reveal>
          {/* Vacantes chips */}
          <Reveal delay={80}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 32 }}>
              {[
                { role: 'Chef de línea', dept: 'Cocina', icon: '‍🍳' },
                { role: 'Cajero/a', dept: 'Servicio', icon: '' },
                { role: 'Repartidor', dept: 'Logística', icon: '' },
                { role: 'Community Manager', dept: 'Marketing', icon: '' },
                { role: 'Asesor de punto de venta', dept: 'Ventas', icon: '' },
              ].map((v) => (
                <div key={v.role} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{v.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{v.role}</div>
                    <div style={{ fontSize: 10, color: C.lime, fontWeight: 700, letterSpacing: '0.08em' }}>{v.dept}</div>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>

      <section style={{ padding: '72px 48px', maxWidth: 1400, margin: '0 auto' }}>
        {/* Perks row */}
        <Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 64 }}>
            {[
              { icon: '', title: 'Comida gratis', desc: 'Bowl de cortesía en cada turno de trabajo.' },
              { icon: '', title: 'Crece rápido', desc: 'Ascensos internos cada 6 meses para quienes destacan.' },
              { icon: '', title: 'Equipo joven', desc: 'Ambiente sano, diverso y con propósito.' },
              { icon: '', title: 'Capacitación', desc: 'Entrenamiento pagado desde el primer día.' },
            ].map((p, i) => (
              <Reveal key={p.title} delay={i * 60}>
                <div style={{ background: '#fff', border: '1px solid rgba(26,26,26,0.07)', borderRadius: 18, padding: '28px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: 38, marginBottom: 12 }}>{p.icon}</div>
                  <h4 style={{ fontSize: 16, fontWeight: 900, color: C.green, margin: 0, marginBottom: 8 }}>{p.title}</h4>
                  <p style={{ fontSize: 13, color: 'rgba(26,26,26,0.55)', lineHeight: 1.55, margin: 0 }}>{p.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>

        {/* Main grid: form + franquicias */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* CV Form card */}
          <Reveal delay={60}>
            <div style={{ background: C.greenDark, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 28, padding: '44px 44px', height: '100%', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', bottom: -60, right: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(168,198,58,0.06)' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(168,198,58,0.12)', border: '1px solid rgba(168,198,58,0.22)', borderRadius: 999, padding: '5px 14px', fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', color: C.lime, marginBottom: 20 }}><ClipboardDocumentListIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> ENVÍA TU CV</div>
                <h3 style={{ fontSize: 'clamp(20px, 2.5vw, 28px)', fontWeight: 900, color: '#fff', margin: 0, marginBottom: 10, lineHeight: 1.2 }}>
                  Tu próxima oportunidad<br />empieza aquí
                </h3>
                <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, marginBottom: 28 }}>
                  Cuéntanos quién eres y adjunta tu hoja de vida. Te contactamos en menos de 48 horas.
                </p>
                <JobApplicationForm />
              </div>
            </div>
          </Reveal>

          {/* Right column */}
          <Reveal delay={100}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
              {/* Stats */}
              <div style={{ background: C.green, borderRadius: 20, padding: '28px 32px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0 }}>
                {[{ val: '120+', label: 'Colaboradores' }, { val: '4.9★', label: 'Clima laboral' }, { val: '92%', label: 'Retención' }].map((s, i) => (
                  <div key={s.label} style={{ textAlign: 'center', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.12)' : 'none' }}>
                    <div style={{ fontSize: 26, fontWeight: 900, color: C.lime }}>{s.val}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 700, marginTop: 4, letterSpacing: '0.06em' }}>{s.label.toUpperCase()}</div>
                  </div>
                ))}
              </div>
              {/* Testimonial empleado */}
              <div style={{ background: C.cream, borderRadius: 20, padding: '28px 32px', flex: 1 }}>
                <div style={{ fontSize: 28, marginBottom: 16 }}><ChatBubbleLeftRightIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></div>
                <p style={{ fontSize: 15, color: 'rgba(26,26,26,0.75)', lineHeight: 1.7, margin: 0, fontStyle: 'italic', marginBottom: 20 }}>
                  "Entré como cajera hace un año y ya soy supervisora de turno. En MODO te ven crecer y te impulsan a hacerlo más rápido."
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: '#fff' }}>S</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: C.green }}>Sara M.</div>
                    <div style={{ fontSize: 11, color: 'rgba(26,26,26,0.45)', fontWeight: 600 }}>Supervisora de turno · Bogotá</div>
                  </div>
                </div>
              </div>
              {/* Franquicias mini card */}
              <div style={{ background: C.lime, borderRadius: 20, padding: '28px 32px' }}>
                <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.14em', color: C.greenDark, opacity: 0.7, marginBottom: 10 }}><BuildingStorefrontIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> FRANQUICIAS</div>
                <h4 style={{ fontSize: 20, fontWeight: 900, color: C.greenDark, margin: 0, marginBottom: 10 }}>¿Quieres abrir un MODO?</h4>
                <p style={{ fontSize: 13.5, color: 'rgba(20,40,32,0.65)', lineHeight: 1.6, margin: 0, marginBottom: 20 }}>Lleva el modelo a tu ciudad. ROI en 18 meses, soporte completo desde el día 1.</p>
                <button style={{ background: C.greenDark, color: '#fff', fontWeight: 900, fontSize: 12, letterSpacing: '0.06em', padding: '12px 24px', borderRadius: 999, border: 'none', cursor: 'pointer' }}>QUIERO SER FRANQUICIADO →</button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
      </>
      )}

      </main>

      {/* ============ FOOTER ============ */}
      <footer style={{ background: C.greenDark, color: '#fff', padding: '80px 48px 32px' }}>
        <div className="footer-grid" style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '0.08em', color: C.lime, marginBottom: 16 }}>MODO</div>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, maxWidth: 240 }}>
              Comida saludable, rápida y personalizada para tu mejor versión.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              {['IG', 'FB', 'TT'].map((s) => (
                <div key={s} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>
                  {s}
                </div>
              ))}
            </div>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title} id={col.title === 'LOCALES' ? 'footer-locales' : undefined}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', color: C.lime, marginBottom: 18 }}>{col.title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {col.links.map((l) => (
                  <span key={l} style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)' }}>{l}</span>
                ))}
              </div>
            </div>
          ))}
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', color: C.lime, marginBottom: 18 }}>CONTACTO</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14, color: 'rgba(255,255,255,0.65)' }}>
              <span>hola@modo.com</span>
              <span>+57 300 123 4567</span>
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 1400, margin: '0 auto', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 48, paddingTop: 24, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
          <span>© 2026 MODO. Todos los derechos reservados.</span>
          <div style={{ display: 'flex', gap: 24 }}>
            <Link href="/cajero" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Acceso cajero</Link>
            <Link href="/admin/login" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Acceso staff</Link>
            <Link href="/privacidad" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Privacidad</Link>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
        @keyframes flashBadge {
          0% { opacity: 0; transform: translateY(-4px); }
          20% { opacity: 1; transform: translateY(0); }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }
        @media (hover: none), (pointer: coarse) {
          .custom-cursor-dot, .custom-cursor-ring { display: none !important; }
        }
        body:has(.custom-cursor-dot) { cursor: none !important; }
        body:has(.custom-cursor-dot) a, body:has(.custom-cursor-dot) button { cursor: none !important; }
        @keyframes scrollBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(6px); }
        }
        @keyframes chipFloat {
          from { opacity: 0; transform: translateX(24px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(200%) skewX(-15deg); }
        }
        .scroll-bounce { animation: scrollBounce 1.8s ease-in-out infinite; }
        .hero-chip { animation: chipFloat 0.5s cubic-bezier(.16,1,.3,1) both; }
        .hero-chip:hover { background: rgba(255,255,255,0.18) !important; transform: translateX(-4px); }
        .hero-chips { pointer-events: auto; }
        @media (max-width: 900px) { .hero-chips { display: none !important; } }
        .btn-shimmer::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%);
          transform: translateX(-100%) skewX(-15deg);
          animation: shimmer 2.8s ease-in-out infinite 1s;
          border-radius: 999px;
        }
        .btn-shimmer:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(240,122,39,0.45); transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .menu-order-btn:hover { background: var(--green, #1F3D2E) !important; color: #fff !important; }
        .menu-card { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        @keyframes viewEnter {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes viewLeave {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-16px); }
        }
        @keyframes floatIn {
          from { opacity: 0; transform: translateY(20px) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .floating-cta { animation: floatIn 0.35s cubic-bezier(.16,1,.3,1); transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .floating-cta:hover { transform: translateY(-3px); box-shadow: 0 16px 40px rgba(240,122,39,0.5); }
        .view-transition { animation: viewEnter 0.6s cubic-bezier(.16,1,.3,1); }
        .view-leaving { animation: viewLeave 0.22s ease forwards; }
        .nav-btn { transition: color 0.25s ease, transform 0.2s ease; }
        .nav-btn:hover { color: #fff; transform: translateY(-1px); }
        .main-nav { transition: background 0.3s ease; }
        .nav-pill { pointer-events: none; }
        .press-strip { display: flex; justify-content: center; align-items: center; gap: 56px; flex-wrap: wrap; }
        .two-col-photo, .two-col-text { flex: 1 1 0%; min-width: 0; }
        .modo-card { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .modo-card:hover { transform: translateY(-6px) scale(1.02); box-shadow: 0 20px 40px rgba(26,26,26,0.08); }
        .menu-card { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .menu-card:hover { transform: translateY(-6px) scale(1.02); box-shadow: 0 20px 40px rgba(26,26,26,0.08); }
        .location-card { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .location-card:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(26,26,26,0.08); }
        .modos-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 20px; }
        .why-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 40px; }
        .ingredients-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .experience-grid { display: grid; grid-template-columns: repeat(4, 1fr); grid-auto-rows: 240px; gap: 20px; }
        .exp-hero { grid-column: span 2; grid-row: span 2; }
        .exp-cell { grid-column: span 1; grid-row: span 1; }
        .exp-photo > div { transition: transform 0.5s cubic-bezier(.16,1,.3,1); }
        .exp-photo:hover > div { transform: scale(1.08); }
        .testimonials-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px; }
        .menu-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .locations-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
        .location-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px; }
        .ugc-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px; }
        .referral-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
        .footer-grid { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr 1fr 1fr; gap: 32px; }
        @media (max-width: 1100px) {
          .modos-grid { grid-template-columns: repeat(3, 1fr); }
          .why-grid { grid-template-columns: repeat(2, 1fr); gap: 32px; }
          .ingredients-grid { grid-template-columns: repeat(2, 1fr); }
          .experience-grid { grid-template-columns: repeat(2, 1fr); grid-auto-rows: minmax(220px, auto); }
          .exp-hero { grid-column: span 2; grid-row: span 1; min-height: 320px; }
          .testimonials-grid { grid-template-columns: 1fr; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 40px; }
          .menu-grid { grid-template-columns: repeat(2, 1fr); }
          .locations-grid { grid-template-columns: repeat(2, 1fr); }
          .location-stats-grid { grid-template-columns: repeat(2, 1fr); gap: 28px; }
          .ugc-grid { grid-template-columns: repeat(3, 1fr); }
          .referral-grid { grid-template-columns: 1fr; }
          .footer-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 700px) {
          .locations-map { height: 320px !important; }
          .modos-grid { grid-template-columns: repeat(2, 1fr); }
          .experience-grid { grid-template-columns: 1fr; grid-auto-rows: minmax(220px, auto); }
          .exp-hero { grid-column: span 1; min-height: 320px; }
          .menu-grid { grid-template-columns: 1fr; }
          .locations-grid { grid-template-columns: 1fr; }
          .ugc-grid { grid-template-columns: repeat(2, 1fr); }
          .footer-grid { grid-template-columns: repeat(2, 1fr); }
          .two-col { flex-direction: column; }
          .two-col-photo, .two-col-text { width: 100%; }
        }
        @media (max-width: 900px) {
          .main-nav { padding: 16px 24px; }
          .nav-links { display: none !important; }
          .nav-hamburger { display: flex !important; }
        }
        @media (max-width: 480px) {
          .main-nav > div:first-child { font-size: 18px !important; }
          .main-nav a[href="/verificar"] { padding: 9px 16px !important; font-size: 11px !important; }
        }
      `}</style>

      {/* ============ FLOATING "PEDIR AHORA" CTA ============ */}
      {showFloatingCta && (
        <Link
          href="/verificar"
          className="floating-cta"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 70,
            background: C.orange,
            color: '#fff',
            fontWeight: 800,
            fontSize: 14,
            letterSpacing: '0.06em',
            padding: '16px 30px',
            borderRadius: 999,
            textDecoration: 'none',
            boxShadow: '0 12px 32px rgba(240,122,39,0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <ShoppingCartIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> PEDIR AHORA
        </Link>
      )}

      {/* ============ LIGHTBOX ============ */}
      {lightboxImage && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setLightboxImage(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: 24, cursor: 'zoom-out' }}
        >
          <img src={lightboxImage} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 16, boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }} />
          <button
            onClick={() => setLightboxImage(null)}
            style={{ position: 'fixed', top: 24, right: 32, background: 'none', border: 'none', color: '#fff', fontSize: 32, fontWeight: 900, cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>,
        document.body
      )}

      {/* ============ EXIT INTENT POPUP ============ */}
      {showExitPopup && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setShowExitPopup(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: C.cream, borderRadius: 24, padding: '44px 40px', maxWidth: 440, textAlign: 'center', position: 'relative' }}
          >
            <button
              onClick={() => setShowExitPopup(false)}
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 20, fontWeight: 900, color: 'rgba(26,26,26,0.4)', cursor: 'pointer' }}
            >
              ✕
            </button>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.18em', color: C.orange, marginBottom: 12 }}>¡ESPERA!</div>
            <h3 style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 900, color: C.green, margin: 0, marginBottom: 14 }}>
              No te vayas sin tu 20% de descuento
            </h3>
            <p style={{ fontSize: 15, color: 'rgba(26,26,26,0.6)', lineHeight: 1.6, marginBottom: 24 }}>
              Usa el código <strong style={{ color: C.green }}>MODO20</strong> en tu primer pedido y obtén 20% de descuento + envío gratis.
            </p>
            <Link
              href="/verificar"
              onClick={() => setShowExitPopup(false)}
              style={{ background: C.lime, color: C.greenDark, fontWeight: 800, fontSize: 14, letterSpacing: '0.06em', padding: '16px 36px', borderRadius: 999, textDecoration: 'none', display: 'inline-block' }}
            >
              QUIERO MI DESCUENTO
            </Link>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
