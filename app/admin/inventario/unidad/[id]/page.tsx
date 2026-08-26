'use client';

import { useEffect, useState, use as usePromise } from 'react';
import Link from 'next/link';
import { ArchiveBoxIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

type UnitDetail = {
  id: string;
  product_id: string;
  product_name: string;
  unit: string;
  order_number: string;
  weight: string;
  status: 'available' | 'retired';
  received_at: string;
  retired_at: string | null;
  retired_by: string | null;
};

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('es-CO', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function UnidadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const [unit, setUnit] = useState<UnitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retiring, setRetiring] = useState(false);
  const [result, setResult] = useState<{ weight_removed: number; new_stock: number; unit: string } | null>(null);

  async function fetchUnit() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/inventory/units/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo cargar la unidad');
      setUnit(data.unit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la unidad');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUnit(); }, [id]);

  async function handleRetirar() {
    setRetiring(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/inventory/units/${id}/retirar`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo retirar la unidad');
      setResult({ weight_removed: data.weight_removed, new_stock: data.new_stock, unit: data.unit });
      fetchUnit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo retirar la unidad');
    } finally {
      setRetiring(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: '#FAFAF9' }}>
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: '#F97316', border: '2px solid #111', boxShadow: '3px 3px 0 #111' }}>
            <ArchiveBoxIcon className="w-7 h-7 text-white" />
          </div>
        </div>

        <div style={{ background: '#fff', border: '2px solid #111', borderRadius: 20, boxShadow: '6px 6px 0 #111', padding: '2rem' }}>
          {loading && (
            <p className="text-center text-sm text-stone-400">Cargando unidad…</p>
          )}

          {!loading && error && !unit && (
            <div className="text-center">
              <ExclamationTriangleIcon className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="text-sm font-bold text-red-600 mb-1">No encontrada</p>
              <p className="text-xs text-stone-400">{error}</p>
            </div>
          )}

          {!loading && unit && (
            <>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#F97316' }}>Pedido #{unit.order_number}</p>
              <h1 className="text-2xl font-black text-[#111] mb-4">{unit.product_name}</h1>

              <div className="flex items-center justify-between py-3 border-t border-b" style={{ borderColor: '#E8E3DC' }}>
                <span className="text-sm text-stone-500">Peso de esta unidad</span>
                <span className="text-2xl font-black text-[#111]">{unit.weight} {unit.unit}</span>
              </div>
              <p className="text-xs text-stone-400 mt-2 mb-5">Recibido: {formatDateTime(unit.received_at)}</p>

              {unit.status === 'retired' ? (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl" style={{ background: '#F0FDF4', border: '2px solid #111' }}>
                  <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0" />
                  <p className="text-sm font-semibold text-emerald-800">
                    Ya retirada{unit.retired_by ? ` por ${unit.retired_by}` : ''}{unit.retired_at ? ` — ${formatDateTime(unit.retired_at)}` : ''}
                  </p>
                </div>
              ) : result ? (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl" style={{ background: '#F0FDF4', border: '2px solid #111' }}>
                  <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0" />
                  <p className="text-sm font-semibold text-emerald-800">
                    Retirado: −{result.weight_removed} {result.unit}. Stock nuevo: {result.new_stock} {result.unit}.
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleRetirar}
                  disabled={retiring}
                  className="w-full py-3.5 rounded-xl text-white text-base transition-all disabled:opacity-60"
                  style={{ background: '#F97316', border: '2.5px solid #111', boxShadow: retiring ? 'none' : '4px 4px 0 #111', fontWeight: 800 }}
                >
                  {retiring ? 'Retirando…' : `Retirar esta unidad (−${unit.weight} ${unit.unit})`}
                </button>
              )}

              {error && <p className="text-red-600 text-xs font-semibold mt-3 text-center">{error}</p>}
            </>
          )}

          <div className="text-center mt-6 pt-5" style={{ borderTop: '1px dashed rgba(17,17,17,0.15)' }}>
            <Link href="/admin/inventario" style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>← Volver a Inventario</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
