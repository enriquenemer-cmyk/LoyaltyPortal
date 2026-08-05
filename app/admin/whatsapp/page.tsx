'use client';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

import { useEffect, useRef, useState } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────
interface Prize {
  id: string;
  name: string;
  end_date: string;
  cancelled: boolean;
}

interface Recipient {
  phone: string;
  name?: string;
}

interface Campaign {
  id: string;
  date: string;
  prizeName: string;
  recipientCount: number;
  template: string;
}

const STORAGE_KEY = 'wa_campaigns';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? '';

// ── Helpers ──────────────────────────────────────────────────────────────────
function buildMessage(template: string, name: string, prizeName: string, prizeUrl: string) {
  return template
    .replace(/\{nombre\}/g, name)
    .replace(/\[prize_name\]/g, prizeName)
    .replace(/\[prize_url\]/g, prizeUrl);
}

function loadCampaigns(): Campaign[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
}

function saveCampaign(c: Campaign) {
  const prev = loadCampaigns();
  localStorage.setItem(STORAGE_KEY, JSON.stringify([c, ...prev].slice(0, 20)));
}

const DEFAULT_TEMPLATE =
  '¡Hola {nombre}!  Tienes un premio especial esperándote en 3E: [prize_name]. Reclámalo aquí: [prize_url]';

// ── WhatsApp icon ─────────────────────────────────────────────────────────────
function WhatsAppIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8E3DC] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#E8E3DC] flex items-center gap-2.5">
        <span className="text-[#25D366]">{icon}</span>
        <h2 className="font-semibold text-[#1C1917] text-sm">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const TIER_LABELS: Record<string, string> = { bronze: 'Bronce', silver: 'Plata', gold: 'Oro' };

export default function WhatsAppPage() {
  // Section 1
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loadingPrizes, setLoadingPrizes] = useState(true);
  const [selectedPrizeId, setSelectedPrizeId] = useState('');
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);

  // Section 2 — recipients
  const [useAllClients, setUseAllClients] = useState(false);
  const [tierFilter, setTierFilter] = useState<'' | 'bronze' | 'silver' | 'gold'>('');
  const [loadingClients, setLoadingClients] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [csvError, setCsvError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Section 3
  const [generated, setGenerated] = useState<{ phone: string; name: string; url: string; msg: string }[]>([]);
  const [copySuccess, setCopySuccess] = useState(false);

  // Section 4
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  // ── Load prizes ──
  useEffect(() => {
    async function fetchPrizes() {
      setLoadingPrizes(true);
      try {
        const res = await fetch('/api/prizes/list');
        if (res.ok) {
          const data = await res.json();
          const active: Prize[] = (data.prizes ?? []).filter(
            (p: Prize) => !p.cancelled && new Date(p.end_date) >= new Date(),
          );
          setPrizes(active);
        } else {
          // fallback: use /api/prizes search-all approach
          const r2 = await fetch('/api/prizes?all=1');
          if (r2.ok) {
            const d2 = await r2.json();
            const active: Prize[] = (d2.prizes ?? []).filter(
              (p: Prize) => !p.cancelled && new Date(p.end_date) >= new Date(),
            );
            setPrizes(active);
          }
        }
      } catch {
        setPrizes([]);
      } finally {
        setLoadingPrizes(false);
      }
    }
    fetchPrizes();
    setCampaigns(loadCampaigns());
  }, []);

  // ── Load clients (all or by tier) ──
  useEffect(() => {
    if (!useAllClients && !tierFilter) { setRecipients([]); return; }
    setLoadingClients(true);

    if (tierFilter) {
      // Load by tier from customer_points
      fetch(`/api/customer-points`)
        .then((r) => r.json())
        .then((data) => {
          const filtered = (data.points ?? []).filter((p: { tier: string; phone: string; full_name?: string }) => p.tier === tierFilter);
          setRecipients(filtered.map((p: { phone: string; full_name?: string }) => ({ phone: p.phone, name: p.full_name })));
        })
        .catch(() => setRecipients([]))
        .finally(() => setLoadingClients(false));
    } else {
      fetch('/api/claims')
        .then((r) => r.json())
        .then((data) => {
          const seen = new Map<string, string>();
          for (const c of data.claims ?? []) {
            if (c.phone && !seen.has(c.phone)) {
              seen.set(c.phone, c.full_name ?? '');
            }
          }
          setRecipients(Array.from(seen.entries()).map(([phone, name]) => ({ phone, name })));
        })
        .catch(() => setRecipients([]))
        .finally(() => setLoadingClients(false));
    }
  }, [useAllClients, tierFilter]);

  // ── CSV upload ──
  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      const parsed: Recipient[] = [];
      for (const line of lines) {
        const [phone, name] = line.split(',').map((s) => s.trim().replace(/^"|"$/g, ''));
        if (phone && /\d{7,}/.test(phone.replace(/\D/g, ''))) {
          parsed.push({ phone: phone.replace(/\D/g, ''), name: name || undefined });
        }
      }
      if (parsed.length === 0) {
        setCsvError('No se encontraron teléfonos válidos en el archivo.');
      } else {
        setRecipients(parsed);
        setUseAllClients(false);
      }
    };
    reader.readAsText(file);
  }

  // ── Derived ──
  const selectedPrize = prizes.find((p) => p.id === selectedPrizeId);
  const prizeUrl = selectedPrize
    ? `${APP_URL}/premio/${selectedPrize.id}`
    : `${APP_URL}/premio/[id]`;
  const previewMsg = buildMessage(
    template,
    'Juan García',
    selectedPrize?.name ?? '[nombre del premio]',
    prizeUrl,
  );

  // ── Generate ──
  function handleGenerate() {
    if (!selectedPrize || recipients.length === 0) return;
    const items = recipients.map((r) => {
      const name = r.name || 'Cliente';
      const msg = buildMessage(template, name, selectedPrize.name, `${APP_URL}/premio/${selectedPrize.id}`);
      const waUrl = `https://wa.me/${r.phone}?text=${encodeURIComponent(msg)}`;
      return { phone: r.phone, name, url: waUrl, msg };
    });
    setGenerated(items);

    // Save campaign
    const campaign: Campaign = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      prizeName: selectedPrize.name,
      recipientCount: items.length,
      template,
    };
    saveCampaign(campaign);
    setCampaigns(loadCampaigns());
  }

  function handleOpenAll() {
    generated.forEach((item, i) => {
      setTimeout(() => window.open(item.url, '_blank'), i * 300);
    });
  }

  function handleCopyCSV() {
    const csv = ['telefono,nombre,mensaje', ...generated.map((g) => `${g.phone},"${g.name}","${g.msg.replace(/"/g, '""')}"`)]
      .join('\n');
    navigator.clipboard.writeText(csv).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  }

  return (
    <div className="min-h-screen">
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="hero-blobs" aria-hidden="true"><span key="b1" /><span key="b2" /><span key="b3" /></div>
        <div className="max-w-4xl mx-auto flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <ChatBubbleLeftRightIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> WhatsApp
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">WhatsApp</h1>
            <p className="text-orange-200/70 mt-1.5 text-sm">Prepara y envía campañas de WhatsApp a tus clientes</p>
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 md:px-10 py-6 space-y-5">

      {/* Section 1 — Mensaje */}
      <Section
        title="1. Preparar mensaje"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        }
      >
        <div className="space-y-4">
          {/* Prize selector */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">Premio activo</label>
            {loadingPrizes ? (
              <div className="h-9 bg-stone-100 rounded-lg animate-pulse" />
            ) : prizes.length === 0 ? (
              <p className="text-xs text-stone-400 italic">No hay premios activos en este momento.</p>
            ) : (
              <select
                value={selectedPrizeId}
                onChange={(e) => setSelectedPrizeId(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-[#E8E3DC] rounded-lg bg-white text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366] transition-all"
              >
                <option value="">— Selecciona un premio —</option>
                {prizes.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Template */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">
              Plantilla del mensaje
              <span className="ml-2 font-normal text-stone-400">usa <code className="bg-stone-100 px-1 rounded">{'{nombre}'}</code>, <code className="bg-stone-100 px-1 rounded">[prize_name]</code>, <code className="bg-stone-100 px-1 rounded">[prize_url]</code></span>
            </label>
            <textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              rows={3}
              className="w-full text-sm px-3 py-2 border border-[#E8E3DC] rounded-lg bg-white text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366] transition-all resize-none"
            />
            <button
              onClick={() => setTemplate(DEFAULT_TEMPLATE)}
              className="mt-1 text-[10px] text-stone-400 hover:text-[#25D366] transition-colors"
            >
              Restablecer plantilla predeterminada
            </button>
          </div>

          {/* Preview */}
          <div>
            <p className="text-xs font-semibold text-stone-600 mb-1.5">Vista previa</p>
            <div className="bg-[#E9FBE9] rounded-xl p-3 border border-[#C3F0C8] relative">
              <div className="absolute top-2 right-2 opacity-40">
                <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
              </div>
              <p className="text-sm text-[#1C1917] whitespace-pre-wrap leading-relaxed pr-6">{previewMsg}</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Section 2 — Destinatarios */}
      <Section
        title="2. Seleccionar destinatarios"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        }
      >
        <div className="space-y-4">
          {/* Tier filter */}
          <div>
            <p className="text-xs font-semibold text-stone-600 mb-2">Filtrar por nivel de cliente</p>
            <div className="flex gap-2 flex-wrap">
              {(['', 'bronze', 'silver', 'gold'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTierFilter(t); setUseAllClients(false); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    tierFilter === t && !useAllClients
                      ? 'border-[#25D366] bg-[#E9FBE9] text-[#15803d]'
                      : 'border-[#E8E3DC] bg-white text-stone-600 hover:border-[#25D366]'
                  }`}
                >
                  {t === '' ? 'Sin filtro' : t === 'bronze' ? ' Bronce' : t === 'silver' ? ' Plata' : ' Oro'}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle all clients */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={useAllClients}
                onChange={(e) => {
                  setUseAllClients(e.target.checked);
                  setTierFilter('');
                  if (!e.target.checked) setRecipients([]);
                }}
                className="sr-only"
              />
              <div className={`w-10 h-5 rounded-full transition-colors ${useAllClients ? 'bg-[#25D366]' : 'bg-stone-200'}`} />
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${useAllClients ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-sm font-medium text-[#1C1917]">Todos los clientes registrados</span>
            {loadingClients && (
              <svg className="w-4 h-4 animate-spin text-[#25D366]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
          </label>

          {/* CSV upload */}
          <div>
            <p className="text-xs font-semibold text-stone-600 mb-1.5">O cargar CSV con teléfonos</p>
            <p className="text-[10px] text-stone-400 mb-2">Formato: <code className="bg-stone-100 px-1 rounded">telefono,nombre</code> (una por línea, nombre opcional)</p>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium border border-dashed border-[#E8E3DC] rounded-lg text-stone-500 hover:border-[#25D366] hover:text-[#25D366] transition-all bg-white"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Subir archivo CSV
            </button>
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleCsvUpload} />
            {csvError && <p className="mt-1.5 text-xs text-red-500">{csvError}</p>}
          </div>

          {/* Count badge */}
          {recipients.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-[#E9FBE9] rounded-lg border border-[#C3F0C8]">
              <svg className="w-4 h-4 text-[#25D366] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-semibold text-[#128C7E]">{recipients.length} destinatarios seleccionados</span>
            </div>
          )}
        </div>
      </Section>

      {/* Section 3 — Generar */}
      <Section
        title="3. Generar links de WhatsApp"
        icon={<WhatsAppIcon className="w-4 h-4" />}
      >
        <div className="space-y-4">
          <button
            onClick={handleGenerate}
            disabled={!selectedPrize || recipients.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)', boxShadow: '0 2px 10px rgba(37,211,102,0.30)' }}
          >
            <WhatsAppIcon className="w-4 h-4" />
            Generar {recipients.length > 0 ? `${recipients.length} mensajes` : 'mensajes'} de WhatsApp
          </button>

          {!selectedPrize && (
            <p className="text-xs text-stone-400 italic">Selecciona un premio en la sección 1 para continuar.</p>
          )}
          {selectedPrize && recipients.length === 0 && (
            <p className="text-xs text-stone-400 italic">Selecciona destinatarios en la sección 2 para continuar.</p>
          )}

          {generated.length > 0 && (
            <div className="space-y-3">
              {/* Bulk actions */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleOpenAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#25D366] text-[#25D366] hover:bg-[#E9FBE9] transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Abrir todos ({generated.length})
                </button>
                <button
                  onClick={handleCopyCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E8E3DC] text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  {copySuccess ? (
                    <>
                      <svg className="w-3.5 h-3.5 text-[#25D366]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copiado
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copiar todos como CSV
                    </>
                  )}
                </button>
              </div>

              {/* Individual list */}
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {generated.map((item, idx) => (
                  <div
                    key={item.phone + idx}
                    className="flex items-center justify-between gap-3 px-3 py-2 bg-white rounded-xl border border-[#E8E3DC] hover:border-[#C3F0C8] transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[#1C1917] truncate">{item.name}</p>
                      <p className="text-[10px] text-stone-400 font-mono">{item.phone}</p>
                    </div>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white shrink-0 transition-opacity hover:opacity-90"
                      style={{ background: '#25D366' }}
                    >
                      <WhatsAppIcon className="w-3 h-3" />
                      Enviar
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Section 4 — Historial */}
      <Section
        title="4. Historial de campañas"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      >
        {campaigns.length === 0 ? (
          <div className="text-center py-6">
            <WhatsAppIcon className="w-8 h-8 text-stone-200 mx-auto mb-2" />
            <p className="text-sm text-stone-400">Aún no has enviado ninguna campaña.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {campaigns.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 px-3 py-3 bg-[#FAFAF9] rounded-xl border border-[#E8E3DC]">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#1C1917] truncate">{c.prizeName}</p>
                  <p className="text-[10px] text-stone-400">
                    {new Date(c.date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E9FBE9] shrink-0">
                  <svg className="w-3 h-3 text-[#25D366]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-[11px] font-bold text-[#128C7E]">{c.recipientCount}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
      </div>
    </div>
  );
}
