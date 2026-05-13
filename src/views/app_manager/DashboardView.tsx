import { useEffect } from "react";
import { useAppManagerStore } from "./store";
import { useAppStore } from "../../store/useAppStore";

export default function DashboardView() {
  const setBackButton = useAppStore((state) => state.setBackButton);
  const appCount = useAppManagerStore((state) => state.appCount);
  const updateCount = useAppManagerStore((state) => state.updateCount);
  const updates = useAppManagerStore((state) => state.updates);
  const setViewMode = useAppManagerStore((state) => state.setViewMode);
  const setScanState = useAppManagerStore((state) => state.setScanState);
  const setAppStatuses = useAppManagerStore((state) => state.setAppStatuses);
  const installedApps = useAppManagerStore((state) => state.installedApps);

  const unusedApps = installedApps.filter(a => a.usage_score > 0.0);
  const unusedSizeBytes = unusedApps.reduce((sum, a) => sum + a.size, 0);

  const showUpdates = updateCount > 0;
  const showUnused = unusedApps.length > 0;
  const hasAlerts = showUpdates || showUnused;
  const showBoth = showUpdates && showUnused;

  const formatSizeNice = (bytes: number) => {
    if (bytes === 0) return "0 MB";
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1).replace(".", ",")} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
  };

  useEffect(() => {
    setBackButton({
      label: "Start Over",
      action: () => setScanState("initial"),
    });
    return () => setBackButton(null);
  }, [setBackButton, setScanState]);

  return (
    <div className={`w-full max-w-6xl flex flex-col not-xl:px-10 h-full ${!hasAlerts ? "justify-center" : "justify-evenly"}`}>
      
      {/* Main Header */}
      <div className={`flex flex-col items-center justify-center relative transition-all duration-500 ${!hasAlerts ? "mb-12" : "mb-6"}`}>
        <h1
          className="text-[34px] font-semibold text-white mb-6 tracking-tight drop-shadow-lg text-center"
          style={{ textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}
        >
          We've found {appCount} apps on your Linux.
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode("manage")}
            className="glass-btn px-8 py-3 rounded-xl text-[15px] font-bold tracking-wide hover:shadow-[0_0_25px_rgba(20,180,255,0.3)] border-[#1cd1ff]/20 hover:border-[#1cd1ff]/50 transition-all"
          >
            Manage My Applications
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      {hasAlerts && (
        <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-6 mt-8">
          
          {/* Updates Card */}
          {showUpdates && (
            <div className={`h-full ${showBoth ? "md:col-span-6" : "md:col-span-6 md:col-start-4"}`}>
              <div className="glass-panel rounded-3xl p-8 h-full flex flex-col relative overflow-hidden group transition-all duration-300 hover:shadow-[0_15px_40px_rgba(0,0,0,0.5)]">
                <h2 className="text-[20px] font-semibold text-white mb-1 leading-tight drop-shadow-md">
                  {updateCount} Application Update{updateCount !== 1 ? "s" : ""}
                  <br />
                  Available
                </h2>
                <p className="text-[#a1b0cb] text-[13px] leading-relaxed mb-5 font-medium">
                  Update your software to keep up with the latest features.
                </p>

                <div className="flex-1 overflow-hidden" style={{ maskImage: "linear-gradient(to bottom, black 60%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, black 60%, transparent 100%)" }}>
                  <div className="space-y-2.5">
                    {updates.slice(0, 4).map((update, i) => {
                      const iconUrl = update.icon ?? null;
                      const fallbackColors = ["from-[#f97316] to-[#dc2626]", "from-[#3b82f6] to-[#1d4ed8]", "from-[#22c55e] to-[#15803d]", "from-[#a855f7] to-[#7c3aed]", "from-[#ec4899] to-[#be185d]", "from-[#14b8a6] to-[#0f766e]"];
                      const grad = fallbackColors[update.name.charCodeAt(0) % fallbackColors.length];
                      return (
                        <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-white/5 hover:bg-white/8 transition-colors">
                          <div className="relative shrink-0 w-9 h-9 rounded-xl overflow-hidden">
                            {iconUrl ? (
                              <img src={iconUrl} alt={update.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className={`w-full h-full bg-linear-to-br ${grad} flex items-center justify-center`}>
                                <span className="text-white font-bold text-[14px]">{update.name.charAt(0).toUpperCase()}</span>
                              </div>
                            )}
                          </div>
                          <p className="flex-1 text-white text-[13px] font-semibold truncate">{update.name}</p>
                          <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-[#14b4ff]/10 text-[#14b4ff] border border-[#14b4ff]/20">
                            {update.source}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    className="glass-btn-primary px-6 py-2 rounded-xl text-[13px]"
                    onClick={() => {
                      const statuses = updates.map((u) => ({ name: u.name, source: u.source, icon: u.icon, status: "waiting" as const }));
                      setAppStatuses(statuses);
                      setViewMode("update");
                    }}
                  >
                    Update Now
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Unused Apps Card */}
          {showUnused && (
            <div className={`h-full ${showBoth ? "md:col-span-6" : "md:col-span-6 md:col-start-4"}`}>
              <div className="glass-panel rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden group hover:shadow-[0_15px_40px_rgba(0,0,0,0.5)] transition-all duration-300 h-full min-h-55">
                <div>
                  <div className="flex justify-between items-start mb-4 gap-4">
                    <h2 className="text-[20px] font-semibold text-white drop-shadow-md leading-tight">
                      {unusedApps.length} Unused Application{unusedApps.length !== 1 ? "s" : ""}<br />Detected
                    </h2>
                    <div className="flex items-center -space-x-4 pr-2 shrink-0">
                      {unusedApps.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 3).map((app, i) => (
                        <div key={i} className="w-11 h-11 rounded-xl flex items-center justify-center transform transition-all duration-300 group-hover:-translate-y-1 relative overflow-hidden" style={{ zIndex: 30 - i * 10 }}> 
                          {app.icon ? <img src={app.icon} alt={app.name} className="w-full h-full object-contain p-0.5" /> : <span className="font-bold text-[15px] text-white/40">{app.name.charAt(0).toUpperCase()}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-[#a1b0cb] text-[13px] font-medium leading-relaxed max-w-[85%]">
                    These applications haven't been used recently. Removing them could reclaim up to {formatSizeNice(unusedSizeBytes)} of disk space.
                  </p>
                </div>

                <div className="flex justify-end pt-4 mt-auto">
                  <button onClick={() => setViewMode("unused")} className="glass-btn px-8 py-2.5 rounded-xl text-[13px] font-semibold tracking-wide mt-10">
                    Review Unused Apps
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
