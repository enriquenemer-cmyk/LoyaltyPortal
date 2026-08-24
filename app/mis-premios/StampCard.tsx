'use client';

type StampCardData = {
  id: string;
  phone: string;
  email: string;
  restaurant_id: string | null;
  stamps_count: number;
  stamps_required: number;
  completed_at: string | null;
  prize_claimed: boolean;
  created_at: string;
  restaurant_name?: string | null;
};

type Props = {
  card: StampCardData;
};

export default function StampCard({ card }: Props) {
  const { stamps_count, stamps_required, completed_at, restaurant_name } = card;
  const isComplete = !!completed_at;

  const stamps = Array.from({ length: stamps_required }, (_, i) => i < stamps_count);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        boxShadow: isComplete
          ? '0 0 0 3px #facc15, 0 8px 32px rgba(250,204,21,0.35)'
          : '0 2px 16px rgba(0,0,0,0.07)',
        background: isComplete
          ? 'linear-gradient(135deg, #fffbeb, #fef9c3)'
          : '#fff',
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4"
        style={{
          background: isComplete
            ? 'linear-gradient(135deg, #C2410C, #ca8a04)'
            : 'linear-gradient(135deg, #F97316, #EA580C)',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            {restaurant_name && (
              <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-0.5">
                {restaurant_name}
              </p>
            )}
            <p className="text-white font-extrabold text-base">
              {isComplete ? 'Tarjeta de sellos' : 'Tarjeta de sellos'}
            </p>
          </div>
          {isComplete && (
            <span className="text-yellow-300 text-2xl" aria-label="completa">
              ★
            </span>
          )}
        </div>
      </div>

      {/* Stamps grid */}
      <div className="px-5 py-5">
        <div
          className="flex flex-wrap gap-3 justify-center mb-4"
          role="img"
          aria-label={`${stamps_count} de ${stamps_required} sellos`}
        >
          {stamps.map((earned, idx) => (
            <div
              key={idx}
              className="flex items-center justify-center rounded-full transition-all duration-300"
              style={{
                width: 44,
                height: 44,
                background: earned
                  ? 'linear-gradient(135deg, #F97316, #EA580C)'
                  : '#f3f4f6',
                border: earned ? 'none' : '2px dashed #d1d5db',
                boxShadow: earned ? '0 4px 12px rgba(249,115,22,0.35)' : 'none',
              }}
            >
              {earned ? (
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <span
                  className="text-sm font-bold"
                  style={{ color: '#d1d5db' }}
                >
                  {idx + 1}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Progress text */}
        <div className="text-center">
          <p
            className="font-bold text-sm"
            style={{ color: isComplete ? '#9A3412' : '#374151' }}
          >
            {stamps_count} de {stamps_required} sellos
          </p>
          {isComplete ? (
            <p
              className="text-sm font-extrabold mt-1"
              style={{ color: '#C2410C' }}
            >
              ¡Tarjeta completa! Tu premio te espera
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-1">
              {stamps_required - stamps_count} visita
              {stamps_required - stamps_count !== 1 ? 's' : ''} mas para completar tu tarjeta
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
