import { motion } from "framer-motion";
import { Layout, MousePointer2 } from "lucide-react";
import { SettingRow, SegmentedControl } from "../components";
import { useConfig } from "../../../context/ConfigContext";

export function AppearanceTab() {
  const { config, updateConfig } = useConfig();

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="space-y-8"
    >
      <header>
        <h1 className="text-2xl font-bold text-white mb-1">Appearance</h1>
        <p className="text-[#94a3b8] text-[13px]">Customize how CleanMyLinux looks on your desktop.</p>
      </header>

      <section className="space-y-3">
        <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-widest px-1">Layout</h3>
        <div className="glass-panel-dark rounded-2xl overflow-hidden border border-white/5">
          <SettingRow 
            icon={Layout} 
            label="Sidebar Position" 
            description="Choose which side the navigation menu appears on."
            action={
              <SegmentedControl 
                layoutId="sidebar-pos"
                options={[
                  { label: "Left", value: "left" },
                  { label: "Right", value: "right" }
                ]}
                value={config.sidebarPosition}
                onChange={(val) => updateConfig({ sidebarPosition: val })}
              />
            }
          />
          <div className="h-px bg-white/5 mx-4" />
          <SettingRow 
            icon={MousePointer2} 
            label="Window Controls" 
            description="Position of the Close, Minimize, and Maximize buttons."
            action={
              <SegmentedControl 
                layoutId="window-pos"
                options={[
                  { label: "Left", value: "left" },
                  { label: "Right", value: "right" }
                ]}
                value={config.windowButtonsPosition}
                onChange={(val) => updateConfig({ windowButtonsPosition: val })}
              />
            }
          />
        </div>
      </section>
    </motion.div>
  );
}
