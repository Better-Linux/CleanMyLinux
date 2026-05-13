import { motion } from "framer-motion";
import { Monitor, Bell } from "lucide-react";
import { SettingRow, Switch } from "../components";

const RocketIcon = (props: any) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    <path d="M9 12H4s.55-3.03 2-5c1.62-2.2 5-3 5-3" />
    <path d="M12 15v5s3.03-.55 5-2c2.2-1.62 3-5 3-5" />
  </svg>
);

export function GeneralTab() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="space-y-8"
    >
      <header>
        <h1 className="text-2xl font-bold text-white mb-1">General</h1>
        <p className="text-[#94a3b8] text-[13px]">Configure the basic behavior of CleanMyLinux.</p>
      </header>

      <section className="space-y-3">
        <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-widest px-1">Startup</h3>
        <div className="glass-panel-dark rounded-2xl overflow-hidden border border-white/5">
          <SettingRow 
            icon={RocketIcon} 
            label="Launch at Login" 
            description="Start application automatically when system boots."
            action={<Switch enabled={true} />}
          />
          <div className="h-px bg-white/5 mx-4" />
          <SettingRow 
            icon={Monitor} 
            label="Run in Background" 
            description="Keep the app active in the system tray."
            action={<Switch enabled={false} />}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-widest px-1">Notifications</h3>
        <div className="glass-panel-dark rounded-2xl overflow-hidden border border-white/5">
          <SettingRow 
            icon={Bell} 
            label="Smart Cleanup Alerts" 
            description="Notify when junk size exceeds 1 GB."
            action={<Switch enabled={true} />}
          />
        </div>
      </section>
    </motion.div>
  );
}
