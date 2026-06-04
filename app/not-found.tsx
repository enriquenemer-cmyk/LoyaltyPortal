import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Premio no encontrado</h1>
      <p className="text-gray-500 mb-6 max-w-sm">
        El premio que buscas no existe o el enlace es incorrecto.
      </p>
      <Link
        href="/admin/generate"
        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors"
      >
        Ir al panel de administración
      </Link>
    </div>
  );
}
