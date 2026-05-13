import { motion } from "framer-motion";
import { Shield, Sparkles } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="glass-card p-14 flex flex-col items-center text-center w-full max-w-md">
      <Shield className="w-10 h-10 text-cyan-400 mb-6" />

      <h1 className="text-3xl font-semibold text-white mb-3">Smart Scan</h1>
      <p className="text-zinc-400 mb-10">One-click scan to clean your system</p>

      {/* BIG SCAN BUTTON */}
      <motion.button
        className="w-44 h-44 rounded-full bg-linear-to-b from-cyan-500 to-cyan-700 flex flex-col items-center justify-center shadow-lg shadow-cyan-500/30 mb-8"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
      >
        <Sparkles className="w-12 h-12 text-white mb-1" />
        <span className="text-2xl font-bold tracking-widest text-white">
          SCAN
        </span>
      </motion.button>

      <p className="text-zinc-500 text-sm">
        Click to start scanning your system
      </p>
    </div>
  );
}
