'use client';
import { useEffect, useState } from 'react';

type Tenant = {
  id: string; name: string; phone: string | null;
  owner_name: string | null; owner_email: string | null;
  billing_plan: string; billing_status: string;
  trial_ends_at: string | null; monthly_price: string;
  notes: string | null; created_at: string;
  user_count: number; client_count: number; claim_count: number;
  main_username: string | null;
};

const PLAN_LABELS: Record<string, string> = { free: 'Gratuito', basic: 'Básico', pro: 'Pro', enterprise: 'Empresarial' };
const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  active:  { bg: '#dcfce7', color: '#16a34a', label: '✅ Activo' },
  blocked: { bg: '#fee2e2', color: '#dc2626', label: '🔒 Bloqueado' },
  trial:   { bg: '#fef9c3', color: '#ca8a04', label: '⏳ Prueba' },
};

const empty = {
  restaurant_name: '', address: '', phone: '', owner_name: '', owner_email: '',
  username: '', password: '', billing_plan: 'basic', monthly_price: '', trial_ends_at: '', notes: '',
};

export default function LicenciasPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Tenant | null>(null);
  const [resetPw, setResetPw] = useState('');
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/licencias');
    if (res.ok) setTenants(await res.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!form.restaurant_name || !form.username || !form.password) {
      setError('Nombre del restaurante, usuario y contraseña son obligatorios.');
      return;
    }
    setSaving(true); setError('');
    const res = await fetch('/api/admin/licencias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, monthly_price: parseFloat(form.monthly_price) || 0 }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Error al crear'); setSaving(false); return; }
    setSaving(false); setShowForm(false); setForm({ ...empty }); load();
  }

  async function patch(id: string, body: object) {
    await fetch(`/api/admin/licencias/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    load();
  }

  async function deleteTenant(id: string, name: string) {
    if (!confirm(`¿Eliminar permanentemente el restaurante "${name}" y todos sus datos de acceso?`)) return;
    await fetch(`/api/admin/licencias/${id}`, { method: 'DELETE' });
    setSelected(null); load();
  }

  async function doResetPw(id: string) {
    if (!resetPw) return;
    await patch(id, { new_password: resetPw });
    setResetPw(''); alert('Contraseña actualizada');
  }

  const filtered = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.main_username ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (t.owner_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const totalMRR = tenants.filter(t => t.billing_status === 'active')
    .reduce((s, t) => s + parseFloat(t.monthly_price || '0'), 0);

  const btn = (style?: object) => ({
    border: '2px solid #111', borderRadius: 8, cursor: 'pointer', fontWeight: 700,
    fontSize: 13, padding: '8px 16px', ...style,
  });

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>🔑 Panel de Licencias</h1>
          <p style={{ color: '#666', margin: '4px 0 0', fontSize: 14 }}>Gestiona clientes, planes y accesos</p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ ...btn({ background: '#F97316', color: '#fff', boxShadow: '3px 3px 0 #111', fontSize: 14, padding: '10px 20px' }) }}>
          + Nuevo cliente
        </button>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total clientes', value: tenants.length, color: '#2563eb' },
          { label: 'Activos', value: tenants.filter(t => t.billing_status === 'active').length, color: '#16a34a' },
          { label: 'Bloqueados', value: tenants.filter(t => t.billing_status === 'blocked').length, color: '#dc2626' },
          { label: 'MRR estimado', value: `$${totalMRR.toLocaleString('es-MX')}`, color: '#7c3aed' },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', border: '2px solid #111', borderRadius: 12, boxShadow: '3px 3px 0 #111', padding: '16px 20px' }}>
            <div style={{ fontSize: 12, color: '#666', fontWeight: 600, marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Buscar por nombre, usuario o dueño..."
        style={{ width: '100%', padding: '10px 14px', border: '2px solid #111', borderRadius: 10, fontSize: 14, marginBottom: 16, boxSizing: 'border-box' }}
      />

      {/* Table */}
      {loading ? <p style={{ color: '#999' }}>Cargando...</p> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#111', color: '#fff' }}>
                {['Restaurante', 'Usuario', 'Plan', 'Estado', 'MRR', 'Clientes', 'Canjes', 'Creado', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => {
                const st = STATUS_COLORS[t.billing_status] ?? STATUS_COLORS.active;
                return (
                  <tr key={t.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafaf9', borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>
                      {t.name}
                      {t.owner_name && <div style={{ fontSize: 11, color: '#666', fontWeight: 400 }}>{t.owner_name}</div>}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#2563eb' }}>{t.main_username ?? '—'}</td>
                    <td style={{ padding: '10px 12px' }}>{PLAN_LABELS[t.billing_plan] ?? t.billing_plan}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ background: st.bg, color: st.color, borderRadius: 6, padding: '3px 8px', fontWeight: 700, fontSize: 12 }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>
                      ${parseFloat(t.monthly_price || '0').toLocaleString('es-MX')}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{t.client_count}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{t.claim_count}</td>
                    <td style={{ padding: '10px 12px', color: '#666', whiteSpace: 'nowrap' }}>
                      {new Date(t.created_at).toLocaleDateString('es-MX')}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setSelected(t)} style={{ ...btn({ background: '#eff6ff', color: '#2563eb', padding: '5px 10px' }) }}>
                          Editar
                        </button>
                        {t.billing_status === 'active' ? (
                          <button onClick={() => patch(t.id, { billing_status: 'blocked' })} style={{ ...btn({ background: '#fee2e2', color: '#dc2626', padding: '5px 10px' }) }}>
                            🔒 Bloquear
                          </button>
                        ) : (
                          <button onClick={() => patch(t.id, { billing_status: 'active' })} style={{ ...btn({ background: '#dcfce7', color: '#16a34a', padding: '5px 10px' }) }}>
                            ✅ Activar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: '#999' }}>No hay clientes registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Nuevo cliente */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', border: '2px solid #111', borderRadius: 16, boxShadow: '6px 6px 0 #111', padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 800 }}>+ Nuevo cliente</h2>
            {error && <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#dc2626', fontSize: 13 }}>{error}</div>}
            {[
              { label: 'Nombre del restaurante *', key: 'restaurant_name', placeholder: 'Tacos El Güero' },
              { label: 'Dirección', key: 'address', placeholder: 'Av. Principal 123' },
              { label: 'Teléfono', key: 'phone', placeholder: '55 1234 5678' },
              { label: 'Nombre del dueño', key: 'owner_name', placeholder: 'Juan Pérez' },
              { label: 'Email del dueño', key: 'owner_email', placeholder: 'juan@ejemplo.com' },
              { label: 'Usuario de acceso *', key: 'username', placeholder: 'tacosguero' },
              { label: 'Contraseña *', key: 'password', placeholder: 'Mínimo 8 caracteres', type: 'password' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>{f.label}</label>
                <input
                  type={f.type ?? 'text'}
                  value={(form as Record<string, string>)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={{ width: '100%', padding: '9px 12px', border: '2px solid #111', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>Plan</label>
                <select value={form.billing_plan} onChange={e => setForm(p => ({ ...p, billing_plan: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', border: '2px solid #111', borderRadius: 8, fontSize: 13 }}>
                  <option value="free">Gratuito</option>
                  <option value="basic">Básico</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Empresarial</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>Precio mensual (MXN)</label>
                <input type="number" value={form.monthly_price} onChange={e => setForm(p => ({ ...p, monthly_price: e.target.value }))}
                  placeholder="500" style={{ width: '100%', padding: '9px 12px', border: '2px solid #111', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>Fin de periodo de prueba</label>
              <input type="date" value={form.trial_ends_at} onChange={e => setForm(p => ({ ...p, trial_ends_at: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', border: '2px solid #111', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>Notas internas</label>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                rows={2} placeholder="Acordado por WhatsApp el 1 sep 2026..."
                style={{ width: '100%', padding: '9px 12px', border: '2px solid #111', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={create} disabled={saving} style={{ ...btn({ background: '#F97316', color: '#fff', boxShadow: '3px 3px 0 #111', flex: 1 }) }}>
                {saving ? 'Creando...' : 'Crear cliente'}
              </button>
              <button onClick={() => { setShowForm(false); setError(''); setForm({ ...empty }); }}
                style={{ ...btn({ background: '#fff', color: '#111' }) }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar cliente */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', border: '2px solid #111', borderRadius: 16, boxShadow: '6px 6px 0 #111', padding: 28, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800 }}>{selected.name}</h2>
            <p style={{ margin: '0 0 20px', color: '#666', fontSize: 13 }}>Usuario: <strong>{selected.main_username}</strong></p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>Estado</label>
                <select defaultValue={selected.billing_status}
                  onChange={e => patch(selected.id, { billing_status: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', border: '2px solid #111', borderRadius: 8, fontSize: 13 }}>
                  <option value="active">✅ Activo</option>
                  <option value="blocked">🔒 Bloqueado</option>
                  <option value="trial">⏳ Prueba</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>Plan</label>
                <select defaultValue={selected.billing_plan}
                  onChange={e => patch(selected.id, { billing_plan: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', border: '2px solid #111', borderRadius: 8, fontSize: 13 }}>
                  <option value="free">Gratuito</option>
                  <option value="basic">Básico</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Empresarial</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>Precio mensual</label>
                <input type="number" defaultValue={parseFloat(selected.monthly_price || '0')}
                  onBlur={e => patch(selected.id, { monthly_price: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '9px 12px', border: '2px solid #111', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>Fin prueba</label>
                <input type="date" defaultValue={selected.trial_ends_at?.slice(0, 10) ?? ''}
                  onBlur={e => patch(selected.id, { trial_ends_at: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', border: '2px solid #111', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>Notas internas</label>
              <textarea defaultValue={selected.notes ?? ''}
                onBlur={e => patch(selected.id, { notes: e.target.value })}
                rows={2} style={{ width: '100%', padding: '9px 12px', border: '2px solid #111', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }} />
            </div>

            <div style={{ background: '#f5f3ff', border: '2px solid #7c3aed', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: 12, marginBottom: 6, color: '#7c3aed' }}>🔑 Cambiar contraseña del cliente</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="password" value={resetPw} onChange={e => setResetPw(e.target.value)}
                  placeholder="Nueva contraseña" style={{ flex: 1, padding: '8px 12px', border: '2px solid #7c3aed', borderRadius: 8, fontSize: 13 }} />
                <button onClick={() => doResetPw(selected.id)} style={{ ...btn({ background: '#7c3aed', color: '#fff', padding: '8px 14px' }) }}>
                  Guardar
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setSelected(null); setResetPw(''); load(); }}
                style={{ ...btn({ background: '#111', color: '#fff', flex: 1 }) }}>Cerrar</button>
              <button onClick={() => deleteTenant(selected.id, selected.name)}
                style={{ ...btn({ background: '#fee2e2', color: '#dc2626' }) }}>🗑 Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
