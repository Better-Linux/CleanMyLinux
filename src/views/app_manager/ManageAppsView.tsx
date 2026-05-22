import { useEffect } from "react";
import { motion } from "framer-motion";
import { formatSize } from "./types";
import { useAppManagerStore } from "./store";
import { useAppStore } from "../../store/useAppStore";

export default function ManageAppsView() {
  const setBackButton = useAppStore((state) => state.setBackButton);
  const installedApps = useAppManagerStore((state) => state.installedApps);
  const searchQuery = useAppManagerStore((state) => state.searchQuery);
  const setSearchQuery = useAppManagerStore((state) => state.setSearchQuery);
  const activeFilter = useAppManagerStore((state) => state.activeFilter);
  const setActiveFilter = useAppManagerStore((state) => state.setActiveFilter);
  const setViewMode = useAppManagerStore((state) => state.setViewMode);
  const triggerUninstall = useAppManagerStore((state) => state.triggerUninstall);

  useEffect(() => {
    setBackButton({
      label: "Back",
      action: () => setViewMode("dashboard"),
    });
    return () => setBackButton(null);
  }, [setBackButton, setViewMode]);

  return (
    <div className="w-full max-w-6xl flex flex-col not-xl:px-10 justify-center">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-[28px] font-semibold text-white tracking-tight drop-shadow-md">
            Manage Applications
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Search apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-[13px] text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#14b4ff]/50 w-[200px] transition-all"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {(["All", "Flatpak", "Snap", "Unused"] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all shrink-0 ${
              activeFilter === filter
                ? "bg-[#14b4ff]/20 text-[#14b4ff] border border-[#14b4ff]/30"
                : "bg-white/5 text-white/70 hover:bg-white/10 border border-transparent"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="glass-panel rounded-3xl p-2 flex-1 overflow-y-auto max-h-[70%]">
        <div className="flex flex-col gap-1 p-2">
          {installedApps
            .filter((app) => {
              if (activeFilter !== "All") {
                if (activeFilter === "Unused") {
                  if (app.usage_score <= 0.5) return false;
                } else {
                  if (activeFilter.toLowerCase() !== app.source) return false;
                }
              }
              if (searchQuery) {
                return app.name.toLowerCase().includes(searchQuery.toLowerCase());
              }
              return true;
            })
            .sort((a, b) => b.size - a.size)
            .map((app, i) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.5) }}
                key={`${app.source}-${app.name}`}
                className="group flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden shrink-0 relative ${!app.icon&&"shadow-sm bg-white/10"}`}>
                    {app.icon ? (
                      <img
                        src={app.icon}
                        alt={app.name}
                        className="w-10 h-10 object-contain z-10 relative"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <span className="text-white/60 font-bold text-lg z-10 relative">
                        {app.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-white font-medium text-[15px]">{app.name}</span>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-white/10 text-white/70">
                        {app.source}
                      </span>
                      <span className="text-white/40 text-[12px]">{app.version}</span>
                      {app.vendor && (
                        <span className="text-white/40 text-[12px] flex items-center gap-1 max-w-[150px] truncate">
                          • {app.vendor}
                        </span>
                      )}
                      {app.usage_score > 0.0 && (
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide ${
                          app.usage_score > 0.75 
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" 
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}>
                          Unused for {app.days_untouched >= 60 ? `${Math.floor(app.days_untouched / 30)} months` : `${Math.floor(app.days_untouched)} days`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 pr-2">
                  <span className="text-white/60 text-[13px] font-medium min-w-[60px] text-right">
                    {formatSize(app.size)}
                  </span>

                  <button
                    onClick={() => triggerUninstall(app)}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 px-4 py-1.5 rounded-full text-[12px] font-semibold text-white transition-all duration-150"
                    style={{
                      background: "linear-gradient(135deg, #ef4444, #dc2626)",
                      boxShadow: "0 0 12px rgba(239,68,68,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
                    }}
                  >
                    Uninstall
                  </button>
                </div>
              </motion.div>
            ))}
          {installedApps.length === 0 && (
            <div className="p-10 text-center text-white/50 text-[14px]">
              No applications found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
