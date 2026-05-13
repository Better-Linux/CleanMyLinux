import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, AlertCircle, Loader2, Filter, ShieldAlert } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { formatSize } from "./types";
import { useAppManagerStore } from "./store";
import { useAppStore } from "../../store/useAppStore";
import UninstallModal from "./UninstallModal";
import InitialScanView from "./InitialScanView";

export default function UnusedAppsView() {
  const installedApps = useAppManagerStore((state) => state.installedApps);
  const scanState = useAppManagerStore((state) => state.scanState);
  const triggerUninstall = useAppManagerStore((state) => state.triggerUninstall);
  const setViewMode = useAppManagerStore((state) => state.setViewMode);
  const setBackButton = useAppStore((state) => state.setBackButton);

  const [search, setSearch] = useState("");
  const [activeTabFilter, setActiveTabFilter] = useState<"all" | "large" | "deep">("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkUninstalling, setIsBulkUninstalling] = useState(false);
  const [bulkProgressText, setBulkProgressText] = useState("");

  // Map contextual Top TitleBar back button to return to Smart Scan dashboard view
  useEffect(() => {
    setBackButton({
      label: "Back",
      action: () => setViewMode("dashboard"),
    });
    return () => setBackButton(null);
  }, [setBackButton, setViewMode]);

  // Base raw candidate array - Now simplified as the Backend handles system protection overwrites
  const rawUnusedApps = installedApps.filter((app) => app.usage_score > 0.0);

  // Fully cross-filtered application list
  const filteredApps = rawUnusedApps
    .filter((app) => {
      if (activeTabFilter === "large") return app.size >= 500 * 1024 * 1024; // >= 500 MB
      if (activeTabFilter === "deep") return app.days_untouched >= 60; // >= 2 Months
      return true;
    })
    .filter((app) => {
      if (!search) return true;
      return app.name.toLowerCase().includes(search.toLowerCase());
    })
    .sort((a, b) => b.days_untouched - a.days_untouched);

  const totalReclaimableBytes = filteredApps.reduce((sum, a) => sum + a.size, 0);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkUninstall = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkUninstalling(true);
    setBulkProgressText("Processing uninstalls...");

    const targetApps = rawUnusedApps.filter((a) => selectedIds.includes(`${a.source}-${a.name}`));

    try {
      await invoke("uninstall_app", {
        apps: targetApps.map((app) => ({
          name: app.name,
          package_id: app.package_id,
          source: app.source,
          icon: app.icon ?? null,
        })),
      });

      // Update installed maps natively instantly
      useAppManagerStore.setState((state) => ({
        installedApps: state.installedApps.filter(
          (a) => !selectedIds.includes(`${a.source}-${a.name}`)
        ),
        appCount: Math.max(0, state.appCount - targetApps.length),
      }));
    } catch (err) {
      console.error("Failed uninstallation batch", err);
    }

    setSelectedIds([]);
    setIsBulkUninstalling(false);
  };

  return (
       <>
      <div className="w-full max-w-6xl flex flex-col not-xl:px-10 justify-center">      
      <div className="mb-8">
          <h1 className="text-[32px] font-bold text-white tracking-tight drop-shadow-md mb-2">
            Unused Applications
          </h1>
          <p className="text-[#a1b0cb] text-[14px] font-medium max-w-2xl leading-relaxed">
            Applications untouched for over 14 days add residual profile overhead. Reclaim optimal workspace performance by auditing your long-term inactive packages.
          </p>
        </div>

        {/* Global Toolbar Dock: Quick-Filter Tabs, Search Input, and Bulk Triggers */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-20">
          
          {/* Quick-Filter Navigation Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            {[
              { id: "all", label: "All Unused", badge: rawUnusedApps.length },
              { id: "large", label: "Critical Size (>500MB)", badge: rawUnusedApps.filter((a) => a.size >= 500 * 1024 * 1024).length },
              { id: "deep", label: "Deeply Forgotten (>60d)", badge: rawUnusedApps.filter((a) => a.days_untouched >= 60).length },
            ].map((tab) => {
              const isActive = activeTabFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTabFilter(tab.id as any)}
                  className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all relative shrink-0 flex items-center gap-2 cursor-pointer ${
                    isActive 
                      ? "text-white bg-white/10 border-white/20 shadow-sm" 
                      : "text-white/60 bg-white/3 border-transparent hover:bg-white/5 hover:text-white/90"
                  } border`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                    isActive ? "bg-amber-500/20 text-amber-300" : "bg-white/5 text-white/40"
                  }`}>
                    {tab.badge}
                  </span>
                  {isActive && (
                    <motion.div 
                      layoutId="activeFilterGlow"
                      className="absolute inset-0 rounded-xl border border-amber-500/30 pointer-events-none"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Core Action Items Dock */}
          <div className="flex items-center gap-3 flex-wrap shrink-0">
            
            {/* Aggregate Reclaimable Statistics Badge */}
            <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 shadow-inner">
              <span className="text-white/40 text-[12px] font-medium">Reclaimable:</span>
              <span className="text-amber-400 font-bold text-[13px]">
                {formatSize(totalReclaimableBytes)}
              </span>
            </div>

            {/* Search filter input */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
              <input
                type="text"
                placeholder="Search stale..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={isBulkUninstalling}
                className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-[13px] text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-500/40 w-[140px] focus:w-[180px] transition-all duration-300 disabled:opacity-50"
              />
            </div>

            {/* Bulk Execution Button */}
            <AnimatePresence>
              {selectedIds.length > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={handleBulkUninstall}
                  disabled={isBulkUninstalling}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-all duration-200 cursor-pointer shadow-lg disabled:opacity-75 shrink-0 relative overflow-hidden group"
                  style={{
                    background: "linear-gradient(135deg, #ef4444, #dc2626)",
                    boxShadow: "0 0 20px rgba(239,68,68,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
                  }}
                >
                  {isBulkUninstalling ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white shrink-0" />
                      <span className="font-bold tracking-wide">{bulkProgressText || "Processing..."}</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4 text-white shrink-0" />
                      <span className="font-bold tracking-wide">Uninstall Selected ({selectedIds.length})</span>
                    </>
                  )}
                </motion.button>
              )}
            </AnimatePresence>

          </div>

        </div>

        {/* Dynamic Scanning Spinner State */}
        {(scanState === "initial" || scanState === "scanning") ? (
          <InitialScanView />
        ) : (
          /* Rendered Grid / List Output Container */
          <div className="glass-panel rounded-3xl p-2.5 flex-1 overflow-y-auto max-h-[70%] border border-white/5">
            <div className="flex flex-col gap-1.5 p-1.5">
            <div className="flex flex-col gap-1.5 p-1.5">
              <AnimatePresence mode="wait">
                {filteredApps.length > 0 ? (
                  <motion.div
                    key="unused-list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-1.5"
                  >
                    {filteredApps.map((app, i) => {
                      const uid = `${app.source}-${app.name}`;
                      const isSelected = selectedIds.includes(uid);
                      const isDeeplyStale = app.usage_score > 0.75;

                      return (
                        <motion.div
                          layout
                          initial={{ y: 15 }}
                          animate={{ y: 0 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          transition={{ 
                            layout: { type: "spring", stiffness: 400, damping: 30 },
                            opacity: { duration: 0.2 },
                            y: { duration: 0.25, delay: Math.min(i * 0.015, 0.3) }
                          }}
                          key={uid}
                          onClick={() => !isBulkUninstalling && toggleSelect(uid)}
                          className={`group flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer relative overflow-hidden ${
                            isSelected
                              ? "bg-white/8 border-white/12 shadow-sm"
                              : "bg-white/2 border-white/3 hover:bg-white/5 hover:border-white/8"
                          }`}
                        >
                          <div className="flex items-center gap-4 relative z-10">
                            
                            {/* Custom Animated UI Checkbox Container */}
                            <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
                              <motion.div
                                initial={false}
                                animate={{
                                  scale: isSelected ? 1 : 0.8,
                                  opacity: isSelected ? 1 : 0,
                                }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className="absolute inset-0 rounded-md bg-linear-to-tr from-amber-500 to-rose-600 shadow-xs shadow-amber-500/30"
                              />
                              <div
                                className={`absolute inset-0 rounded-md border transition-colors duration-200 ${
                                  isSelected
                                    ? "border-transparent"
                                    : "border-white/20 bg-white/5 group-hover:border-white/40"
                                }`}
                              />
                              <svg
                                className="absolute z-10 w-3 h-3 text-white pointer-events-none"
                                viewBox="0 0 16 16"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <motion.polyline
                                  points="3.5 8 7 11.5 12.5 4.5"
                                  initial={false}
                                  animate={{
                                    pathLength: isSelected ? 1 : 0,
                                    opacity: isSelected ? 1 : 0,
                                  }}
                                  transition={{
                                    pathLength: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
                                    opacity: { duration: 0.1 },
                                  }}
                                />
                              </svg>
                            </div>

                            {/* Beautiful Square Pack Icon Wrapper */}
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden shrink-0 relative ${!app.icon && "shadow-xs bg-white/10"}`}>
                              {app.icon ? (
                                <img
                                  src={app.icon}
                                  alt={app.name}
                                  className="w-9 h-9 object-contain z-10 relative"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).style.display = "none";
                                  }}
                                />
                              ) : (
                                <span className="text-white/60 font-extrabold text-md z-10 relative">
                                  {app.name.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>

                            {/* Title block & Contextual Duration Badge */}
                            <div className="flex flex-col">
                              <span className="text-white font-bold text-[15px] leading-tight">
                                {app.name}
                              </span>
                              
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-widest bg-white/10 text-white/70 border border-white/5">
                                  {app.source}
                                </span>
                                <span className="text-white/40 text-[12px] font-medium">{app.version}</span>

                                {/* Elevated Duration Badge */}
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide flex items-center gap-1 ${
                                  isDeeplyStale
                                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                }`}>
                                  <AlertCircle size={10} strokeWidth={2.5} />
                                  <span>Unused for {app.days_untouched >= 60 ? `${Math.floor(app.days_untouched / 30)} months` : `${Math.floor(app.days_untouched)} days`}</span>
                                </span>
                              </div>
                            </div>

                          </div>

                          {/* Right-Aligned File Data Block & Protected One-Click Action Trigger */}
                          <div className="flex items-center gap-6 pr-2 relative z-10">
                            <span className="text-white/50 group-hover:text-white/80 text-[13px] font-bold min-w-[65px] text-right transition-colors duration-200">
                              {formatSize(app.size)}
                            </span>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isBulkUninstalling) triggerUninstall(app);
                              }}
                              disabled={isBulkUninstalling}
                              className="opacity-0 group-hover:opacity-100 focus:opacity-100 px-4 py-1.5 rounded-full text-[12px] font-extrabold text-white transition-all duration-200 disabled:opacity-0 cursor-pointer"
                              style={{
                                background: "linear-gradient(135deg, #ef4444, #dc2626)",
                                boxShadow: "0 0 12px rgba(239,68,68,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
                              }}
                            >
                              Uninstall
                            </button>
                          </div>

                        </motion.div>
                      );
                    })}
                  </motion.div>
                ) : scanState === "results" && (
                  <motion.div 
                    key="no-unused-found"
                    initial={{ opacity: 0, y: 15 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="p-16 flex flex-col items-center text-center gap-3 my-4"
                  >
                    <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center text-white/30 mb-2 border border-white/5">
                      <History size={28} strokeWidth={1.5} />
                    </div>
                    <span className="text-white/80 font-bold text-[16px]">
                      No matching applications found
                    </span>
                    <span className="text-white/40 text-[13px] max-w-sm">
                      {search || activeTabFilter !== "all" 
                        ? "Try adjusting your live subfilter tags or search terms to display items."
                        : "Awesome! Your operating system contains zero stale applications untouched for over 14 days."}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            </div>
          </div>
        )}
      </div>

      {/* Embedded Single App Uninstall Modal wrapper matching layout layers */}
      <UninstallModal />
    </>
  );
}
