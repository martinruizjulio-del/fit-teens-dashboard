interface LogoProps {
  className?: string;
  size?: number;
}

/**
 * Logo CFS — cronómetro con onda ECG (pulso).
 * Evoca medición + actividad física, sin clichés de gimnasio.
 */
export function Logo({ className = "", size = 32 }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      aria-label="Logo Condición Física Secundaria"
      role="img"
    >
      {/* Botón superior del cronómetro */}
      <rect
        x="28"
        y="4"
        width="8"
        height="5"
        rx="1.5"
        fill="hsl(var(--primary))"
      />
      {/* Asas laterales */}
      <rect x="22" y="7" width="4" height="3" rx="1" fill="hsl(var(--primary))" />
      <rect x="38" y="7" width="4" height="3" rx="1" fill="hsl(var(--primary))" />

      {/* Cuerpo del cronómetro */}
      <circle
        cx="32"
        cy="36"
        r="23"
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="3"
      />
      {/* Anillo de progreso (acento) */}
      <circle
        cx="32"
        cy="36"
        r="23"
        fill="none"
        stroke="hsl(var(--secondary))"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="40 200"
        transform="rotate(-90 32 36)"
      />

      {/* Marcas horarias 12 / 3 / 6 / 9 */}
      <line x1="32" y1="15" x2="32" y2="18" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" />
      <line x1="53" y1="36" x2="50" y2="36" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" />
      <line x1="32" y1="57" x2="32" y2="54" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" />
      <line x1="11" y1="36" x2="14" y2="36" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" />

      {/* Onda ECG / pulso atravesando el centro */}
      <polyline
        points="14,36 22,36 26,36 28,30 31,42 34,24 37,42 40,36 50,36"
        fill="none"
        stroke="hsl(var(--secondary))"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
