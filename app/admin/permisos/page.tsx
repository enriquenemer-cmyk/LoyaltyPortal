import { LockClosedIcon } from '@heroicons/react/24/outline';
type Role = 'admin' | 'manager' | 'cajero';

type PermissionRow = {
  key: string;
  label: string;
  admin: boolean;
  manager: boolean;
  cajero: boolean;
};

const PERMISSIONS: Record<string, Record<Role, boolean>> = {
  dashboard: { admin: true, manager: true, cajero: false },
  generar_premios: { admin: true, manager: true, cajero: false },
  ver_todos_restaurantes: { admin: true, manager: false, cajero: false },
  gestionar_usuarios: { admin: true, manager: false, cajero: false },
  ver_auditoria: { admin: true, manager: false, cajero: false },
  configuracion_sistema: { admin: true, manager: false, cajero: false },
  billing: { admin: true, manager: false, cajero: false },
};

const FEATURE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  generar_premios: 'Generar Premios',
  ver_todos_restaurantes: 'Ver Todos los Restaurantes',
  gestionar_usuarios: 'Gestionar Usuarios',
  ver_auditoria: 'Ver Auditoría',
  configuracion_sistema: 'Configuración del Sistema',
  billing: 'Billing',
};

const ROWS: PermissionRow[] = Object.entries(PERMISSIONS).map(([key, perms]) => ({
  key,
  label: FEATURE_LABELS[key] ?? key,
  admin: perms.admin,
  manager: perms.manager,
  cajero: perms.cajero,
}));

function PermissionIcon({ allowed }: { allowed: boolean }) {
  return allowed ? (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-50 text-emerald-600">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
    </span>
  ) : (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-50 text-red-500">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </span>
  );
}

export default function PermisosPage() {
  return (
    <div className="min-h-screen">
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="hero-blobs" aria-hidden="true"><span key="b1" /><span key="b2" /><span key="b3" /></div>
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <LockClosedIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> Permisos
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Permisos y Roles</h1>
          <p className="text-blue-200/70 mt-1.5 text-sm">Qué puede ver y hacer cada rol</p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 md:px-10 py-6">
        <div className="bg-white border border-[#E8E3DC] rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E8E3DC] bg-[#FAFAF9]">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Funcionalidad</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Admin</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Manager</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Cajero</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row, i) => (
                  <tr
                    key={row.key}
                    className={`border-b border-[#E8E3DC] last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAF9]/50'}`}
                  >
                    <td className="px-5 py-3.5 font-medium text-[#1C1917]">{row.label}</td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center"><PermissionIcon allowed={row.admin} /></div>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center"><PermissionIcon allowed={row.manager} /></div>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center"><PermissionIcon allowed={row.cajero} /></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-stone-400 mt-4">
          Los managers están restringidos a los datos de su propio restaurante. Los admins tienen acceso global a todos los restaurantes.
        </p>
      </div>
    </div>
  );
}
