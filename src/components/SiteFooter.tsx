import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink } from "lucide-react";

export function SiteFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  const [autores, setAutores] = useState<string>("Julio Martín-Ruiz");

  useEffect(() => {
    void supabase.from("config_publica").select("autores").maybeSingle().then(({ data }) => {
      if (data?.autores) setAutores(data.autores);
    });
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
