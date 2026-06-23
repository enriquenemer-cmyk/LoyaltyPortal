'use client';

type RfmSegmentKey =
  | 'champions'
  | 'leales'
  | 'nuevos_prometedores'
  | 'en_riesgo'
  | 'perdidos'
  | 'regulares';

const SEGMENT_META: { key: RfmSegmentKey; emoji: string; label: string; bg: string; text: string; border: string }[] = [
  { key: 'champions', emoji: '🏆', label: 'Campeones', bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  { key: 'leales', emoji: '💙', label: 'Leales', bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
  { key: 'nuevos_prometedores', emoji: '🌱', label: 'Nuevos prometedores', bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
  { key: 'en_riesgo', emoji: '⚠️', label: 'En riesgo', bg: '#ffedd5', text: '#9a3412', border: '#fdba74' },
  { key: 'perdidos', emoji: '💔', label: 'Perdidos', bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  { key: 'regulares', emoji: '👤', label: 'Regulares', bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' },
];

export default function RfmChart({
  summary,
  activeSegment,
  onSegmentClick,
}: {
  summary: Record<string, number>;
  activeSegment?: string | null;
  onSegmentClick?: (segment: RfmSegmentKey) => void;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {SEGMENT_META.map((seg) => {
        const count = summary[seg.key] ?? 0;
        const isActive = activeSegment === seg.key;
        return (
          <button
            key={seg.key}
            type="button"
            onClick={() => onSegmentClick?.(seg.key)}
            className="flex flex-col items-center justify-center gap-1.5 rounded-2xl p-4 transition-all text-left"
            style={{
              backgroundColor: seg.bg,
              border: `2px solid ${isActive ? seg.text : seg.border}`,
              boxShadow: isActive ? `0 4px 16px ${seg.border}88` : '0 1px 2px rgba(28,25,23,0.04)',
              cursor: onSegmentClick ? 'pointer' : 'default',
              transform: isActive ? 'translateY(-2px)' : undefined,
            }}
          >
            <span className="text-2xl leading-none">{seg.emoji}</span>
            <span className="text-2xl font-black" style={{ color: seg.text }}>{count}</span>
            <span className="text-[11px] font-bold text-center leading-tight" style={{ color: seg.text }}>
              {seg.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
