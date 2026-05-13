import { AnimatePresence, motion } from "framer-motion";
import { useAppManagerStore } from "./app_manager/store";

import InitialScanView from "./app_manager/InitialScanView";
import DashboardView from "./app_manager/DashboardView";
import ManageAppsView from "./app_manager/ManageAppsView";
import UpdatesView from "./app_manager/UpdatesView";
import UnusedAppsView from "./app_manager/UnusedAppsView";
import UninstallModal from "./app_manager/UninstallModal";

export default function AppManagerView() {
  const scanState = useAppManagerStore((state) => state.scanState);
  const viewMode = useAppManagerStore((state) => state.viewMode);

  return (
    <div className="h-full w-full relative overflow-y-auto overflow-x-hidden">
      <AnimatePresence mode="wait">
        {/* INITIAL & SCANNING STATE */}
        {(scanState === "initial" || scanState === "scanning") && <InitialScanView />}

        {/* RESULTS STATE */}
        {scanState === "results" && (
          <motion.div
            key="results-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <AnimatePresence mode="wait">
              {viewMode === "dashboard" ? (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="w-full h-full flex justify-center"
                >
                  <DashboardView />
                </motion.div>
              ) : viewMode === "manage" ? (
                <motion.div
                  key="manage"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="w-full h-full flex justify-center"
                >
                  <ManageAppsView />
                </motion.div>
              ) : viewMode === "update" ? (
                <motion.div
                  key="update"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="w-full h-full flex justify-center"
                >
                  <UpdatesView />
                </motion.div>
              ) : (
                <motion.div
                  key="unused"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="w-full h-full flex justify-center"
                >
                  <UnusedAppsView />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* UNINSTALL MODAL OVERLAY */}
      <UninstallModal />
    </div>
  );
}
