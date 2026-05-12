import { motion } from 'framer-motion';
import { Settings } from 'lucide-react';

export function Header() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-16 px-6 flex items-center justify-end"
      style={{
        background: 'rgba(20, 20, 25, 0.5)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Settings */}
      <motion.button
        className="p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        whileHover={{ scale: 1.05, rotate: 90 }}
        whileTap={{ scale: 0.95 }}
      >
        <Settings className="w-5 h-5" />
      </motion.button>
    </motion.header>
  );
}