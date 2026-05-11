import { create } from "zustand";
import { listen } from "@tauri-apps/api/event";
import { useAppManagerStore } from "../views/app_manager/store";

export type OpStatus = "pending" | "running" | "done" | "error";
export type OpType   = "uninstall" | "update" | "clean" | "scan";

export interface Operation {
  id: string;
  op_type: OpType;
  app_name: string;
  status: OpStatus;
  progress: number;   // 0.0 – 1.0
  message: string;
  icon?: string | null;
  startedAt: number;  // Date.now()
  finishedAt?: number; // Captured when status becomes done/error
}

interface OperationProgressPayload {
  id: string;
  op_type: string;
  app_name: string;
  status: string;
  progress: number;
  message: string;
  icon?: string | null;
}

interface OperationsState {
  operations: Operation[];
  isOpen: boolean;
  
  // Actions
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  addOperation: (op: Operation) => void;
  updateOperation: (op: Operation) => void;
  clearDone: () => void;
  
  // Initialize event listener
  initListener: () => () => void;
}

export const useOperationsStore = create<OperationsState>((set, get) => ({
  operations: [],
  isOpen: false,

  setOpen: (isOpen) => set({ isOpen }),
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

  addOperation: (op) => set((state) => ({ 
    operations: [...state.operations, op] 
  })),

  updateOperation: (op) => set((state) => {
    const idx = state.operations.findIndex(o => o.id === op.id);
    if (idx >= 0) {
      const next = [...state.operations];
      next[idx] = op;
      return { operations: next };
    }
    return { operations: [...state.operations, op] };
  }),

  clearDone: () => set((state) => ({
    operations: state.operations.filter(o => o.status !== "done" && o.status !== "error")
  })),

  initListener: () => {
    const unlistenPromise = listen<OperationProgressPayload>("operation-progress", (event) => {
      const p = event.payload;
      const { operations, updateOperation, setOpen } = get();
      
      const existingIdx = operations.findIndex(o => o.id === p.id);
      const existing = existingIdx >= 0 ? operations[existingIdx] : null;
      
      const status = p.status as OpStatus;
      let finishedAt = existing?.finishedAt;
      
      // If it just finished (done or error) and we don't have a finishedAt yet
      if ((status === "done" || status === "error") && !finishedAt) {
        finishedAt = Date.now();
      }

      let foundIcon = p.icon || existing?.icon;
      if (!foundIcon) {
        const appStore = useAppManagerStore.getState();
        const upd = appStore.updates.find(u => u.name === p.app_name);
        if (upd?.icon) {
          foundIcon = upd.icon;
        } else {
          const inst = appStore.installedApps.find(a => a.name === p.app_name);
          if (inst?.icon) {
            foundIcon = inst.icon;
          }
        }
      }

      const op: Operation = {
        id: p.id,
        op_type: p.op_type as OpType,
        app_name: p.app_name,
        status: status,
        progress: p.progress,
        message: p.message,
        icon: foundIcon,
        startedAt: existing ? existing.startedAt : Date.now(),
        finishedAt: finishedAt,
      };
      
      updateOperation(op);
      
      // Auto-open queue when a new operation starts
      if (p.status === "running" && (!existing || existing.status === "pending")) {
        setOpen(true);
      }
    });

    return () => {
      unlistenPromise.then(fn => fn());
    };
  }
}));
