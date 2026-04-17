import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen } from "lucide-react";

interface ManualDialogProps {
  variant?: "ghost" | "outline" | "secondary";
  size?: "sm" | "default";
  className?: string;
}

export function ManualDialog({ variant = "ghost", size = "sm", className }: ManualDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const sections = t("manual.sections", { returnObjects: true }) as Array<{
    title: string;
    items: string[];
  }>;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <BookOpen className="h-4 w-4 mr-1.5" />
          {t("manual.button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{t("manual.title")}</DialogTitle>
          <DialogDescription>{t("manual.subtitle")}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-6 py-2">
            {Array.isArray(sections) &&
              sections.map((section, i) => (
                <section key={i}>
                  <h3 className="font-display font-semibold text-lg text-foreground mb-2 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      {i + 1}
                    </span>
                    {section.title}
                  </h3>
                  <ul className="space-y-1.5 ml-9 list-disc text-sm text-muted-foreground leading-relaxed">
                    {section.items.map((item, j) => (
                      <li key={j}>{item}</li>
                    ))}
                  </ul>
                </section>
              ))}
            <div className="rounded-lg border border-border/60 bg-muted/40 p-4 text-xs text-muted-foreground">
              {t("manual.footnote")}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
