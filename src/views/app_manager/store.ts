import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  AppInfo,
  SystemApps,
  UpdateItem,
  UpdateInfo,
  AppStatus,
  AppUpdateStatus,
} from "./types";

interface AppManagerStore {
  // Scan state
  scanState: "initial" | "scanning" | "results";
  appCount: number;
  updateCount: number;
  updates: UpdateItem[];
  installedApps: AppInfo[];
  updatesLoading: boolean;
  handleScan: () => Promise<void>;
  setScanState: (state: "initial" | "scanning" | "results") => void;

  viewMode: "dashboard" | "manage" | "update" | "unused";
  setViewMode: (mode: "dashboard" | "manage" | "update" | "unused") => void;

  searchQuery: string;
  setSearchQuery: (query: string) => void;

  activeFilter: "All" | "Flatpak" | "Snap" | "System" | "Unused";
  setActiveFilter: (filter: "All" | "Flatpak" | "Snap" | "System" | "Unused") => void;

  // Update flow
  modalPhase: "confirm" | "progress" | "done";
  setModalPhase: (phase: "confirm" | "progress" | "done") => void;
  appStatuses: AppUpdateStatus[];
  setAppStatuses: (statuses: AppUpdateStatus[]) => void;
  selectedPackageIds: string[];
  togglePackageSelection: (packageId: string) => void;
  selectAllPackages: () => void;
  handleStartUpdate: () => Promise<void>;

  // Uninstall modal flow
  uninstallModalOpen: boolean;
  setUninstallModalOpen: (open: boolean) => void;
  uninstallPhase: "confirm" | "progress" | "error" | "system_alert";
  appToUninstall: AppInfo | null;
  uninstallError: string;
  triggerUninstall: (app: AppInfo) => void;
  executeUninstall: () => Promise<void>;
}

export const useAppManagerStore = create<AppManagerStore>((set, get) => ({
  // Scan state
  scanState: "initial",
  appCount: 0,
  updateCount: 0,
  updates: [],
  installedApps: [],
  updatesLoading: false,

  handleScan: async () => {
    set({ scanState: "scanning", updatesLoading: true });

    // 1. Fire-and-forget: Trigger updates checking instantly in the background
    invoke<UpdateInfo>("get_available_updates").then((updatesResult) => {
      set({
        updateCount: updatesResult.total_count,
        updates: updatesResult.updates,
        selectedPackageIds: updatesResult.updates
          .filter((u) => u.source !== "snap" || !u.new_version.includes("(via latest/stable)"))
          .map((u) => u.package_id),
        appStatuses: updatesResult.updates.map((u) => ({
          name: u.name,
          source: u.source,
          icon: u.icon,
          status: "waiting",
        })),
        updatesLoading: false,
      });
    }).catch((err) => {
      console.error("Failed to fetch system updates in background:", err);
      set({ updatesLoading: false });
    });

    // 2. Fetch installed apps and transition instantly (takes <0.1s)
    try {
      const appsResult = await invoke<SystemApps>("get_installed_apps");
      set({
        appCount: appsResult.total_count,
        installedApps: appsResult.apps,
        scanState: "results",
      });
    } catch (err) {
      console.error("Application scan failed:", err);
      set({ scanState: "results", updatesLoading: false });
    }
  },

  setScanState: (state) => set({ scanState: state }),

  // View state
  viewMode: "dashboard",
  setViewMode: (mode) => set({ viewMode: mode }),

  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),

  activeFilter: "All",
  setActiveFilter: (filter) => set({ activeFilter: filter }),

  // Update flow
  modalPhase: "confirm",
  setModalPhase: (phase) => set({ modalPhase: phase }),
  appStatuses: [],
  setAppStatuses: (statuses) => set({ appStatuses: statuses }),
  selectedPackageIds: [],
  togglePackageSelection: (packageId) =>
    set((state) => {
      const exists = state.selectedPackageIds.includes(packageId);
      return {
        selectedPackageIds: exists
          ? state.selectedPackageIds.filter((id) => id !== packageId)
          : [...state.selectedPackageIds, packageId],
      };
    }),
  selectAllPackages: () =>
    set((state) => {
      const withoutOptional = state.updates.filter((u) => u.source !== "snap" || !u.new_version.includes("(via latest/stable)"));

      const allSelected = state.selectedPackageIds.length === withoutOptional.length;
      return {
        selectedPackageIds: allSelected ? [] : withoutOptional.map((u) => u.package_id),
      };
    }),

  handleStartUpdate: async () => {
    const { selectedPackageIds, updates } = get();
    if (selectedPackageIds.length === 0) return;

    set({ modalPhase: "progress" });

    set((state) => ({
      appStatuses: state.appStatuses.map((a) => {
        const matchingUpdate = updates.find((u) => u.name === a.name);
        const isSelected = matchingUpdate && selectedPackageIds.includes(matchingUpdate.package_id);
        return {
          ...a,
          status: isSelected ? "waiting" : a.status,
        };
      }),
    }));

    const unlisten = await listen<{ app_name: string; status: string }>(
      "update-progress",
      (event: any) => {
        const { app_name, status } = event.payload;
        set((state) => ({
          appStatuses: state.appStatuses.map((a) =>
            a.name === app_name ? { ...a, status: status as AppStatus } : a
          ),
        }));
      }
    );

    try {
      const targetUpdates = updates.filter((u) => selectedPackageIds.includes(u.package_id));
      await invoke("run_app_updates", { updates: targetUpdates });
    } catch {
      // Preserve status
    } finally {
      unlisten();
      set((state) => {
        const successfulAppNames = state.appStatuses
          .filter((a) => a.status === "done")
          .map((a) => a.name);

        const remainingUpdates = state.updates.filter((u) => !successfulAppNames.includes(u.name));
        const hasErrors = state.appStatuses.some((a) => a.status === "error");

        return {
          appStatuses: state.appStatuses.map((a) => ({
            ...a,
            status: (a.status === "waiting" || a.status === "updating") && !hasErrors ? "done" : a.status,
          })),
          modalPhase: "confirm",
          updates: remainingUpdates,
          updateCount: remainingUpdates.length,
          selectedPackageIds: remainingUpdates
            .filter((u) => u.source !== "snap" || !u.new_version.includes("(via latest/stable)"))
            .map((u) => u.package_id),
        };
      });
    }
  },

  // Uninstall modal flow
  uninstallModalOpen: false,
  setUninstallModalOpen: (open) => set({ uninstallModalOpen: open }),
  uninstallPhase: "confirm",
  appToUninstall: null,
  uninstallError: "",

  triggerUninstall: (app) => {
    const cats = app.categories?.toLowerCase() || "";
    const isCoreOsApp =
      app.source === "Native" &&
      (cats.includes("settings") ||
        cats.includes("system") ||
        cats.includes("packagemanager") ||
        cats.includes("desktopsettings") ||
        cats.includes("core") ||
        app.has_polkit ||
        app.has_systemd ||
        app.has_etc ||
        !app.is_manual);

    const phase = !app.is_user_app || isCoreOsApp ? "system_alert" : "confirm";

    set({
      appToUninstall: app,
      uninstallPhase: phase,
      uninstallError: "",
      uninstallModalOpen: true,
    });
  },

  executeUninstall: async () => {
    const { appToUninstall } = get();
    if (!appToUninstall) return;

    set({ uninstallPhase: "progress" });

    try {
      await invoke("uninstall_app", {
        apps: [
          {
            name: appToUninstall.name,
            package_id: appToUninstall.package_id,
            source: appToUninstall.source,
            icon: appToUninstall.icon ?? null,
          },
        ],
      });

      set((state) => ({
        installedApps: state.installedApps.filter(
          (a) => !(a.name === appToUninstall.name && a.source === appToUninstall.source)
        ),
        appCount: state.appCount - 1,
        uninstallModalOpen: false,
        appToUninstall: null,
      }));
    } catch (err) {
      set({
        uninstallError: String(err),
        uninstallPhase: "error",
      });
    }
  },
}));
