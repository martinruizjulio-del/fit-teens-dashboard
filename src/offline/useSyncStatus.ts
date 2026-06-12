import { useEffect, useState } from "react";
import { subscribeSync, type SyncStatus } from "./sync";

export function useSyncStatus(): SyncStatus {
  const [s, setS] = useState<SyncStatus>(() => ({
    online: navigator.onLine,
    syncing: false,
    pending: 0,
    lastSyncAt: null,
    lastError: null,
  }));
  useEffect(() => subscribeSync(setS), []);
  return s;
}
