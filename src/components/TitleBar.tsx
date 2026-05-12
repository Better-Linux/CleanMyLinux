import { useEffect, useRef } from 'react';
import { Minus, Square, X, ChevronLeft } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useAppStore } from '../store/useAppStore';
import { useConfig } from '../context/ConfigContext';
import { OperationsTitlebarWidget } from './OperationsQueue';
import { motion, AnimatePresence } from 'framer-motion';

const viewTitles: Record<string, string> = {
  dashboard: 'Smart Scan',
  junk: 'System Junk',
  apps: 'Applications',
  largefiles: 'Large Files',
  spacelens: 'Space Lens',
  startup: 'Startup Manager',
  health: 'System Health'
};

export default function TitleBar() {
  const appWindow = getCurrentWindow();
  const { currentView, backButton } = useAppStore();
  const { config } = useConfig();
  const dragRef = useRef<HTMLDivElement>(null);

  const isLeftToRight = config.windowButtonsPosition === 'left';
  const sidebarPosition = config.sidebarPosition

  useEffect(() => {
    const el = dragRef.current;
    if (!el) return;

    const handleMouseDown = (e: MouseEvent) => {
      // Ignore if clicking on buttons
      if (e.target instanceof Element && e.target.closest('button')) {
        return;
      }
      if (e.buttons === 1) {
        // Prevent default to prevent focus hijacking and stuck active states
        e.preventDefault();
        appWindow.startDragging().catch(console.error);
      }
    };

    el.addEventListener('mousedown', handleMouseDown);
    return () => el.removeEventListener('mousedown', handleMouseDown);
  }, [appWindow]);

  return (
    <div 
      ref={dragRef}
      className={`fixed top-0 left-0 right-0 h-12 flex items-center z-50 select-none cursor-grab bg-transparent transition-all duration-300 ${sidebarPosition ==="left" ? (isLeftToRight ? 'px-4' :"pr-4 pl-16"): (isLeftToRight? "pl-4 pr-16" : "px-4")}`}
    >
      {/* 1. Absolute Centered Title */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-[#a1b0cb] text-[13px] font-semibold tracking-wider drop-shadow-sm">
          {viewTitles[currentView]}
        </div>
      </div>

      {/* 2. Window Controls & Operations Widget Container */}
      <div className={`flex-1 h-full flex items-center pointer-events-auto ${isLeftToRight ? 'justify-start order-1' : 'justify-end order-3'}`}>
        <div className="flex items-center gap-3 h-full">
          {/* Widget - Always on the 'inside' */}
          <div className={`flex items-center ${isLeftToRight ? 'order-2' : 'order-1'}`}>
            <OperationsTitlebarWidget />
          </div>

          {/* Buttons */}
          <div className={`flex items-center gap-1 h-full py-2 ${isLeftToRight ? 'order-1 flex-row-reverse' : 'order-2'}`}>
            <button
              onClick={() => appWindow.minimize()}
              className="aspect-square h-full rounded-md flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors focus:outline-none"
            >
              <Minus size={16} strokeWidth={2} />
            </button>
            <button
              onClick={() => appWindow.toggleMaximize()}
              className="aspect-square h-full rounded-md flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors focus:outline-none"
            >
              <Square size={13} strokeWidth={2} />
            </button>
            <button
              onClick={() => appWindow.close()}
              className="aspect-square h-full rounded-md flex items-center justify-center text-white/60 hover:text-white hover:bg-red-500/50 transition-colors focus:outline-none"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Navigation Container (Back Button) */}
      <div className={`flex-1 h-full flex items-center pointer-events-auto ${isLeftToRight ? 'justify-end order-3' : 'justify-start order-1'}`}>
        <AnimatePresence mode="wait">
          {backButton && (
            <motion.button
              key={backButton.label || "default"}
              initial={{ opacity: 0, x: isLeftToRight ? 10 : -10, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: isLeftToRight ? 10 : -10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              whileTap={{ scale: 0.96 }}
              onClick={backButton.action}
              className={`group relative flex items-center gap-1 px-2 py-1 rounded-xl text-white/80 hover:text-white text-xs font-bold tracking-wide shadow-xs cursor-pointer overflow-hidden ${isLeftToRight ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <ChevronLeft size={14} className={`text-[#14b4ff] transition-transform duration-200 ${isLeftToRight ? 'rotate-180 group-hover:translate-x-0.5' : 'group-hover:-translate-x-0.5'}`} />
              <span>{backButton.label || "Back"}</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
