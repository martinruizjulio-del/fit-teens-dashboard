import { OMNI_RES } from "@/lib/constants";
import { Label } from "@/components/ui/label";

interface Props {
  value: number | null | undefined;
  onChange: (v: number) => void;
  required?: boolean;
  id?: string;
}

export function OmniRes({ value, onChange, required, id }: Props) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-center gap-1">
        Percepción del esfuerzo (Omni-Res){required && <span className="text-destructive">*</span>}
      </Label>
      <div className="grid grid-cols-11 gap-1">
        {OMNI_RES.map((o) => (
          <button
            type="button"
            key={o.val}
            onClick={() => onChange(o.val)}
            className={`flex flex-col items-center justify-center rounded-md border py-1.5 text-xs transition-base ${
              value === o.val
                ? "bg-secondary text-secondary-foreground border-secondary shadow-energy"
                : "bg-background hover:bg-muted border-border text-muted-foreground"
            }`}
            title={o.label}
          >
            <span className="font-bold text-sm">{o.val}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {value != null ? `${value} — ${OMNI_RES[value]?.label}` : "Selecciona el esfuerzo percibido (0 = ningún esfuerzo, 10 = esfuerzo máximo)"}
      </p>
    </div>
  );
}
