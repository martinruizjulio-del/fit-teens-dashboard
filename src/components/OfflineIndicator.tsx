import { Cloud, CloudOff, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSyncStatus } from "@/offline/useSyncStatus";
import { syncNow } from "@/offline/sync";

export function OfflineIndicator() {
  const s = useSyncStatus();

  const hasErr = !!s.lastError && s.pending > 0;

  let icon = <Cloud className="h-4 w-4" />;
  let cls = "text-success";
  let label = "Sincronizado";

  if (!s.online) {
    icon = <CloudOff className="h-4 w-4" />;
    cls = "text-warning";
    label = `Sin conexión${s.pending ? ` · ${s.pending} pendientes` : ""}`;
  } else if (s.syncing) {
    icon = <RefreshCw className="h-4 w-4 animate-spin" />;
    cls = "text-primary";
    label = "Sincronizando…";
  } else if (s.pending > 0) {
    icon = hasErr ? <AlertCircle className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />;
    cls = hasErr ? "text-destructive" : "text-secondary";
    label = `${s.pending} cambios pendientes`;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void syncNow()}
          disabled={!s.online || s.syncing}
          className={`h-8 px-2 gap-1.5 ${cls}`}
        >
          {icon}
          <span className="hidden sm:inline text-xs">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs space-y-0.5">
          <div>{label}</div>
          {s.lastSyncAt && <div className="opacity-70">Última: {new Date(s.lastSyncAt).toLocaleTimeString()}</div>}
          {s.lastError && <div className="text-destructive max-w-xs break-words">⚠ {s.lastError}</div>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
