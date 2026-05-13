import { AnimatePresence } from "framer-motion";
import { useState } from "react";
import { SettingsSidebar } from "./settings/Sidebar";
import { GeneralTab } from "./settings/tabs/General";
import { AppearanceTab } from "./settings/tabs/Appearance";
import { UpdatesTab } from "./settings/tabs/Updates";
import { AboutTab } from "./settings/tabs/About";

type SettingsTab = "general" | "appearance" | "updates" | "about";

export default function SettingsView() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");

  return (
    <div className="w-full h-full flex flex-col items-center justify-start p-3">
      <div className="w-full max-w-5xl h-[85vh] glass-panel rounded-4xl flex overflow-hidden shadow-2xl border border-white/10">
        
        {/* Navigation */}
        <SettingsSidebar 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />

        {/* Content Area */}
        <main className="flex-1 bg-black/5 p-10 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === "general" && <GeneralTab key="general" />}
            {activeTab === "appearance" && <AppearanceTab key="appearance" />}
            {activeTab === "updates" && <UpdatesTab key="updates" />}
            {activeTab === "about" && <AboutTab key="about" />}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
