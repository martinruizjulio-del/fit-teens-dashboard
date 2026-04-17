interface LogoProps {
  className?: string;
  size?: number;
}

/**
 * Logo CFA — silbato + anillo de progreso (sin figuras humanas).
 * SVG inline, escalable, hereda colores del tema.
 */
export function Logo({ className = "", size = 32 }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      aria-label="Logo Condición Física Adolescentes"
      role="img"
    >
      {/* Anillo de progreso */}
      <circle
        cx="32"
        cy="32"
        r="27"
        fill="none"
        stroke="hsl(var(--primary))"
        strokeOpacity="0.18"
        strokeWidth="4"
      />
      <circle
        cx="32"
        cy="32"
        r="27"
        fill="none"
        stroke="hsl(var(--secondary))"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="127 170"
        transform="rotate(-90 32 32)"
      />
      {/* Silbato estilizado */}
      <g transform="translate(14 22)">
        <rect x="0" y="4" width="22" height="14" rx="3" fill="hsl(var(--primary))" />
        <rect x="22" y="7" width="8" height="8" rx="1.5" fill="hsl(var(--primary))" />
        <circle cx="6" cy="11" r="2.2" fill="hsl(var(--background))" />
        <path
          d="M30 11 L36 8 L36 14 Z"
          fill="hsl(var(--secondary))"
        />
      </g>
    </svg>
  );
}
