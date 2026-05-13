import { motion } from "framer-motion";
import { Trash2, Sparkles } from "lucide-react";

export default function SystemJunkView() {
  return (
    <div className="glass-card p-14 flex flex-col items-center text-center w-full max-w-md">
      <Trash2 className="w-10 h-10 text-cyan-400 mb-6" />

      <h1 className="text-3xl font-semibold text-white mb-3">System Junk</h1>
      <p className="text-zinc-400 mb-10">Clean caches, logs, and temp files</p>

      {/* SCAN BUTTON */}
      <motion.button
        className="w-48 h-48 rounded-full bg-linear-to-b from-cyan-500 to-cyan-700 flex flex-col items-center justify-center shadow-lg shadow-cyan-500/30"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        <Sparkles className="w-12 h-12 text-white mb-1" />
        <span className="text-xl font-bold text-white tracking-widest">
          SCAN
        </span>
      </motion.button>
    </div>
  );
}
