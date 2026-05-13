import { AnimatePresence, motion } from "framer-motion";
import { useAppManagerStore } from "./store";

export default function InitialScanView() {
  const scanState = useAppManagerStore((state) => state.scanState);
  const handleScan = useAppManagerStore((state) => state.handleScan);

  return (
    <motion.div
      key="initial"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="absolute inset-0 flex flex-col items-center justify-center p-10"
    >
      <div className="flex flex-col items-center justify-center flex-1 w-full max-w-lg mx-auto h-[120px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={scanState}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex flex-col items-center justify-center w-full"
          >
            <h1 className="text-5xl font-light text-white mb-4 tracking-tight">
              {scanState === "initial" ? "Applications" : "Scanning applications..."}
            </h1>
            <p className="text-[#a1b0cb] leading-relaxed text-center font-medium">
              {scanState === "initial"
                ? "Take control of your applications. Seamlessly uninstall apps and manage available updates."
                : "Looking for installed applications and available updates."}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Scan Button */}
      <div className="mt-auto pt-8 pb-4 flex items-center justify-center">
        {scanState === "initial" ? (
          <motion.button
            onClick={handleScan}
            animate={{
              boxShadow: [
                "0 0 30px rgba(20,180,255,0.4), inset 0 0 15px rgba(20,180,255,0.4)",
                "0 0 50px rgba(20,180,255,0.6), inset 0 0 25px rgba(20,180,255,0.6)",
                "0 0 30px rgba(20,180,255,0.4), inset 0 0 15px rgba(20,180,255,0.4)",
              ],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            whileHover={{ filter: "brightness(1.15)" }}
            whileTap={{ scale: 0.95 }}
            className="relative flex items-center justify-center w-[110px] h-[110px] rounded-full bg-linear-to-b from-[#1cd1ff] border-b-3 border-[#8cedff]/80 to-[#0a3575] overflow-hidden cursor-pointer"
          >
            {/* Glossy top highlight */}
            <div className="absolute top-[1px] inset-x-[15%] h-[40%] bg-linear-to-b from-white/40 to-transparent rounded-t-[100px] pointer-events-none mix-blend-overlay"></div>

            {/* Inner subtle bottom shadow for depth */}
            <div className="absolute bottom-0 inset-x-0 h-1/3 bg-linear-to-t from-[#021330]/50 to-transparent pointer-events-none"></div>

            {/* Bubbling effect inside the button */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-full mix-blend-screen opacity-70">
              <motion.div
                animate={{ y: [60, -60], opacity: [0, 0.4, 0] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="absolute left-[35%] bottom-0 w-1.5 h-1.5 rounded-full bg-white blur-[0.5px]"
              />
              <motion.div
                animate={{ y: [70, -40], opacity: [0, 0.3, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "linear",
                  delay: 0.5,
                }}
                className="absolute left-[60%] bottom-0 w-2 h-2 rounded-full bg-[#d0f4ff] blur-[1px]"
              />
              <motion.div
                animate={{ y: [60, -50], opacity: [0, 0.5, 0] }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  ease: "linear",
                  delay: 1.1,
                }}
                className="absolute left-[45%] bottom-0 w-1 h-1 rounded-full bg-white blur-[0px]"
              />
            </div>

            <span className="text-white font-medium tracking-wide z-20 relative">Scan</span>
          </motion.button>
        ) : (
          <div className="relative flex items-center justify-center">
            {/* Outer spinning rings */}
            <div className="absolute w-[126px] h-[126px] rounded-full border-[2px] border-transparent border-t-white/70 border-r-white/30 animate-spin"></div>
            <div className="absolute w-[132px] h-[132px] rounded-full border-[1px] border-transparent border-b-[#8cedff]/50 animate-[spin_3s_linear_infinite_reverse]"></div>

            {/* Inner button indicator */}
            <div className="relative flex items-center justify-center w-[110px] h-[110px] rounded-full bg-linear-to-b from-[#1cd1ff] to-[#0a3575] border-b-3 border-[#8cedff]/80 shadow-[0_0_30px_rgba(20,180,255,0.4),inset_0_0_15px_rgba(20,180,255,0.4)] overflow-hidden">
              <div className="absolute top-[1px] inset-x-[15%] h-[40%] bg-linear-to-b from-white/40 to-transparent rounded-t-[100px] pointer-events-none mix-blend-overlay"></div>
              <div className="absolute bottom-0 inset-x-0 h-1/3 bg-linear-to-t from-[#021330]/50 to-transparent pointer-events-none"></div>
              <div className="flex gap-[5px] z-20 relative">
                <motion.div
                  animate={{ opacity: [1, 0.2, 1], scale: [1, 0.7, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                  className="w-2 h-2 rounded-full bg-white shadow-[0_0_6px_white]"
                />
                <motion.div
                  animate={{ opacity: [1, 0.2, 1], scale: [1, 0.7, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                  className="w-2 h-2 rounded-full bg-white shadow-[0_0_6px_white]"
                />
                <motion.div
                  animate={{ opacity: [1, 0.2, 1], scale: [1, 0.7, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                  className="w-2 h-2 rounded-full bg-white shadow-[0_0_6px_white]"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
