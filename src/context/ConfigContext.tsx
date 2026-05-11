import React, { createContext, useContext, useEffect, useState } from 'react';
import { load } from '@tauri-apps/plugin-store';

interface Config {
  sidebarPosition: 'left' | 'right';
  windowButtonsPosition: 'left' | 'right';
  // Add more settings here in the future
}

interface ConfigContextType {
  config: Config;
  updateConfig: (newConfig: Partial<Config>) => Promise<void>;
  isLoading: boolean;
}

declare global {
  interface Window {
    __INITIAL_CONFIG__?: Partial<Config>;
  }
}

const DEFAULT_CONFIG: Config = {
  sidebarPosition: 'left',
  windowButtonsPosition: 'left',
};

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<Config>(() => {
    const initial = window.__INITIAL_CONFIG__;
    return {
      sidebarPosition: initial?.sidebarPosition || DEFAULT_CONFIG.sidebarPosition,
      windowButtonsPosition: initial?.windowButtonsPosition || DEFAULT_CONFIG.windowButtonsPosition,
    };
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initStore = async () => {
      try {
        const store = await load('settings.json', { autoSave: true,defaults:{sidebarPosition:'left',windowButtonsPosition:'right'}});
        console.log(store.entries());
        const savedSidebar = await store.get<Config['sidebarPosition']>('sidebarPosition');
        const savedButtons = await store.get<Config['windowButtonsPosition']>('windowButtonsPosition');

        setConfig({
          sidebarPosition: savedSidebar || DEFAULT_CONFIG.sidebarPosition,
          windowButtonsPosition: savedButtons || DEFAULT_CONFIG.windowButtonsPosition,
        });
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initStore();
  }, []);

  const updateConfig = async (newConfig: Partial<Config>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);

    try {
      const store = await load('settings.json', { autoSave: true,defaults:{sidebarPosition:'left',windowButtonsPosition:'right'}});
      for (const [key, value] of Object.entries(newConfig)) {
        await store.set(key, value);
      }
      // autoSave is true, so it will be written to disk automatically
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  return (
    <ConfigContext.Provider value={{ config, updateConfig, isLoading }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};
