import { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { getCurrentWindow } from '@tauri-apps/api/window';
import Sidebar from './Sidebar';
import TitleBar from './TitleBar';
import Dashboard from '../views/Dashboard';
import SystemJunkView from '../views/SystemJunkView';
import AppManagerView from '../views/AppManagerView';
import SettingsView from '../views/SettingsView';
import { useAppStore } from '../store/useAppStore';
import { useConfig } from '../context/ConfigContext';
import { OperationsQueue } from './OperationsQueue';

const ComingSoonView = ({ title }: { title: string }) => (
  <div className="glass-panel rounded-2xl p-12 flex flex-col items-center text-center w-full max-w-md mx-auto mt-20">
    <h1 className="text-3xl font-medium text-white mb-3 text-shadow-sm">{title}</h1>
    <p className="text-white/70">Coming Soon</p>
  </div>
);

export default function Layout() {
  const { currentView } = useAppStore();
  const { config } = useConfig();
  const isRight = config.sidebarPosition === 'right';

  useEffect(() => {
    // Prevent right-click in production to maintain native app feel
    const handleContextMenu = (e: MouseEvent) => {
      if (import.meta.env.PROD) {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', handleContextMenu);

    const appWindow = getCurrentWindow();
    
    // Use vanilla JS listeners to avoid React Synthetic Event "sticky" bugs
    const bindResize = (id: string, direction: any) => {
      const el = document.getElementById(id);
      if (!el) return null;
      
      const handler = (e: MouseEvent) => {
        if (e.buttons === 1) {
          e.preventDefault();
          appWindow.startResizeDragging(direction).catch(console.error);
        }
      };
      
      el.addEventListener('mousedown', handler);
      return () => el.removeEventListener('mousedown', handler);
    };

    const unbinds = [
      bindResize('resize-n', 'North'),
      bindResize('resize-s', 'South'),
      bindResize('resize-w', 'West'),
      bindResize('resize-e', 'East'),
      bindResize('resize-nw', 'NorthWest'),
      bindResize('resize-ne', 'NorthEast'),
      bindResize('resize-sw', 'SouthWest'),
      bindResize('resize-se', 'SouthEast'),
    ];

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      unbinds.forEach(unbind => {
        if (unbind) unbind();
      });
    };
  }, []);

  return (
    <div className="flex h-screen relative w-full overflow-hidden bg-[#13173e] transform-gpu will-change-transform contain-layout">
      
      {/* Invisible Resize Borders for Linux borderless window */}
      <div id="resize-n" className="fixed top-0 left-0 right-0 h-1 cursor-n-resize z-60" />
      <div id="resize-s" className="fixed bottom-0 left-0 right-0 h-2 cursor-s-resize z-60" />
      <div id="resize-w" className="fixed top-0 left-0 bottom-0 w-2 cursor-w-resize z-60" />
      <div id="resize-e" className="fixed top-0 right-0 bottom-0 w-2 cursor-e-resize z-60" />
      <div id="resize-nw" className="fixed top-0 left-0 w-4 h-4 cursor-nw-resize z-70" />
      <div id="resize-ne" className="fixed top-0 right-0 w-4 h-4 cursor-ne-resize z-70" />
      <div id="resize-sw" className="fixed bottom-0 left-0 w-4 h-4 cursor-sw-resize z-70" />
      <div id="resize-se" className="fixed bottom-0 right-0 w-4 h-4 cursor-se-resize z-70" />

      {/* 3D Ambient Lighting Background - matching CleanMyMac X */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-80 mix-blend-screen transform-gpu will-change-contents">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] rounded-full bg-[#32a852]/30 blur-[140px] mix-blend-screen" />
        <div className="absolute top-[0%] left-[10%] w-[40%] h-[40%] rounded-full bg-[#1b80c4]/40 blur-[120px] mix-blend-screen" />
        <div className="absolute top-[-30%] left-[30%] w-[60%] h-[70%] rounded-full bg-[#1349b8]/30 blur-[130px]" />
        <div className="absolute top-[10%] right-[-10%] w-[50%] h-[80%] rounded-full bg-[#462391]/40 blur-[150px] mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[0%] w-[40%] h-[50%] rounded-full bg-[#1c9c8a]/30 blur-[130px] mix-blend-screen" />
        <div className="absolute bottom-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-[#3f1680]/40 blur-[140px] mix-blend-screen" />
      </div>

      {/* Noise texture overlay for premium feel */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />

      <Sidebar />
      <TitleBar />

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col relative z-10 h-full overflow-hidden ${isRight ? 'mr-20 ml-0' : 'ml-20 mr-0'}`}>
        <AnimatePresence mode="wait">
          <div key={currentView} className="h-full w-full pt-12">
            {(() => {
              switch (currentView) {
                case 'dashboard': return <Dashboard />;
                case 'junk': return <SystemJunkView />;
                case 'apps': return <AppManagerView />;
                case 'settings': return <SettingsView />;
                case 'largefiles': return <ComingSoonView title="Large Files" />;
                case 'spacelens': return <ComingSoonView title="Space Lens" />;
                case 'startup': return <ComingSoonView title="Startup Manager" />;
                case 'health': return <ComingSoonView title="System Health" />;
                default: return <Dashboard />;
              }
            })()}
          </div>
        </AnimatePresence>
      </main>
      <OperationsQueue />
    </div>
  );
}