export function Avatar({
  name,
  size = 36,
  variant = 'circle',
}: {
  name: string;
  size?: number;
  variant?: 'circle' | 'rounded' | 'squircle';
}) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const hue = Array.from(name).reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 360;
  const primary = `hsl(${hue}, 65%, 50%)`;
  const secondary = `hsl(${(hue + 40) % 360}, 70%, 35%)`;

  let borderRadius: string;
  let clipPath: string | undefined;

  if (variant === 'circle') {
    borderRadius = '50%';
  } else if (variant === 'rounded') {
    borderRadius = `${size * 0.25}px`;
  } else {
    // squircle via clip-path
    borderRadius = '0';
    clipPath =
      'polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)';
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius,
        clipPath,
        background: `linear-gradient(135deg, ${primary}, ${secondary})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: size * 0.36,
        fontWeight: 800,
        letterSpacing: '-0.02em',
        flexShrink: 0,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
        userSelect: 'none',
      }}
    >
      {initials}
    </div>
  );
}
