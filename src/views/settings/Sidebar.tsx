import { motion } from "framer-motion";
import { Info, Palette } from "lucide-react";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
}

export function SettingsSidebar({ activeTab, onTabChange }: SidebarProps) {
  const sidebarItems = [
    { id: "appearance", label: "Appearance", icon: Palette, color: "bg-purple-500" },
    { id: "about", label: "About", icon: Info, color: "bg-orange-500" },
  ];

  return (
    <aside className="w-64 border-r border-white/5 bg-white/2 backdrop-blur-md p-6 flex flex-col gap-2">
      <h2 className="text-[11px] font-bold text-white/30 uppercase tracking-widest mb-4 px-3">Preferences</h2>
      {sidebarItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onTabChange(item.id)}
          className={`w-full relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-400 group text-[#94a3b8] hover:bg-white/5`}
        >
          <div className={`p-1.5 rounded-lg ${item.color} ${activeTab === item.id ? "opacity-100" : "opacity-60"} transition-opacity`}>
            <item.icon size={14} className="text-white" />
          </div>
          <span className="text-[13px] font-medium">{item.label}</span>

          {/* active indicator */}
          {activeTab === item.id && (
            <motion.div layoutId="activeDot" className="bg-white/10 text-white shadow-xs w-full h-full absolute inset-0 rounded-xl" />
          )}
        </button>
      ))}
    </aside>
  );
}
