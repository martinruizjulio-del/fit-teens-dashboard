import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarRange, Plus, Trash2 } from "lucide-react";
import { db } from "@/offline/db";
import { createEvaluacion } from "@/offline/repo";
import { notifyLocalMutation } from "@/offline/sync";

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
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nombre: "", fecha: new Date().toISOString().slice(0, 10) });

  const list = (useLiveQuery(async () => {
    if (!grupoId) return [] as Evaluacion[];
    const rs = await db.evaluaciones.where("grupo_id").equals(grupoId).toArray();
    const arr = (rs as unknown as Evaluacion[]).slice().sort((a, b) => (b.fecha ?? "").localeCompare(a.fecha ?? ""));
    onListChanged?.(arr);
    if (!value && arr.length > 0) onChange(arr[0].id);
    return arr;
  }, [grupoId], [] as Evaluacion[])) ?? [];

  async function crear() {
    if (!form.nombre.trim()) return;
    try {
      // anio_escolar: take from the grupo
      const grupo = await db.grupos.get(grupoId);
      const anio = (grupo as { anio_escolar?: string } | undefined)?.anio_escolar ?? "";
      const newId = await createEvaluacion({ grupo_id: grupoId, nombre: form.nombre.trim(), fecha: form.fecha, anio_escolar: anio });
      setOpen(false);
      setForm({ nombre: "", fecha: new Date().toISOString().slice(0, 10) });
      toast({ title: "Evaluación creada" });
      onChange(newId);
    } catch (err) {
      toast({ variant: "destructive", title: err instanceof Error ? err.message : String(err) });
    }
  }

  async function borrar(id: string) {
    if (!confirm("¿Eliminar esta evaluación y todas sus pruebas asociadas?")) return;
    try {
      // Local cascade
      const e = await db.pruebas_eurofit.where("evaluacion_id").equals(id).primaryKeys();
      const c = await db.pruebas_cfs.where("evaluacion_id").equals(id).primaryKeys();
      await db.pruebas_eurofit.bulkDelete(e);
      await db.pruebas_cfs.bulkDelete(c);
      await db.evaluaciones.delete(id);
      // Queue deletes
      await db.sync_queue.bulkAdd([
        ...e.map((rid) => ({ table: "pruebas_eurofit" as const, op: "delete" as const, rowId: rid, payload: null, createdAt: Date.now(), attempts: 0 })),
        ...c.map((rid) => ({ table: "pruebas_cfs" as const, op: "delete" as const, rowId: rid, payload: null, createdAt: Date.now(), attempts: 0 })),
        { table: "evaluaciones" as const, op: "delete" as const, rowId: id, payload: null, createdAt: Date.now(), attempts: 0 },
      ]);
      void notifyLocalMutation();
      toast({ title: "Evaluación eliminada" });
      if (value === id) onChange(null);
    } catch (err) {
      toast({ variant: "destructive", title: err instanceof Error ? err.message : String(err) });
    }
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
