import { create } from "zustand";
import { persist } from "zustand/middleware";

const PRIMARY_PRESETS = {
  orange: {
    light: {
      primary: "24 95% 53%",
      primaryForeground: "0 0% 100%",
      ring: "24 95% 53%",
      sidebarActive: "24 95% 53%",
      sidebarActiveForeground: "0 0% 100%"
    },
    dark: {
      primary: "28 98% 60%",
      primaryForeground: "24 25% 10%",
      ring: "28 98% 60%",
      sidebarActive: "28 98% 60%",
      sidebarActiveForeground: "24 25% 10%"
    }
  }
} as const;

type ThemeMode = "light" | "dark";
type PrimaryPreset = keyof typeof PRIMARY_PRESETS;

type ThemeState = {
  mode: ThemeMode;
  primary: PrimaryPreset;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  setPrimary: (presetName: string) => void;
  initTheme: () => void;
};

const applyThemeToDom = (mode: ThemeMode, primary: PrimaryPreset) => {
  const root = document.documentElement;
  const palette = PRIMARY_PRESETS[primary] ?? PRIMARY_PRESETS.orange;
  const values = palette[mode];

  root.classList.toggle("dark", mode === "dark");
  root.style.setProperty("--primary", values.primary);
  root.style.setProperty("--primary-foreground", values.primaryForeground);
  root.style.setProperty("--ring", values.ring);
  root.style.setProperty("--sidebar-active", values.sidebarActive);
  root.style.setProperty("--sidebar-active-foreground", values.sidebarActiveForeground);
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: "light" as ThemeMode,
      primary: "orange" as PrimaryPreset,
      setMode: (mode: ThemeMode) => {
        set({ mode });
        applyThemeToDom(mode, get().primary);
      },
      toggleMode: () => {
        const next = get().mode === "light" ? "dark" : "light";
        set({ mode: next });
        applyThemeToDom(next, get().primary);
      },
      setPrimary: (presetName: string) => {
        const safePreset = PRIMARY_PRESETS[presetName] ? presetName : "orange";
        set({ primary: safePreset as PrimaryPreset });
        applyThemeToDom(get().mode, safePreset as PrimaryPreset);
      },
      initTheme: () => {
        const { mode, primary } = get();
        applyThemeToDom(mode, primary);
      }
    }),
    {
      name: "theme-store"
    }
  )
);
