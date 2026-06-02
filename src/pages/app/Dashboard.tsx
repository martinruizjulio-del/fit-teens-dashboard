import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, GraduationCap, ClipboardList, ArrowRight } from "lucide-react";

export default function Dashboard() {
  const { t } = useTranslation();
  const { user, effectiveUserId, impersonating } = useAuth();
  const [stats, setStats] = useState({ centros: 0, grupos: 0, alumnos: 0 });

  useEffect(() => {
    if (!effectiveUserId) return;
    void (async () => {
      const [{ count: cCentros }, { count: cGrupos }, { data: grupos }] = await Promise.all([
        supabase.from("centros").select("*", { count: "exact", head: true }).eq("created_by", effectiveUserId),
        supabase.from("grupos").select("*", { count: "exact", head: true }).eq("profesor_id", effectiveUserId),
        supabase.from("grupos").select("id").eq("profesor_id", effectiveUserId),
      ]);
      let cAlumnos = 0;
      if (grupos && grupos.length > 0) {
        const { count } = await supabase
          .from("alumnos")
          .select("*", { count: "exact", head: true })
          .in("grupo_id", grupos.map((g) => g.id));
        cAlumnos = count ?? 0;
      }
      setStats({ centros: cCentros ?? 0, grupos: cGrupos ?? 0, alumnos: cAlumnos });
    })();
  }, [effectiveUserId]);

  const cards = [
    { icon: Building2, label: t("dashboard.myCentros"), value: stats.centros, to: "/app/centros", color: "from-primary to-primary-glow" },
    { icon: Users, label: t("dashboard.myGrupos"), value: stats.grupos, to: "/app/grupos", color: "from-secondary to-orange-600" },
    { icon: GraduationCap, label: t("dashboard.myAlumnos"), value: stats.alumnos, to: "/app/alumnos", color: "from-primary-glow to-primary" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">{t("dashboard.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("dashboard.welcome")}, {user?.email}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <Link to={c.to} key={c.label}>
            <Card className="hover:shadow-elevated hover:-translate-y-0.5 transition-smooth cursor-pointer h-full">
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`p-3 rounded-lg bg-gradient-to-br ${c.color} text-white shadow-md`}>
                  <c.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                  <p className="font-display text-3xl font-bold text-foreground">{c.value}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">{t("dashboard.quickActions")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link to="/app/centros"><Button variant="outline"><Building2 className="h-4 w-4 mr-2" /> {t("nav.centros")}</Button></Link>
          <Link to="/app/grupos"><Button variant="outline"><Users className="h-4 w-4 mr-2" /> {t("nav.grupos")}</Button></Link>
          <Link to="/app/alumnos"><Button variant="outline"><GraduationCap className="h-4 w-4 mr-2" /> {t("nav.alumnos")}</Button></Link>
        </CardContent>
      </Card>

      <Card className="border-dashed bg-accent/30">
        <CardContent className="p-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-2">📊 Próximas entregas</p>
          <p>Estamos en la <strong>fase 1 (núcleo)</strong>. Pronto se añadirán: estadísticas avanzadas con desviación típica y comparativas entre baterías, página pública con gráficas anónimas, exportación PDF e importación de 100 alumnos demo.</p>
        </CardContent>
      </Card>
    </div>
  );
}
