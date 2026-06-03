import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarRange, Plus, Trash2 } from "lucide-react";

export type Evaluacion = {
  id: string;
  grupo_id: string;
  nombre: string;
  fecha: string;
  anio_escolar?: string | null;
};

interface Props {
  grupoId: string;
  value: string | null;
  onChange: (id: string | null) => void;
  onListChanged?: (list: Evaluacion[]) => void;
  allowDelete?: boolean;
}

export function EvaluacionSelector({ grupoId, value, onChange, onListChanged, allowDelete = true }: Props) {
  const { toast } = useToast();
  const [list, setList] = useState<Evaluacion[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nombre: "", fecha: new Date().toISOString().slice(0, 10) });

  async function load() {
    const { data } = await supabase
      .from("evaluaciones")
      .select("*")
      .eq("grupo_id", grupoId)
      .order("fecha", { ascending: false });
    const arr = (data ?? []) as Evaluacion[];
    setList(arr);
    onListChanged?.(arr);
    if (!value && arr.length > 0) onChange(arr[0].id);
  }

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [grupoId]);

  async function crear() {
    if (!form.nombre.trim()) return;
    const { data, error } = await supabase
      .from("evaluaciones")
      .insert({ grupo_id: grupoId, nombre: form.nombre.trim(), fecha: form.fecha })
      .select("*")
      .single();
    if (error) { toast({ variant: "destructive", title: error.message }); return; }
    setOpen(false);
    setForm({ nombre: "", fecha: new Date().toISOString().slice(0, 10) });
    toast({ title: "Evaluación creada" });
    await load();
    if (data) onChange((data as Evaluacion).id);
  }

  async function borrar(id: string) {
    if (!confirm("¿Eliminar esta evaluación y todas sus pruebas asociadas?")) return;
    // Borrar pruebas asociadas primero (no hay ON DELETE CASCADE)
    await supabase.from("pruebas_eurofit").delete().eq("evaluacion_id", id);
    await supabase.from("pruebas_cfs").delete().eq("evaluacion_id", id);
    const { error } = await supabase.from("evaluaciones").delete().eq("id", id);
    if (error) { toast({ variant: "destructive", title: error.message }); return; }
    toast({ title: "Evaluación eliminada" });
    if (value === id) onChange(null);
    await load();
  }

  const actual = list.find((e) => e.id === value);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <CalendarRange className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Evaluación:</span>
      {list.length === 0 ? (
        <span className="text-sm italic text-muted-foreground">Ninguna todavía</span>
      ) : (
        <Select value={value ?? ""} onValueChange={(v) => onChange(v || null)}>
          <SelectTrigger className="h-8 min-w-[220px] text-sm">
            <SelectValue placeholder="Selecciona evaluación" />
          </SelectTrigger>
          <SelectContent>
            {list.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.nombre} · {e.fecha}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="h-8"><Plus className="h-3.5 w-3.5 mr-1" /> Nueva</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Nueva evaluación</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej: Inicial, 2.º trimestre, Final…"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha *</Label>
              <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={crear} disabled={!form.nombre.trim()}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {allowDelete && actual && (
        <Button size="sm" variant="ghost" className="h-8 text-destructive" onClick={() => borrar(actual.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
