import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { useAppManagerStore } from "./store";
import { useAppStore } from "../../store/useAppStore";

export default function UpdatesView() {
  const setBackButton = useAppStore((state) => state.setBackButton);
  const updates = useAppManagerStore((state) => state.updates);
  const appStatuses = useAppManagerStore((state) => state.appStatuses);
  const modalPhase = useAppManagerStore((state) => state.modalPhase);
  const setViewMode = useAppManagerStore((state) => state.setViewMode);
  const setModalPhase = useAppManagerStore((state) => state.setModalPhase);
  const handleStartUpdate = useAppManagerStore((state) => state.handleStartUpdate);
  const selectedPackageIds = useAppManagerStore((state) => state.selectedPackageIds);
  const togglePackageSelection = useAppManagerStore((state) => state.togglePackageSelection);
  const selectAllPackages = useAppManagerStore((state) => state.selectAllPackages);

  useEffect(() => {
    setBackButton({
      label: "Back",
      action: () => setViewMode("dashboard"),
    });
    return () => setBackButton(null);
  }, [setBackButton, setViewMode]);

  const allSelected = updates.length > 0 && selectedPackageIds.length === updates.length;

  return (
    <motion.div 
      className="w-full max-w-6xl flex flex-col h-full justify-center not-xl:px-10"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-[28px] font-semibold text-white tracking-tight drop-shadow-md">
            Application Updates
          </h1>
        </div>
        {modalPhase !== "progress" && updates.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={selectAllPackages}
              className="glass-btn px-4 py-2 rounded-xl text-[13px] font-medium text-white/80 hover:text-white cursor-pointer"
            >
              {allSelected ? "Deselect All" : "Select All"}
            </button>
            <button
              onClick={handleStartUpdate}
              disabled={selectedPackageIds.length === 0}
              className={`px-6 py-2 rounded-xl text-[13px] font-semibold transition-all duration-300 cursor-pointer ${
                selectedPackageIds.length > 0
                  ? "glass-btn-primary shadow-lg shadow-blue-500/20"
                  : "bg-white/5 text-white/30 border border-white/5 cursor-not-allowed"
              }`}
            >
              Update Selected ({selectedPackageIds.length})
            </button>
          </div>
        )}
      </div>

      {/* Main list view container */}
      <div className="glass-panel rounded-3xl p-6 flex-1 overflow-y-auto custom-scrollbar flex flex-col max-h-[70%]">


        {modalPhase === "done" ? (
          <motion.div
            className="flex flex-col items-center justify-center m-auto py-12 gap-4 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <motion.div 
              className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              <CheckCircle2 className="w-8 h-8" />
            </motion.div>
            <div>
              <h3 className="text-white font-bold text-lg">Updates Successfully Applied</h3>
              <p className="text-white/60 text-[13px] mt-1">
                All selected software layers have been cleanly staged and verified.
              </p>
            </div>
            <button
              onClick={() => {
                setModalPhase("confirm");
                setViewMode("dashboard");
              }}
              className="mt-2 glass-btn px-6 py-2 rounded-xl text-[13px] font-semibold cursor-pointer"
            >
              Return to Hub
            </button>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-6 flex-1">
            {/* SECTION 1: Standard Direct Upstream Updates */}
            {updates.filter((u) => !u.new_version.includes("(via latest/stable)")).length > 0 && (
              <div className="flex flex-col gap-2.5">
                <span className="text-white/40 text-xs font-bold uppercase tracking-wider px-1">
                  Standard Stream ({updates.filter((u) => !u.new_version.includes("(via latest/stable)")).length})
                </span>
                <AnimatePresence initial={false}>
                  {updates
                    .filter((u) => !u.new_version.includes("(via latest/stable)"))
                    .map((app) => {
                      const isSelected = selectedPackageIds.includes(app.package_id);
                      const currentStatusObj = appStatuses.find((a) => a.name === app.name);
                      const status = currentStatusObj?.status || "waiting";

                      return (
                        <motion.div
                          layout
                          key={app.package_id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          onClick={() => modalPhase !== "progress" && togglePackageSelection(app.package_id)}
                          className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200 ${
                            modalPhase !== "progress" ? "cursor-pointer" : ""
                          } ${
                            isSelected 
                              ? "bg-white/8 border-white/10 shadow-xs" 
                              : "bg-white/3 border-white/3 hover:bg-white/5"
                          }`}
                        >
                          <div className="flex items-center gap-3.5">
                            {modalPhase !== "progress" && (
                              <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
                                <motion.div
                                  initial={false}
                                  animate={{
                                    scale: isSelected ? 1 : 0.8,
                                    opacity: isSelected ? 1 : 0,
                                  }}
                                  transition={{ duration: 0.2, ease: "easeOut" }}
                                  className="absolute inset-0 rounded-md bg-linear-to-tr from-[#14b4ff] to-[#6040ff] shadow-xs shadow-[#14b4ff]/40"
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
                                  strokeWidth="3"
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
                            )}

                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/5 shrink-0 flex items-center justify-center border border-white/5">
                              {app.icon ? (
                                <img src={app.icon} alt={app.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-white font-bold text-[14px]">
                                  {app.name.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="text-white text-[14px] font-semibold leading-tight">{app.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="px-1.5 py-0.5 rounded-md bg-white/5 text-white/40 text-[9px] font-bold uppercase tracking-wider border border-white/5">
                                  {app.source}
                                </span>
                                <span className="text-white/40 text-[11px] font-medium flex items-center gap-1">
                                  {app.current_version} <ArrowRight className="w-3 h-3 text-white/30" />{" "}
                                  <span className="text-white/80 font-semibold">{app.new_version}</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {modalPhase === "progress" && isSelected && status === "waiting" && (
                              <span className="text-white/40 text-[12px] font-medium animate-pulse">In Queue</span>
                            )}
                            {modalPhase === "progress" && isSelected && status === "updating" && (
                              <span className="text-[#14b4ff] text-[12px] font-semibold flex items-center gap-1.5">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating
                              </span>
                            )}
                            {status === "done" && (
                              <span className="text-green-400 text-[12px] font-semibold flex items-center gap-1">
                                ✓ Completed
                              </span>
                            )}
                            {status === "error" && (
                              <div className="flex flex-col items-end">
                                <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 text-[11px] font-bold border border-red-500/20 shadow-xs">
                                  ⚠️ Permission Error / Failed
                                </span>
                                <span className="text-white/40 text-[10px] mt-0.5 max-w-[150px] truncate" title="Authentication cancelled or missing package permission">
                                  Action aborted
                                </span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                </AnimatePresence>
              </div>
            )}

            {/* SECTION 2: Demarcated Optional Channel Tracks */}
            {updates.filter((u) => u.new_version.includes("(via latest/stable)")).length > 0 && (
              <div className="flex flex-col gap-2.5 pt-2">
                <div className="flex flex-col gap-0.5 px-1 mb-1">
                  <span className="text-amber-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    Optional Cross Track Streams ({updates.filter((u) => u.new_version.includes("(via latest/stable)")).length})
                  </span>
                  <span className="text-white/60 text-[11px] leading-tight">
                    These applications are locked to sub channels. Checking them triggers an upgrade sandbox track jump to upstream build.
                  </span>
                </div>
                <AnimatePresence initial={false}>
                  {updates
                    .filter((u) => u.new_version.includes("(via latest/stable)"))
                    .map((app) => {
                      const isSelected = selectedPackageIds.includes(app.package_id);
                      const currentStatusObj = appStatuses.find((a) => a.name === app.name);
                      const status = currentStatusObj?.status || "waiting";

                      return (
                        <motion.div
                          layout
                          key={app.package_id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          onClick={() => modalPhase !== "progress" && togglePackageSelection(app.package_id)}
                          className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200 ${
                            modalPhase !== "progress" ? "cursor-pointer" : ""
                          } ${
                            isSelected 
                              ? "bg-amber-500/10 border-amber-500/20 shadow-xs" 
                              : "bg-white/3 border-white/3 hover:bg-white/5"
                          }`}
                        >
                          <div className="flex items-center gap-3.5">
                            {modalPhase !== "progress" && (
                              <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
                                <motion.div
                                  initial={false}
                                  animate={{
                                    scale: isSelected ? 1 : 0.8,
                                    opacity: isSelected ? 1 : 0,
                                  }}
                                  transition={{ duration: 0.2, ease: "easeOut" }}
                                  className="absolute inset-0 rounded-md bg-linear-to-tr from-[#f59e0b] to-[#d97706] shadow-xs shadow-amber-500/40"
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
                                  strokeWidth="3"
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
                            )}

                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/5 shrink-0 flex items-center justify-center border border-white/5 relative">
                              {app.icon ? (
                                <img src={app.icon} alt={app.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-white font-bold text-[14px]">
                                  {app.name.charAt(0).toUpperCase()}
                                </span>
                              )}
                              <div className="absolute inset-0 bg-amber-500/10 border border-amber-500/30 rounded-xl pointer-events-none" />
                            </div>

                            <div className="flex flex-col py-0.5">
                              <div className="flex items-center gap-2">
                                <p className="text-amber-300 text-[14px] font-bold leading-tight flex items-center gap-1.5">
                                  <span>{app.name}</span>
                                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded-md font-extrabold tracking-widest uppercase">
                                    Track Jump
                                  </span>
                                </p>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-[9px] font-bold uppercase tracking-wider border border-amber-500/20 shrink-0">
                                  {app.source}
                                </span>
                                <span className="text-white/60 text-[11px] font-medium flex items-center gap-1.5">
                                  <span className="line-through decoration-amber-500/60">{app.current_version}</span> 
                                  <ArrowRight className="w-3 h-3 text-amber-400 shrink-0" />
                                  <span className="text-white font-bold bg-white/5 px-1.5 py-0.2 rounded border border-white/5 text-[11px]">
                                    {app.new_version.replace(" (via latest/stable)", "")}
                                  </span>
                                </span>
                              </div>
                              <p className="text-amber-400/80 text-[10px] mt-0.5 italic leading-tight">
                                Available on upstream stream
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {modalPhase === "progress" && isSelected && status === "waiting" && (
                              <span className="text-white/40 text-[12px] font-medium animate-pulse">In Queue</span>
                            )}
                            {modalPhase === "progress" && isSelected && status === "updating" && (
                              <span className="text-[#14b4ff] text-[12px] font-semibold flex items-center gap-1.5">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating
                              </span>
                            )}
                            {status === "done" && (
                              <span className="text-green-400 text-[12px] font-semibold flex items-center gap-1">
                                ✓ Completed
                              </span>
                            )}
                            {status === "error" && (
                              <div className="flex flex-col items-end">
                                <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 text-[11px] font-bold border border-red-500/20 shadow-xs">
                                  Error
                                </span>
                                <span className="text-white/40 text-[10px] mt-0.5 max-w-[150px] truncate" title="Authentication cancelled or missing package permission">
                                  Action aborted
                                </span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                </AnimatePresence>
              </div>
            )}

            {updates.length === 0 && (
              <motion.div className="m-auto text-center text-white/40 text-[14px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                No pending software updates staged. System is in peak condition.
              </motion.div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
