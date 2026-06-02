import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCog, Search, LogIn, ExternalLink, GraduationCap } from "lucide-react";

interface Profesor {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface AlumnoRow {
  id: string;
  nombre: string;
  apellidos: string;
  codigo_acceso: string;
  grupo?: { curso: string; letra: string; centro?: { nombre: string } | null } | null;
}

export function ImpersonationPanel() {
  const { startImpersonation, impersonating, stopImpersonation } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [alumnos, setAlumnos] = useState<AlumnoRow[]>([]);
  const [qProf, setQProf] = useState("");
  const [qAlum, setQAlum] = useState("");

  useEffect(() => {
    void (async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "teacher");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) { setProfesores([]); return; }
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", ids)
        .order("full_name");
      setProfesores((profs ?? []) as Profesor[]);

      const { data: al } = await supabase
        .from("alumnos")
        .select("id, nombre, apellidos, codigo_acceso, grupo:grupos(curso, letra, centro:centros(nombre))")
        .order("apellidos")
        .limit(500);
      setAlumnos((al ?? []) as any as AlumnoRow[]);
    })();
  }, []);

  const profesoresFiltrados = useMemo(() => {
    const q = qProf.trim().toLowerCase();
    if (!q) return profesores;
    return profesores.filter((p) =>
      (p.full_name ?? "").toLowerCase().includes(q) ||
      (p.email ?? "").toLowerCase().includes(q)
    );
  }, [profesores, qProf]);

  const alumnosFiltrados = useMemo(() => {
    const q = qAlum.trim().toLowerCase();
    if (!q) return alumnos.slice(0, 50);
    return alumnos.filter((a) =>
      a.nombre.toLowerCase().includes(q) ||
      a.apellidos.toLowerCase().includes(q) ||
      a.codigo_acceso.toLowerCase().includes(q)
    ).slice(0, 100);
  }, [alumnos, qAlum]);

  function suplantar(p: Profesor) {
    startImpersonation({
      userId: p.user_id,
      fullName: p.full_name ?? p.email ?? "Profesor",
      email: p.email ?? "",
    });
    toast({ title: `Suplantando a ${p.full_name ?? p.email}` });
    navigate("/app");
  }

  return (
    <div className="space-y-4">
      {impersonating && (
        <Card className="border-secondary/40 bg-secondary/10">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="text-sm">
              Actualmente suplantando a <strong>{impersonating.fullName}</strong> ({impersonating.email})
            </div>
            <Button variant="outline" size="sm" onClick={stopImpersonation}>
              Detener suplantación
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base flex items-center gap-2">
            <UserCog className="h-5 w-5 text-secondary" /> Suplantar profesor
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Verás el dashboard, centros, grupos y alumnos como si fueses ese profesor. Los datos siguen siendo de solo lectura desde tu cuenta admin.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o email…"
              value={qProf}
              onChange={(e) => setQProf(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="border rounded-md divide-y max-h-96 overflow-auto">
            {profesoresFiltrados.length === 0 && (
              <div className="p-3 text-sm text-muted-foreground">No hay profesores.</div>
            )}
            {profesoresFiltrados.map((p) => (
              <div key={p.user_id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div className="min-w-0">
                  <div className="font-medium truncate">{p.full_name ?? "(sin nombre)"}</div>
                  <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                </div>
                <Button size="sm" onClick={() => suplantar(p)}>
                  <LogIn className="h-3.5 w-3.5 mr-1.5" /> Suplantar
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" /> Acceder como alumno
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Abre la vista pública del alumno usando su código de acceso. Se abre en una pestaña nueva.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, apellidos o código…"
              value={qAlum}
              onChange={(e) => setQAlum(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="border rounded-md divide-y max-h-96 overflow-auto">
            {alumnosFiltrados.length === 0 && (
              <div className="p-3 text-sm text-muted-foreground">Sin resultados.</div>
            )}
            {alumnosFiltrados.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div className="min-w-0">
                  <div className="font-medium truncate">{a.apellidos}, {a.nombre}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {a.grupo ? `${a.grupo.curso} ${a.grupo.letra}` : ""}
                    {a.grupo?.centro?.nombre ? ` · ${a.grupo.centro.nombre}` : ""}
                    {" · "}<span className="font-mono">{a.codigo_acceso}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`/alumno/${a.codigo_acceso}`, "_blank")}
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Abrir
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
