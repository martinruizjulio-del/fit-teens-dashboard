import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PROVINCIAS_ES } from "@/lib/constants";
import { Building2 } from "lucide-react";

const schema = z.object({
  nombre_solicitante: z.string().trim().min(2).max(100),
  email_solicitante: z.string().trim().email().max(255),
  centro_nombre: z.string().trim().min(2).max(150),
  ciudad: z.string().trim().max(100).optional(),
  provincia: z.string().trim().max(100).optional(),
  mensaje: z.string().trim().max(1000).optional(),
});

interface Props {
  trigger: ReactNode;
  defaultEmail?: string;
  defaultName?: string;
  onSubmitted?: () => void;
}

export function ImplantacionDialog({ trigger, defaultEmail, defaultName, onSubmitted }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nombre_solicitante: defaultName ?? "",
    email_solicitante: defaultEmail ?? "",
    centro_nombre: "",
    ciudad: "",
    provincia: "",
    mensaje: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const parsed = schema.safeParse(form);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos");
      }
      const { error } = await supabase.from("solicitudes_implantacion").insert({
        nombre_solicitante: parsed.data.nombre_solicitante,
        email_solicitante: parsed.data.email_solicitante,
        centro_nombre: parsed.data.centro_nombre,
        ciudad: parsed.data.ciudad || null,
        provincia: parsed.data.provincia || null,
        mensaje: parsed.data.mensaje || null,
      });
      if (error) throw error;
      toast({ title: t("implantacion.successTitle"), description: t("implantacion.successDesc") });
      setOpen(false);
      onSubmitted?.();
    } catch (err: any) {
      toast({ variant: "destructive", title: t("auth.errors.generic"), description: err?.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {t("implantacion.title")}
          </DialogTitle>
          <DialogDescription>{t("implantacion.desc")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("implantacion.fullName")} *</Label>
              <Input required maxLength={100} value={form.nombre_solicitante}
                onChange={(e) => setForm({ ...form, nombre_solicitante: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("implantacion.email")} *</Label>
              <Input type="email" required maxLength={255} value={form.email_solicitante}
                onChange={(e) => setForm({ ...form, email_solicitante: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("implantacion.school")} *</Label>
            <Input required maxLength={150} value={form.centro_nombre}
              onChange={(e) => setForm({ ...form, centro_nombre: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("centros.city")}</Label>
              <Input maxLength={100} value={form.ciudad}
                onChange={(e) => setForm({ ...form, ciudad: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("centros.province")}</Label>
              <Select value={form.provincia} onValueChange={(v) => setForm({ ...form, provincia: v })}>
                <SelectTrigger><SelectValue placeholder={t("common.select")} /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {PROVINCIAS_ES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("implantacion.message")}</Label>
            <Textarea rows={3} maxLength={1000} value={form.mensaje}
              onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
              placeholder={t("implantacion.messagePh")} />
          </div>
          <p className="text-xs text-muted-foreground">{t("implantacion.note")}</p>
          <DialogFooter>
            <Button type="submit" disabled={loading} className="w-full">
              {t("implantacion.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
