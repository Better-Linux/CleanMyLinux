import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOperationsStore } from "../store/useOperationsStore";
import { useConfig } from "../context/ConfigContext";
import { useAppManagerStore } from "../views/app_manager/store";

// ── Helpers ───────────────────────────────────────────────────────────────────
const OP_LABELS: Record<string, string> = {
  uninstall: "Uninstall",
  update:    "Update",
  clean:     "Clean",
  scan:      "Scan",
};

const OP_COLORS: Record<string, { bar: string; glow: string; badge: string }> = {
  uninstall: { bar: "linear-gradient(90deg,#ef4444,#dc2626)",    glow: "rgba(239,68,68,0.3)",   badge: "rgba(239,68,68,0.15)" },
  update:    { bar: "linear-gradient(90deg,#14b4ff,#6040d0)",    glow: "rgba(20,180,255,0.3)",  badge: "rgba(20,180,255,0.15)" },
  clean:     { bar: "linear-gradient(90deg,#f59e0b,#d97706)",    glow: "rgba(245,158,11,0.3)",  badge: "rgba(245,158,11,0.15)" },
  scan:      { bar: "linear-gradient(90deg,#10b981,#059669)",    glow: "rgba(16,185,129,0.3)",  badge: "rgba(16,185,129,0.15)" },
};

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

// ── OperationsQueue component ─────────────────────────────────────────────────
export function OperationsQueue() {
  const { operations: ops, isOpen: open, setOpen, clearDone, initListener } = useOperationsStore();
    const { config } = useConfig();
  
    const isTitleBarLeftToRight = config.windowButtonsPosition === 'left';
  
  // Tick every second forces re-render so elapsed durations update live
  const [, setTick] = useState(0);

  // Tick every second to update elapsed time display
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Initialize the global listener once when this component mounts
  useEffect(() => {
    const unlisten = initListener();
    return () => unlisten();
  }, [initListener]);

  return (
    <>
      {/* Invisible backdrop for closing when open */}
      <AnimatePresence>
        {open && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/5 backdrop-blur-[1px]" 
          />
        )}
      </AnimatePresence>

      {/* Queue Panel drop-down */}

      {/* Queue Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="queue-panel"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={`absolute top-12 ${isTitleBarLeftToRight ? 'left-2' : 'right-2'} z-50 w-85 rounded-3xl overflow-hidden flex flex-col backdrop-blur-2xl pointer-events-auto`}
            style={{
              background: "linear-gradient(170deg, rgba(15,22,45,0.96) 0%, rgba(8,10,18,0.98) 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 32px 64px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08)",
              maxHeight: "480px",
            }}
          >
            {/* Top Accent Line */}
            <div className="absolute top-0 inset-x-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(20,180,255,0.5) 40%, rgba(100,80,255,0.4) 60%, transparent)" }} />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex items-center gap-3">
                <span className="text-white font-bold text-[15px] tracking-tight">System Operations</span>
              </div>
              <div className="flex items-center gap-3">
                {ops.some(o => o.status === "done" || o.status === "error") && (
                  <button onClick={clearDone}
                    className="text-[11px] font-semibold text-white/40 hover:text-[#14b4ff] transition-colors">
                    Clear All
                  </button>
                )}
                <button onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-xl flex items-center justify-center text-white/30 hover:text-white/80 hover:bg-white/8 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Operations list */}
            <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-2.5 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {ops.length === 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="py-12 text-center flex flex-col items-center gap-3"
                  > 
                    <p className="text-white/20 text-[13px] font-medium">Your queue is empty</p>
                  </motion.div>
                )}
                {ops.map((op) => {
                  const colors = OP_COLORS[op.op_type] ?? OP_COLORS.update;
                  return (
                    <motion.div
                      key={op.id}
                      layout
                      initial={{ opacity: 0, x: 20, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                      onClick={() => {
                        if (op.op_type === "uninstall") {
                          const appStore = useAppManagerStore.getState();
                          if (appStore.appToUninstall?.name === op.app_name) {
                            appStore.setUninstallModalOpen(true);
                            setOpen(false);
                          }
                        }
                      }}
                      className="rounded-[20px] p-3.5 flex flex-col gap-3 relative group cursor-pointer hover:bg-white/5 transition-colors"
                      style={{
                        background: op.status === "error"
                          ? "rgba(239,68,68,0.04)"
                          : op.status === "done"
                          ? "rgba(16,185,129,0.03)"
                          : "rgba(255,255,255,0.03)",
                        border: op.status === "error"
                          ? "1px solid rgba(239,68,68,0.12)"
                          : op.status === "done"
                          ? "1px solid rgba(16,185,129,0.1)"
                          : "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      {/* Inner Ambient Glow for active items */}
                      {op.status === "running" && (
                        <div className="absolute inset-0 pointer-events-none opacity-20" 
                          style={{ background: `radial-gradient(circle at 0% 0%, ${colors.glow}, transparent 70%)` }} 
                        />
                      )}

                      {/* Row: icon + name + badge + time */}
                      <div className="flex items-center gap-3.5 relative z-10">
                        {/* App icon */}
                        <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 overflow-hidden relative shadow-lg">
                          <div className="absolute inset-0 bg-linear-to-b from-white/10 to-transparent pointer-events-none" />
                          {op.icon ? (
                            <img src={op.icon} alt={op.app_name} className="w-8 h-8 object-contain z-10" />
                          ) : (
                            <span className="text-white/40 text-[14px] font-bold z-10">{op.app_name[0]?.toUpperCase()}</span>
                          )}
                        </div>

                        {/* Name + op badge */}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-[13.5px] font-bold truncate tracking-tight">{op.app_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider"
                              style={{ background: colors.badge, color: op.status === "error" ? "#f87171" : "rgba(255,255,255,0.7)" }}>
                              {OP_LABELS[op.op_type] ?? op.op_type}
                            </span>
                            <div className="flex items-center gap-1 text-white/25 text-[10px] font-medium">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                              </svg>
                              {op.status === "running" ? (
                                <span>Elapsed {formatDuration(Date.now() - op.startedAt)}</span>
                              ) : (
                                <span>Took {formatDuration((op.finishedAt ?? Date.now()) - op.startedAt)}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status icon */}
                        <div className="shrink-0">
                          {op.status === "running" && (
                            <div className="relative w-5 h-5 flex items-center justify-center">
                              <motion.div 
                                animate={{ rotate: 360 }} 
                                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                className="w-full h-full rounded-full border-2 border-[#14b4ff]/20 border-t-[#14b4ff]"
                              />
                            </div>
                          )}
                          {op.status === "done" && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center">
                              <svg className="w-3 h-3 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                                <path d="M20 6 9 17l-5-5" />
                              </svg>
                            </motion.div>
                          )}
                          {op.status === "error" && (
                            <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center">
                              <svg className="w-3 h-3 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                                <path d="M18 6 6 18M6 6l12 12" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Progress Area */}
                      {(op.status === "running" || op.status === "done") && (
                        <div className="flex flex-col gap-2 relative z-10 px-0.5">
                          <div className="h-1.5 rounded-full overflow-hidden bg-white/5 relative">
                            <motion.div
                              className="h-full rounded-full relative"
                              style={{ background: colors.bar }}
                              animate={{ width: `${Math.round(op.progress * 100)}%` }}
                              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                            >
                              <div className="absolute inset-0 bg-white/20 blur-[2px] opacity-50" />
                            </motion.div>
                          </div>
                          <div className="flex justify-between items-center">
                            <p className="text-white/40 text-[10.5px] font-medium truncate max-w-[80%] leading-none">{op.message}</p>
                            <p className="text-white/30 text-[10.5px] font-bold tabular-nums leading-none">{Math.round(op.progress * 100)}%</p>
                          </div>
                        </div>
                      )}

                      {/* Error message */}
                      {op.status === "error" && (
                        <p className="text-red-400/80 text-[10.5px] font-medium leading-relaxed bg-red-500/10 rounded-xl px-3 py-2 border border-red-500/10 relative z-10">
                          {op.message || "Operation failed unexpectedly"}
                        </p>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Titlebar compact inline widget ────────────────────────────────────────────
export function OperationsTitlebarWidget() {
  const { operations, toggleOpen } = useOperationsStore();
  const activeCount = operations.filter(o => o.status === "running" || o.status === "pending").length;
  const hasErrors = operations.some(o => o.status === "error");
  const hasDone = operations.some(o => o.status === "done");  

  return (
    <button
      onClick={toggleOpen}
      className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 transition-colors border border-white/10 text-white/70 hover:text-white"
      title="View Operations"
    >
      {activeCount > 0 ? (
        <div className="relative w-3.5 h-3.5 flex items-center justify-center">
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="w-full h-full rounded-full border border-[#14b4ff]/20 border-t-[#14b4ff]"
          />
        </div>
      ) : hasErrors ? (
        <span className="w-2 h-2 rounded-full bg-red-500" />
      ) : hasDone ? (
        <span className="w-2 h-2 rounded-full bg-green-500" />
      ) : (
        <span className="w-2 h-2 rounded-full bg-white/40" />
      )}
      <span className="text-[11px] font-bold tabular-nums leading-none">
        {activeCount > 0 ? `${activeCount}` : operations.length}
      </span>
    </button>
  );
}
