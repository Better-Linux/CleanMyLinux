import { create } from 'zustand';

type ScanState = 'idle' | 'scanning' | 'complete';

export interface BackButtonConfig {
  label?: string;
  action: () => void;
}

interface AppState {
  currentView: string;
  sidebarCollapsed: boolean;
  scanState: ScanState;
  scanProgress: number;
  currentModule: string;
  totalReclaimable: number;
  lastScan: string | null;
  backButton: BackButtonConfig | null;
  setCurrentView: (view: string) => void;
  setBackButton: (config: BackButtonConfig | null) => void;
  toggleSidebar: () => void;
  setScanState: (state: ScanState) => void;
  setScanProgress: (progress: number) => void;
  setCurrentModule: (module: string) => void;
  setTotalReclaimable: (size: number) => void;
  setLastScan: (date: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'apps',
  sidebarCollapsed: false,
  scanState: 'idle',
  scanProgress: 0,
  currentModule: '',
  totalReclaimable: 0,
  lastScan: null,
  backButton: null,
  setCurrentView: (view) => set({ currentView: view, backButton: null }),
  setBackButton: (config) => set({ backButton: config }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setScanState: (state) => set({ scanState: state }),
  setScanProgress: (progress) => set({ scanProgress: progress }),
  setCurrentModule: (module) => set({ currentModule: module }),
  setTotalReclaimable: (size) => set({ totalReclaimable: size }),
  setLastScan: (date) => set({ lastScan: date }),
}));