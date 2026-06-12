import { useEffect, useState } from "react";
import { updateGrupoBateria } from "@/offline/repo";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Sliders } from "lucide-react";
import { CATEGORIAS, BATERIA_PERSONALIZADA_DEFAULT, isBateriaPersonalizadaCompleta, type BateriaPersonalizada, type CategoriaKey } from "@/lib/pruebas";

interface Props {
  grupoId: string;
  grupoLabel: string;
  initial: BateriaPersonalizada | null;
  onSaved: (sel: BateriaPersonalizada | null) => void;
  trigger?: React.ReactNode;
}

export function BateriaPersonalizadaDialog({ grupoId, grupoLabel, initial, onSaved, trigger }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<BateriaPersonalizada>(initial ?? BATERIA_PERSONALIZADA_DEFAULT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setSel(initial ?? BATERIA_PERSONALIZADA_DEFAULT);
  }, [open, initial]);

  function setCat(cat: CategoriaKey, value: string) {
    setSel((prev) => ({ ...prev, [cat]: value }));
  }

  async function guardar(payload: BateriaPersonalizada | null) {
    setSaving(true);
    try {
      await updateGrupoBateria(grupoId, payload);
      toast({ title: payload ? "Batería personalizada guardada" : "Batería personalizada eliminada" });
      onSaved(payload);
      setOpen(false);
    } catch (err) {
      toast({ variant: "destructive", title: err instanceof Error ? err.message : String(err) });
    } finally {
      setSaving(false);
    }
  }

  const completa = isBateriaPersonalizadaCompleta(sel);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            <Sliders className="h-3.5 w-3.5 mr-1.5" /> Batería personalizada
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Batería personalizada · {grupoLabel}</DialogTitle>
          <DialogDescription>
            Elige una prueba por categoría (mezcla Eurofit y CFS). Siempre serán 6 pruebas en total.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {CATEGORIAS.map((cat) => (
            <div key={cat.key} className="space-y-2">
              <Label className="font-medium">{cat.label}</Label>
              <RadioGroup
                value={sel[cat.key] ?? ""}
                onValueChange={(v) => setCat(cat.key, v)}
                className="grid sm:grid-cols-2 gap-2"
              >
                {cat.opciones.map((opt) => {
                  const id = `${cat.key}-${opt.key}`;
                  const checked = sel[cat.key] === opt.key;
                  return (
                    <label
                      key={opt.key}
                      htmlFor={id}
                      className={`flex items-start gap-2 rounded-md border p-3 cursor-pointer transition-smooth ${
                        checked ? "border-primary bg-primary/5" : "hover:bg-accent/40"
                      }`}
                    >
                      <RadioGroupItem id={id} value={opt.key} className="mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                          {opt.label}
                          <Badge variant="outline" className="text-[10px] uppercase">{opt.bateria}</Badge>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </RadioGroup>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {initial && (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:text-destructive sm:mr-auto"
              disabled={saving}
              onClick={() => guardar(null)}
            >
              Eliminar configuración
            </Button>
          )}
          <Button type="button" variant="outline" disabled={saving} onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={!completa || saving} onClick={() => guardar(sel)}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
