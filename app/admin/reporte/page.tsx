'use client';

import { useEffect, useRef, useState } from 'react';

interface WeeklyStats {
  generados: number;
  cobrados: number;
  pendientes: number;
  porVencer: number;
  weekStart: string;
  weekEnd: string;
}

function formatDate(d: Date) {
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getWeekRange() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diffToMon = (day === 0 ? -6 : 1 - day);
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon);
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return { weekStart: mon, weekEnd: sun };
}

function buildMessage(stats: WeeklyStats) {
  return (
    `📊 Reporte Semanal · Tierra Burrito Bar\n\n` +
    `✅ Premios generados: ${stats.generados}\n` +
    `🎁 Cobros realizados: ${stats.cobrados}\n` +
    `⏳ Pendientes de cobro: ${stats.pendientes}\n` +
    `⚠️ Por vencer (7 días): ${stats.porVencer}\n\n` +
    `📅 Semana del ${stats.weekStart} al ${stats.weekEnd}`
  );
}

type ClaimRow = {
  full_name: string;
  phone: string;
  email: string;
  prize_name: string;
  restaurant_name: string | null;
  status: string;
  claimed_at: string;
  delivered_by: string | null;
};

const WA_NUMBER_KEY = 'premia_wa_alert_number';
const WA_TOGGLE_KEY = 'premia_wa_alert_enabled';

function WhatsAppAlertsSection() {
  const [number, setNumber] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setNumber(localStorage.getItem(WA_NUMBER_KEY) ?? '');
    setEnabled(localStorage.getItem(WA_TOGGLE_KEY) === 'true');
  }, []);

  function handleSave() {
    localStorage.setItem(WA_NUMBER_KEY, number);
    localStorage.setItem(WA_TOGGLE_KEY, String(enabled));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleTest() {
    const n = number.replace(/\D/g, '');
    if (!n) { alert('Ingresa un número primero'); return; }
    const msg = encodeURIComponent('🧪 Prueba de alerta SuperTierra — configuración correcta ✅');
    window.open(`https://wa.me/${n}?text=${msg}`, '_blank');
  }

  return (
    <div className="rounded-2xl border border-[#E8E3DC] bg-white overflow-hidden mb-5"
      style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
      <div className="px-5 py-4 border-b border-[#E8E3DC] flex items-center gap-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        <h3 className="text-sm font-bold text-[#1C1917]">Configurar alertas de WhatsApp</h3>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#78716c] uppercase tracking-widest mb-1.5">
            Número de WhatsApp del admin
          </label>
          <input
            type="tel"
            value={number}
            onChange={e => setNumber(e.target.value)}
            placeholder="5215512345678"
            className="w-full bg-[#FAFAF9] border border-[#E8E3DC] rounded-xl px-4 py-3 text-sm text-[#1C1917] focus:outline-none focus:border-[#2563EB] transition-colors"
          />
          <p className="text-xs text-[#a8a29e] mt-1">Formato internacional: 52 + 10 dígitos (ej: 5215512345678)</p>
        </div>
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled(v => !v)}
            className="relative w-11 h-6 rounded-full transition-colors"
            style={{ background: enabled ? '#2563EB' : '#d6d3d1' }}
          >
            <span
              className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform"
              style={{ transform: enabled ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
          <span className="text-sm text-[#1C1917]">Recibir alerta por cada cobro</span>
        </label>
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold"
            style={{ background: '#2563EB' }}
          >
            {saved ? '✓ Guardado' : 'Guardar configuración'}
          </button>
          <button
            onClick={handleTest}
            className="px-4 py-2.5 rounded-xl text-sm font-bold border border-[#E8E3DC] text-[#78716c] hover:bg-[#FAFAF9] transition-colors"
          >
            Enviar prueba
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReportePage() {
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [allClaims, setAllClaims] = useState<ClaimRow[]>([]);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const printStyleRef = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [prizesRes, claimsRes] = await Promise.all([
          fetch('/api/prizes/list'),
          fetch('/api/claims'),
        ]);

        const { weekStart, weekEnd } = getWeekRange();
        const now = new Date();
        const in7 = new Date(now);
        in7.setDate(now.getDate() + 7);

        let generados = 0;
        let pendientes = 0;
        let porVencer = 0;
        let cobrados = 0;

        if (prizesRes.ok) {
          const { prizes } = await prizesRes.json();
          for (const p of prizes ?? []) {
            const created = new Date(p.created_at);
            if (created >= weekStart && created <= weekEnd) generados++;
            if (!p.cancelled) {
              const end = new Date(p.end_date + 'T23:59:59');
              if (end >= now && end <= in7) porVencer++;
            }
          }
        }

        if (claimsRes.ok) {
          const { claims } = await claimsRes.json();
          setAllClaims(claims ?? []);
          for (const c of claims ?? []) {
            if (c.status === 'pending') pendientes++;
            if (c.status === 'delivered') {
              const deliveredAt = new Date(c.delivered_at ?? c.claimed_at);
              if (deliveredAt >= weekStart && deliveredAt <= weekEnd) cobrados++;
            }
          }
        }

        setStats({
          generados,
          cobrados,
          pendientes,
          porVencer,
          weekStart: formatDate(weekStart),
          weekEnd: formatDate(weekEnd),
        });
      } catch {
        setStats({ generados: 0, cobrados: 0, pendientes: 0, porVencer: 0, weekStart: '—', weekEnd: '—' });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleWhatsApp() {
    if (!stats) return;
    const text = buildMessage(stats);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  async function handleCopy() {
    if (!stats) return;
    await navigator.clipboard.writeText(buildMessage(stats));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function exportCSV() {
    const headers = ['Fecha', 'Cliente', 'Premio', 'Restaurante', 'Estado', 'Cajero'];
    const rows = allClaims.map((c) => [
      new Date(c.claimed_at).toLocaleString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      c.full_name,
      c.prize_name,
      c.restaurant_name ?? '—',
      c.status === 'delivered' ? 'Entregado' : 'Pendiente',
      c.delivered_by ?? '—',
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-supertierra-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDownloadPdf() {
    if (generatingPdf) return;
    setGeneratingPdf(true);
    try {
      const jsPDF = (await import('jspdf')).default;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const ORANGE: [number, number, number] = [232, 82, 26];
      const BLACK: [number, number, number] = [28, 25, 23];
      const GRAY: [number, number, number] = [120, 113, 108];
      const LIGHT_GRAY: [number, number, number] = [245, 243, 241];
      const WHITE: [number, number, number] = [255, 255, 255];

      const pageW = 210;
      const marginL = 20;
      const marginR = 20;
      const contentW = pageW - marginL - marginR;
      const generatedDate = new Date().toLocaleDateString('es-MX', {
        day: 'numeric', month: 'long', year: 'numeric',
      });

      // ── Cover page ───────────────────────────────────────────────
      // Orange header band
      doc.setFillColor(...ORANGE);
      doc.rect(0, 0, 210, 60, 'F');

      doc.setTextColor(...WHITE);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text('Tierra Burrito Bar', marginL, 28);

      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text('Reporte de Premios y Cobros', marginL, 40);

      doc.setFontSize(10);
      if (stats) {
        doc.text(`Semana del ${stats.weekStart} al ${stats.weekEnd}`, marginL, 52);
      }

      // Meta info below banner
      doc.setTextColor(...GRAY);
      doc.setFontSize(9);
      doc.text(`Generado el ${generatedDate}`, marginL, 70);

      // ── Executive summary ────────────────────────────────────────
      let y = 85;
      doc.setTextColor(...ORANGE);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumen Ejecutivo', marginL, y);
      y += 6;

      doc.setDrawColor(...ORANGE);
      doc.setLineWidth(0.5);
      doc.line(marginL, y, marginL + contentW, y);
      y += 8;

      const totalClaims = allClaims.length;
      const delivered = allClaims.filter(c => c.status === 'delivered').length;
      const pending = allClaims.filter(c => c.status === 'pending').length;
      const deliveryRate = totalClaims > 0 ? Math.round((delivered / totalClaims) * 100) : 0;

      const summaryData = [
        ['Total de cobros registrados', String(totalClaims)],
        ['Premios entregados', String(delivered)],
        ['Premios pendientes', String(pending)],
        ['Tasa de entrega', `${deliveryRate}%`],
        ...(stats ? [
          ['Generados esta semana', String(stats.generados)],
          ['Por vencer (7 dias)', String(stats.porVencer)],
        ] : []),
      ];

      summaryData.forEach(([label, value], i) => {
        if (i % 2 === 0) {
          doc.setFillColor(...LIGHT_GRAY);
          doc.rect(marginL, y - 4, contentW, 9, 'F');
        }
        doc.setTextColor(...BLACK);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(label, marginL + 3, y + 1);
        doc.setFont('helvetica', 'bold');
        doc.text(value, marginL + contentW - 3, y + 1, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        y += 9;
      });

      y += 6;

      // ── Claims table ─────────────────────────────────────────────
      if (allClaims.length > 0) {
        // Section header
        doc.setTextColor(...ORANGE);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('Detalle de Cobros', marginL, y);
        y += 6;

        doc.setDrawColor(...ORANGE);
        doc.setLineWidth(0.5);
        doc.line(marginL, y, marginL + contentW, y);
        y += 6;

        // Table header
        const colWidths = [28, 35, 35, 28, 22, 22];
        const colHeaders = ['Fecha', 'Cliente', 'Premio', 'Sucursal', 'Estado', 'Cajero'];

        doc.setFillColor(...ORANGE);
        doc.rect(marginL, y - 4, contentW, 8, 'F');
        doc.setTextColor(...WHITE);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');

        let cx = marginL + 2;
        colHeaders.forEach((h, i) => {
          doc.text(h, cx, y + 0.5);
          cx += colWidths[i];
        });
        y += 8;

        // Table rows
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);

        for (let i = 0; i < allClaims.length; i++) {
          const c = allClaims[i];

          // New page if needed
          if (y > 270) {
            doc.addPage();
            y = 20;
            // Repeat header
            doc.setFillColor(...ORANGE);
            doc.rect(marginL, y - 4, contentW, 8, 'F');
            doc.setTextColor(...WHITE);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            cx = marginL + 2;
            colHeaders.forEach((h, idx) => {
              doc.text(h, cx, y + 0.5);
              cx += colWidths[idx];
            });
            y += 8;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
          }

          if (i % 2 === 0) {
            doc.setFillColor(...LIGHT_GRAY);
            doc.rect(marginL, y - 3.5, contentW, 7, 'F');
          }

          const dateStr = new Date(c.claimed_at).toLocaleDateString('es-MX', {
            day: '2-digit', month: '2-digit', year: '2-digit',
          });
          const statusLabel = c.status === 'delivered' ? 'Entregado' : 'Pendiente';

          doc.setTextColor(...BLACK);
          const cellValues = [
            dateStr,
            c.full_name,
            c.prize_name,
            c.restaurant_name ?? '—',
            statusLabel,
            c.delivered_by ?? '—',
          ];

          cx = marginL + 2;
          cellValues.forEach((val, idx) => {
            const maxW = colWidths[idx] - 3;
            const truncated = doc.splitTextToSize(String(val), maxW)[0] ?? '';
            // Color status
            if (idx === 4) {
              doc.setTextColor(c.status === 'delivered' ? 5 : 180, c.status === 'delivered' ? 150 : 100, c.status === 'delivered' ? 90 : 0);
            } else {
              doc.setTextColor(...BLACK);
            }
            doc.text(truncated, cx, y + 0.5);
            cx += colWidths[idx];
          });
          y += 7;
        }
        y += 8;
      }

      // ── Prize performance ────────────────────────────────────────
      // Aggregate by prize name
      const prizeMap: Record<string, { total: number; delivered: number }> = {};
      for (const c of allClaims) {
        if (!prizeMap[c.prize_name]) prizeMap[c.prize_name] = { total: 0, delivered: 0 };
        prizeMap[c.prize_name].total++;
        if (c.status === 'delivered') prizeMap[c.prize_name].delivered++;
      }
      const prizes = Object.entries(prizeMap).sort((a, b) => b[1].total - a[1].total);

      if (prizes.length > 0) {
        if (y > 230) {
          doc.addPage();
          y = 20;
        }

        doc.setTextColor(...ORANGE);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('Rendimiento por Premio', marginL, y);
        y += 6;

        doc.setDrawColor(...ORANGE);
        doc.setLineWidth(0.5);
        doc.line(marginL, y, marginL + contentW, y);
        y += 6;

        // Header
        doc.setFillColor(...ORANGE);
        doc.rect(marginL, y - 4, contentW, 8, 'F');
        doc.setTextColor(...WHITE);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Premio', marginL + 2, y + 0.5);
        doc.text('Cobros', marginL + 100, y + 0.5);
        doc.text('Entregados', marginL + 125, y + 0.5);
        doc.text('Tasa', marginL + 155, y + 0.5);
        y += 8;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);

        prizes.forEach(([name, data], i) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          if (i % 2 === 0) {
            doc.setFillColor(...LIGHT_GRAY);
            doc.rect(marginL, y - 3.5, contentW, 7, 'F');
          }
          doc.setTextColor(...BLACK);
          const rate = data.total > 0 ? Math.round((data.delivered / data.total) * 100) : 0;
          const truncName = doc.splitTextToSize(name, 95)[0] ?? '';
          doc.text(truncName, marginL + 2, y + 0.5);
          doc.text(String(data.total), marginL + 100, y + 0.5);
          doc.text(String(data.delivered), marginL + 125, y + 0.5);
          doc.text(`${rate}%`, marginL + 155, y + 0.5);
          y += 7;
        });
        y += 8;
      }

      // ── Top clients ──────────────────────────────────────────────
      const clientMap: Record<string, number> = {};
      for (const c of allClaims) {
        clientMap[c.full_name] = (clientMap[c.full_name] ?? 0) + 1;
      }
      const topClients = Object.entries(clientMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      if (topClients.length > 0) {
        if (y > 230) {
          doc.addPage();
          y = 20;
        }

        doc.setTextColor(...ORANGE);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('Top Clientes', marginL, y);
        y += 6;

        doc.setDrawColor(...ORANGE);
        doc.setLineWidth(0.5);
        doc.line(marginL, y, marginL + contentW, y);
        y += 6;

        doc.setFillColor(...ORANGE);
        doc.rect(marginL, y - 4, contentW, 8, 'F');
        doc.setTextColor(...WHITE);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('#', marginL + 2, y + 0.5);
        doc.text('Cliente', marginL + 12, y + 0.5);
        doc.text('Cobros', marginL + 155, y + 0.5);
        y += 8;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);

        topClients.forEach(([name, count], i) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          if (i % 2 === 0) {
            doc.setFillColor(...LIGHT_GRAY);
            doc.rect(marginL, y - 3.5, contentW, 7, 'F');
          }
          doc.setTextColor(...BLACK);
          doc.text(String(i + 1), marginL + 2, y + 0.5);
          doc.text(doc.splitTextToSize(name, 140)[0] ?? '', marginL + 12, y + 0.5);
          doc.setFont('helvetica', 'bold');
          doc.text(String(count), marginL + 155, y + 0.5);
          doc.setFont('helvetica', 'normal');
          y += 7;
        });
      }

      // ── Footer on all pages ──────────────────────────────────────
      const pageCount = doc.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setFontSize(8);
        doc.setTextColor(...GRAY);
        doc.text(
          `SuperTierra · ${generatedDate} · Pagina ${p} de ${pageCount}`,
          pageW / 2,
          290,
          { align: 'center' }
        );
      }

      doc.save(`reporte-supertierra-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setGeneratingPdf(false);
    }
  }

  function handlePdfPrint() {
    // Inject print style if not already present
    if (!printStyleRef.current) {
      const style = document.createElement('style');
      style.setAttribute('media', 'print');
      style.textContent = `
        @page { size: A4 landscape; margin: 16mm; }
        body > *:not(#print-report) { display: none !important; }
        #print-report { display: block !important; font-family: sans-serif; font-size: 11px; color: #1e293b; }
        #print-report h2 { font-size: 18px; font-weight: 900; margin-bottom: 4px; }
        #print-report p.sub { color: #64748b; font-size: 11px; margin-bottom: 16px; }
        #print-report table { width: 100%; border-collapse: collapse; }
        #print-report thead tr { background: #1e293b; }
        #print-report thead th { color: #94a3b8; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 7px 10px; text-align: left; }
        #print-report tbody tr:nth-child(even) { background: #f8fafc; }
        #print-report tbody td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; }
        .s-delivered { color: #059669; font-weight: 700; }
        .s-pending { color: #0EA5E9; font-weight: 700; }
      `;
      document.head.appendChild(style);
      printStyleRef.current = style;
    }

    let container = document.getElementById('print-report');
    if (!container) {
      container = document.createElement('div');
      container.id = 'print-report';
      container.style.display = 'none';
      document.body.appendChild(container);
    }

    const rows = allClaims.map((c) => `
      <tr>
        <td>${new Date(c.claimed_at).toLocaleString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
        <td>${c.full_name}</td>
        <td>${c.prize_name}</td>
        <td>${c.restaurant_name ?? '—'}</td>
        <td class="${c.status === 'delivered' ? 's-delivered' : 's-pending'}">${c.status === 'delivered' ? 'Entregado' : 'Pendiente'}</td>
        <td>${c.delivered_by ?? '—'}</td>
      </tr>`).join('');

    container.innerHTML = `
      <h2>SuperTierra — Reporte de Cobros</h2>
      <p class="sub">Generado: ${new Date().toLocaleString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · Total: ${allClaims.length} registros</p>
      <table>
        <thead><tr><th>Fecha</th><th>Cliente</th><th>Premio</th><th>Restaurante</th><th>Estado</th><th>Cajero</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;

    window.print();
  }

  const statCards = stats
    ? [
        { label: 'Premios generados esta semana', value: stats.generados, icon: '✅', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
        { label: 'Cobros realizados esta semana', value: stats.cobrados, icon: '🎁', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
        { label: 'Premios pendientes de cobro', value: stats.pendientes, icon: '⏳', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
        { label: 'Por vencer (próximos 7 días)', value: stats.porVencer, icon: '⚠️', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
      ]
    : [];

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1C1917] tracking-tight">Reporte Semanal</h1>
          {stats && (
            <p className="text-stone-500 text-sm mt-1">Semana del {stats.weekStart} al {stats.weekEnd}</p>
          )}
        </div>
        {!loading && allClaims.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-emerald-700 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 transition-colors"
              title="Exportar CSV compatible con Excel"
            >
              📊 Exportar CSV
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={generatingPdf}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-white border border-[#0891B2] transition-colors disabled:opacity-60"
              style={{ background: generatingPdf ? '#0891B299' : '#2563EB' }}
              title="Descargar PDF completo"
            >
              {generatingPdf ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Generando...
                </>
              ) : (
                <>📄 Descargar PDF</>
              )}
            </button>
            <button
              onClick={handlePdfPrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-stone-700 border border-stone-300 bg-white hover:bg-stone-50 transition-colors"
              title="Imprimir como PDF"
            >
              🖨️ Imprimir
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <svg className="animate-spin w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-[#E8E3DC] bg-white overflow-hidden mb-5"
            style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
            <div className="p-4 text-center" style={{ background: 'linear-gradient(135deg, #2563EB, #0891B2)' }}>
              <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-0.5">Tierra Burrito Bar</p>
              <p className="text-white font-extrabold text-lg">📊 Reporte Semanal</p>
            </div>
            <div className="divide-y divide-[#F3EFE9]">
              {statCards.map((s) => (
                <div key={s.label} className="flex items-center gap-4 px-5 py-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${s.bg} border ${s.border}`}>
                    {s.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-stone-500 text-xs font-medium leading-tight">{s.label}</p>
                  </div>
                  <p className={`text-2xl font-extrabold tabular-nums ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          <WhatsAppAlertsSection />

          <div className="flex flex-col gap-3">
            <button
              onClick={handleWhatsApp}
              className="w-full flex items-center justify-center gap-2.5 font-bold py-3.5 rounded-xl text-white text-sm"
              style={{ background: '#25D366', boxShadow: '0 4px 16px rgba(37,211,102,0.30)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Enviar por WhatsApp
            </button>

            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2.5 font-bold py-3.5 rounded-xl text-sm border border-[#E8E3DC] bg-white text-stone-700 hover:bg-[#FAFAF9] transition-colors"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-emerald-600">Copiado!</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copiar reporte
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
