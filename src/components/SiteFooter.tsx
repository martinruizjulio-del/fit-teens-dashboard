import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Users, GraduationCap, Eye } from "lucide-react";

type Stats = { profesores: number; alumnos: number; visitas: number };

export function SiteFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  const [autores, setAutores] = useState<string>("Julio Martín-Ruiz");
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    void supabase.from("config_publica").select("autores").maybeSingle().then(({ data }) => {
      if (data?.autores) setAutores(data.autores);
    });

    const loadStats = () =>
      supabase.rpc("get_landing_public_stats").then(({ data }) => {
        if (data) setStats(data as Stats);
      });

    // Registrar una visita: una vez por usuario (cookie / localStorage) y una vez por sesión y ruta
    const ruta = window.location.pathname;
    const cookieKey = `visita_user_${ruta}`;
    const sessionKey = `visita_${ruta}`;

    const hasCookie = document.cookie.split("; ").some((c) => c.startsWith(`${cookieKey}=`));
    const hasLocal = localStorage.getItem(cookieKey) === "1";
    const hasSession = sessionStorage.getItem(sessionKey) === "1";

    if (!hasCookie && !hasLocal && !hasSession) {
      // Cookie persistente (1 año) + respaldo en localStorage
      const oneYear = 60 * 60 * 24 * 365;
      document.cookie = `${cookieKey}=1; max-age=${oneYear}; path=/; SameSite=Lax`;
      localStorage.setItem(cookieKey, "1");
      sessionStorage.setItem(sessionKey, "1");
      void supabase.rpc("registrar_visita", { _ruta: ruta }).then(() => loadStats());
    } else {
      void loadStats();
    }

  }, []);

  return (
    <footer className="border-t border-border/50 bg-muted/30 mt-auto">
      <div className="container py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
        <div className="text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">{t("app.name")}</p>
          <p className="mt-1">
            {t("footer.developedBy")}{" "}
            <span className="font-medium text-foreground">{autores}</span>
          </p>
        </div>

        {stats && (
          <div className="flex items-center gap-5 text-sm">
            <div className="flex items-center gap-2">
              <div className="inline-flex p-2 rounded-md bg-primary/10 text-primary">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="font-mono font-semibold text-foreground leading-tight">{stats.profesores}</p>
                <p className="text-xs text-muted-foreground">{t("footer.statsTeachers", { count: stats.profesores }).replace(/^\d+\s*/, "")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex p-2 rounded-md bg-secondary/10 text-secondary">
                <GraduationCap className="h-4 w-4" />
              </div>
              <div>
                <p className="font-mono font-semibold text-foreground leading-tight">{stats.alumnos}</p>
                <p className="text-xs text-muted-foreground">{t("footer.statsStudents", { count: stats.alumnos }).replace(/^\d+\s*/, "")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex p-2 rounded-md bg-accent/20 text-foreground">
                <Eye className="h-4 w-4" />
              </div>
              <div>
                <p className="font-mono font-semibold text-foreground leading-tight">{stats.visitas}</p>
                <p className="text-xs text-muted-foreground">{t("footer.statsVisits", { defaultValue: "visitas" })}</p>
              </div>
            </div>
          </div>
        )}

        <div className="text-sm text-muted-foreground flex flex-col items-center md:items-end gap-1">
          <a
            href="https://giepafs.net"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-primary hover:text-primary/80 transition-colors"
          >
            GIEPAFS
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <p className="text-xs">© {year} · {t("footer.rights")}</p>
        </div>
      </div>
    </footer>
  );
}
