import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldCheck } from "lucide-react";

interface Props {
  trigger: ReactNode;
}

export function PrivacyPolicyDialog({ trigger }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [md, setMd] = useState<string>("");

  useEffect(() => {
    if (!open || md) return;
    void supabase
      .from("config_publica")
      .select("politica_privacidad_md")
      .maybeSingle()
      .then(({ data }) => setMd(data?.politica_privacidad_md ?? ""));
  }, [open, md]);

  // Lightweight markdown rendering: headings, paragraphs, lists.
  const blocks = md.split(/\n{2,}/).map((block, i) => {
    const trimmed = block.trim();
    if (trimmed.startsWith("# ")) {
      return <h2 key={i} className="font-display text-xl font-bold text-foreground">{trimmed.slice(2)}</h2>;
    }
    if (trimmed.startsWith("## ")) {
      return <h3 key={i} className="font-display text-base font-semibold text-foreground mt-4">{trimmed.slice(3)}</h3>;
    }
    if (trimmed.startsWith("- ") || /^\d+\.\s/.test(trimmed)) {
      const items = trimmed.split("\n").map((l) => l.replace(/^(?:-\s|\d+\.\s)/, ""));
      return (
        <ul key={i} className="list-disc ml-5 space-y-1 text-sm text-muted-foreground">
          {items.map((it, j) => <li key={j}>{it}</li>)}
        </ul>
      );
    }
    return <p key={i} className="text-sm text-muted-foreground leading-relaxed">{trimmed}</p>;
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {t("privacy.title")}
          </DialogTitle>
          <DialogDescription>{t("privacy.subtitle")}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-3 py-2">
            {md ? blocks : <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
