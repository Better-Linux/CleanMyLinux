import { motion } from "framer-motion";
import { RefreshCw, Lock } from "lucide-react";
import { SettingRow, Switch } from "../components";

export function UpdatesTab() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="space-y-8"
    >
      <header>
        <h1 className="text-2xl font-bold text-white mb-1">Software Update</h1>
        <p className="text-[#94a3b8] text-[13px]">Manage application versions and release channels.</p>
      </header>

      <div className="flex flex-col items-center justify-center py-10 glass-panel-dark rounded-4xl border border-white/5 bg-linear-to-b from-white/5 to-transparent">
        <div className="w-20 h-20 rounded-3xl bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/20">
          <RefreshCw size={32} className="text-blue-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">You're Up to Date</h2>
        <p className="text-[#a1b0cb] text-[13px] mb-8">CleanMyLinux 1.0.0 is the latest version available.</p>
        
        <button className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-semibold transition-all shadow-lg shadow-blue-900/20 active:scale-95">
          Check for Updates
        </button>
      </div>

      <div className="glass-panel-dark rounded-2xl overflow-hidden border border-white/5">
        <SettingRow 
          icon={Lock} 
          label="Update Channel" 
          description="Stable Release"
          action={<button className="text-[12px] text-[#1cd1ff] font-bold">Change</button>}
        />
        <div className="h-px bg-white/5 mx-4" />
        <SettingRow 
          icon={RefreshCw} 
          label="Automatic Updates" 
          description="Download and install updates in background."
          action={<Switch enabled={true} />}
        />
      </div>
    </motion.div>
  );
}
