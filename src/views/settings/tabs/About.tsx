import { motion } from "framer-motion";
import { ExternalLink, Globe,  GitBranch, Scale } from "lucide-react";
import { SettingRow } from "../components";
import { useEffect, useState } from "react";
import { getVersion, getName } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Github } from "../../../components/icons";

export function AboutTab() {
  const [appInfo, setAppInfo] = useState({ 
    name: "CleanMyLinux", 
    version: "1.0.0",
    repository: "https://github.com/better-linux/CleanMyLinux",
    homepage: "https://github.com/better-linux/CleanMyLinux",
    license: "MIT",
    authors: "Better Linux",
    description: "A premium system maintenance tool."
  });

  useEffect(() => {
    Promise.all([
      getName(), 
      getVersion(), 
      invoke<Record<string, string>>("get_app_metadata")
    ]).then(([name, version, meta]) => {
      setAppInfo({ 
        name,
        version,
        repository: meta.CARGO_PKG_REPOSITORY,
        homepage: meta.CARGO_PKG_HOMEPAGE,
        license: meta.CARGO_PKG_LICENSE,
        authors: meta.CARGO_PKG_AUTHORS,
        description: meta.CARGO_PKG_DESCRIPTION
      });
    });
  }, []);

  const handleOpen = (url: string) => {
    openUrl(url).catch(console.error);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="flex flex-col items-center"
    >
      <div className="w-32 h-32 rounded-[36px] flex items-center justify-center shadow-2xl mb-6 relative group overflow-hidden mt-6">
        <img src="/logo.svg" alt="CleanMyLinux Logo" className="object-contain drop-shadow-lg relative z-10" />
        <div className="absolute top-px inset-x-px h-1/2 bg-linear-to-b from-white/30 to-transparent rounded-t-[35px]" />
      </div>
      
      <h1 className="text-3xl font-bold text-white tracking-tight mb-2">{appInfo.name}</h1>
      <p className="text-[#a1b0cb] text-sm font-medium mb-8 text-center px-8">{appInfo.description}</p>

      <div className="w-full space-y-6">
        {/* Project Info */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest px-4">Software</h2>
          <div className="glass-panel-dark rounded-2xl overflow-hidden border border-white/5">
            <SettingRow 
              icon={GitBranch} 
              label="Version" 
              description={appInfo.version}
              action={null}
            />
            <SettingRow 
              icon={Scale} 
              label="License" 
              description={appInfo.license}
              action={null}
            />
          </div>
        </section>

        {/* Resources & Links */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest px-4">Resources</h2>
          <div className="glass-panel-dark rounded-2xl overflow-hidden border border-white/5">
            <SettingRow 
              icon={Globe} 
              label="Official Website" 
              description="Project homepage and documentation."
              action={<ExternalLink size={16} className="text-white/20" />}
              onClick={() => handleOpen(appInfo.homepage)}
            />
            <SettingRow 
              icon={Github} 
              label="Source Code" 
              description="Contribute or report issues on GitHub."
              action={<ExternalLink size={16} className="text-white/20" />}
              onClick={() => handleOpen(appInfo.repository)}
            />
          </div>
        </section>

        {/* Legal/System Info */}
        <div className="px-4 py-2">
          <p className="text-[11px] text-white/40 leading-relaxed text-center">
            &copy; {new Date().getFullYear()} {appInfo.authors}. All rights reserved.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
