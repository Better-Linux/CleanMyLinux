import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { formatSize } from "./types";
import { useAppManagerStore } from "./store";

export default function UninstallModal() {
  const isOpen = useAppManagerStore((state) => state.uninstallModalOpen);
  const appToUninstall = useAppManagerStore((state) => state.appToUninstall);
  const uninstallPhase = useAppManagerStore((state) => state.uninstallPhase);
  const uninstallError = useAppManagerStore((state) => state.uninstallError);
  const setUninstallModalOpen = useAppManagerStore((state) => state.setUninstallModalOpen);
  const executeUninstall = useAppManagerStore((state) => state.executeUninstall);

  const onClose = () => setUninstallModalOpen(false);

  return (
    <AnimatePresence>
      {isOpen && appToUninstall && (
        <motion.div
          key="uninstall-modal"
          className="fixed inset-0 z-100 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Backdrop with radial glow */}
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse at 50% 40%, rgba(239,68,68,0.12) 0%, rgba(5,7,15,0.85) 80%)",
            }}
            onClick={() => uninstallPhase !== "progress" && onClose()}
          />

          {/* Modal Box */}
          <motion.div
            className="relative w-full max-w-[440px] rounded-[32px] overflow-hidden flex flex-col shadow-2xl"
            style={{
              background: "linear-gradient(160deg, rgba(25,20,30,0.98) 0%, rgba(10,8,12,0.99) 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(239,68,68,0.1), inset 0 1px 0 rgba(255,255,255,0.07)",
            }}
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            {/* Top accent line (Danger Red) */}
            <div
              className="absolute top-0 inset-x-0 h-px"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(239,68,68,0.6) 40%, rgba(249,115,22,0.5) 60%, transparent)",
              }}
            />

            {/* Ambient inner glow */}
            <div
              className="absolute top-0 inset-x-0 h-40 pointer-events-none"
              style={{
                background: "radial-gradient(circle at 50% 0%, rgba(239,68,68,0.08) 0%, transparent 70%)",
              }}
            />

            {/* ── Content ── */}
            <div className="relative px-10 pt-10 pb-8 text-center">
              {/* App Icon with 3D Effect & Ambient Glow */}
              <div className="relative mb-6">
                <motion.div
                  animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute inset-0 blur-2xl rounded-full"
                  style={{ background: "rgba(239,68,68,0.2)" }}
                />

                <div className="relative w-20 h-20 mx-auto rounded-3xl bg-white/5 flex items-center justify-center overflow-hidden shadow-2xl border border-white/10">
                  <div className="absolute inset-0 bg-linear-to-b from-white/15 to-transparent pointer-events-none" />
                  {appToUninstall.icon ? (
                    <img
                      src={appToUninstall.icon}
                      alt={appToUninstall.name}
                      className="w-14 h-14 object-contain z-10 relative drop-shadow-lg"
                    />
                  ) : (
                    <span className="text-white/60 font-bold text-3xl z-10 relative">
                      {appToUninstall.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              <AnimatePresence mode="wait">
                {uninstallPhase === "system_alert" && (
                  <motion.div
                    key="system-alert"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                  >
                    <h3 className="text-[22px] font-bold text-white mb-3 tracking-tight">System Application</h3>
                    <p className="text-[#a1b0cb] text-[14.5px] leading-relaxed">
                      <span className="font-bold text-white">{appToUninstall.name}</span> is essential for your Linux system. Uninstalling it might cause instability.
                    </p>
                  </motion.div>
                )}

                {uninstallPhase === "confirm" && (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                  >
                    <h3 className="text-[22px] font-bold text-white mb-3 tracking-tight">Uninstall Application?</h3>
                    <p className="text-[#a1b0cb] text-[14.5px] leading-relaxed">
                      Are you sure you want to permanently remove <span className="font-bold text-white">{appToUninstall.name}</span>? This will reclaim{" "}
                      <span className="text-[#f87171] font-bold">{formatSize(appToUninstall.size)}</span> of space.
                    </p>
                  </motion.div>
                )}

                {uninstallPhase === "progress" && (
                  <motion.div
                    key="progress"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                  >
                    <h3 className="text-[22px] font-bold text-white mb-3 tracking-tight">Uninstalling...</h3>
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/5 border border-white/5">
                        <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                        <span className="text-[#a1b0cb] text-[13px] font-medium uppercase tracking-wider">
                          Removing {appToUninstall.source} package
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {uninstallPhase === "error" && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                  >
                    <h3 className="text-[22px] font-bold text-red-400 mb-3 tracking-tight">Access Denied</h3>
                    <div className="bg-red-500/10 p-4 rounded-2xl border border-red-500/20 text-left">
                      <p className="text-red-300/90 text-[13px] leading-relaxed font-medium">
                        {uninstallError || "An unexpected error occurred during uninstallation."}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Footer ── */}
            <div
              className="px-10 py-6 flex items-center justify-end gap-3.5"
              style={{
                background: "rgba(255,255,255,0.03)",
                borderTop: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {uninstallPhase === "system_alert" || uninstallPhase === "error" ? (
                <button onClick={onClose} className="glass-btn px-8 py-2.5 rounded-2xl text-[14px] font-bold">
                  Close
                </button>
              ) : uninstallPhase === "confirm" ? (
                <>
                  <button onClick={onClose} className="glass-btn px-6 py-2.5 rounded-2xl text-[14px] font-bold">
                    Cancel
                  </button>
                  <button
                    onClick={executeUninstall}
                    className="px-8 py-2.5 rounded-2xl text-[14px] font-bold bg-[#ef4444] text-white shadow-[0_8px_20px_rgba(239,68,68,0.35)] hover:bg-[#ff5555] active:scale-95 transition-all"
                  >
                    Uninstall
                  </button>
                </>
              ) : (
                <div className="h-[42px]" />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
