import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  Package,
  HardDrive,
  PieChart,
  Rocket,
  Activity,
  Settings,
  Monitor,
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { useConfig } from "../context/ConfigContext";

const navItems = [
  { id: "dashboard", label: "Smart Scan", icon: Monitor, hidden: true },
  { id: "junk", label: "System Junk", icon: Trash2, hidden: true },
  { id: "apps", label: "Applications", icon: Package, hidden: false },
  { id: "largefiles", label: "Large Files", icon: HardDrive, hidden: true },
  { id: "spacelens", label: "Space Lens", icon: PieChart, hidden: true },
  { id: "startup", label: "Startup", icon: Rocket, hidden: true },
  { id: "health", label: "System Health", icon: Activity, hidden: true },
];

export default function Sidebar() {
  const { currentView, setCurrentView } = useAppStore();
  const { config } = useConfig();
  const isRight = config.sidebarPosition === 'right';

  return (
    <div className={`z-10 fixed top-0 bottom-0 w-20 flex flex-col ${isRight ? 'right-0' : 'left-0'}`}>
      {/* Dynamic gradient separator */}
      <div className={`absolute top-0 bottom-0 w-px bg-linear-to-b from-transparent via-white/10 to-transparent pointer-events-none ${isRight ? 'left-0' : 'right-0'}`} />

      {/* Nav */}
      <nav className="flex-1 flex flex-col items-center justify-center gap-4 py-4 w-full">
        {navItems.filter((item) => !item.hidden).map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <div key={item.id} className="relative w-full flex justify-center">
              {/* The glowing dot for active state - outside the button */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] z-20"
                  />
                )}
              </AnimatePresence>

              <motion.button
                onClick={() => setCurrentView(item.id)}
                title={item.label}
                className="relative w-13 h-13 rounded-2xl flex flex-col items-center justify-center group outline-none"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <AnimatePresence mode="wait">
                  {isActive && (
                    <motion.div
                      layoutId="activeSidebarItem"
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                      }}
                      className="absolute inset-0 rounded-2xl bg-linear-to-b from-white/10 to-white/5 backdrop-blur-md border-t border-white/20 border-b shadow-[0_4px_12px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.1)]"
                    />
                  )}
                </AnimatePresence>

                {/* Hover highlight */}
                {!isActive && (
                  <div className="absolute inset-0 rounded-2xl bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                )}

                {/* Icon wrapper to allow drop shadow on the icon itself */}
                <div
                  className={`relative z-10 flex items-center justify-center w-full h-full ${isActive ? "drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" : ""}`}
                >
                  <Icon
                    size={24}
                    strokeWidth={isActive ? 2 : 1.5}
                    className={`transition-colors duration-200 ${
                      isActive
                        ? "text-[#f0f4ff]" // slight blue tint to the white
                        : "text-[#94a3b8] group-hover:text-white/90"
                    }`}
                  />
                </div>
              </motion.button>
            </div>
          );
        })}
      </nav>

      {/* Bottom Settings Icon */}
      <div className="py-8 flex justify-center w-full">
        <motion.button
          onClick={() => setCurrentView("settings")}
          title="Settings"
          className="relative w-12 h-12 rounded-2xl flex items-center justify-center group outline-none"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Active indicator for settings */}
          {currentView === "settings" && (
            <motion.div
              layoutId="activeSidebarItem"
              className="absolute inset-0 rounded-2xl bg-linear-to-b from-white/10 to-white/5 backdrop-blur-md border-t border-white/20 border-b"
            />
          )}

          <div className="absolute inset-0 rounded-2xl bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Settings
            size={22}
            strokeWidth={1.5}
            className={`relative z-10 transition-colors ${
              currentView === "settings" ? "text-white" : "text-[#94a3b8] group-hover:text-white/90"
            }`}
          />
        </motion.button>
      </div>
    </div>
  );
}
