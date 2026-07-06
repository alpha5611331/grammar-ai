import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type Bootstrap, type SettingsPayload } from "@/lib/pywebview";

interface BootstrapContextValue {
  boot: Bootstrap;
  goalOrder: string[];
  // outputLanguageMap is {friendly label -> model value} - boot.config.output_language holds
  // the plain model value (e.g. "Japanese"), not the friendly label (e.g. "Japanese (日本語)"),
  // so this reverses the map. Falls back to the raw value for a custom/legacy value not in the map.
  outputLanguageLabel: () => string;
  // Sync the in-memory bootstrap after a successful save_settings, so labels re-derived from
  // it (e.g. Polish's "Polished Versions: <lang>") update without a reload. Takes the same
  // camelCase SettingsPayload sent to the backend and maps it onto boot's shape.
  applySavedSettings: (payload: SettingsPayload) => void;
}

const BootstrapContext = createContext<BootstrapContextValue | null>(null);

export function BootstrapProvider({ children }: { children: ReactNode }) {
  const [boot, setBoot] = useState<Bootstrap | null>(null);

  useEffect(() => {
    // window.pywebview.api is only injected once pywebview fires `pywebviewready`
    // (app.js gated boot() on this same event). If the API is already present (e.g.
    // a fast reload where the event fired before this effect ran), load immediately.
    const load = () => {
      void api().get_bootstrap().then(setBoot);
    };
    if (window.pywebview?.api) {
      load();
    } else {
      window.addEventListener("pywebviewready", load, { once: true });
      return () => window.removeEventListener("pywebviewready", load);
    }
  }, []);

  const value = useMemo<BootstrapContextValue | null>(() => {
    if (!boot) return null;

    const outputLanguageLabel = () => {
      const label = Object.keys(boot.outputLanguageMap).find(
        (k) => boot.outputLanguageMap[k] === boot.config.output_language
      );
      return label || boot.config.output_language;
    };

    const applySavedSettings: BootstrapContextValue["applySavedSettings"] = (payload) => {
      // outputLanguage arrives as the friendly label; store the resolved model value,
      // mirroring OUTPUT_LANGUAGES.get(label, label) or "English" in api.py's save_settings.
      const outputLanguage =
        boot.outputLanguageMap[payload.outputLanguage] || payload.outputLanguage || "English";
      setBoot((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          config: {
            ...prev.config,
            base_url: payload.baseUrl,
            model: payload.model,
            api_key: payload.apiKey,
            output_language: outputLanguage,
            context: payload.context,
          },
          translateLanguage: payload.translateLanguage,
          autorun: payload.autorun,
          selectedGoals: payload.goals,
        };
      });
    };

    return { boot, goalOrder: boot.goals.map((g) => g.value), outputLanguageLabel, applySavedSettings };
  }, [boot]);

  if (!value) return null;

  return <BootstrapContext.Provider value={value}>{children}</BootstrapContext.Provider>;
}

export function useBootstrap(): BootstrapContextValue {
  const ctx = useContext(BootstrapContext);
  if (!ctx) throw new Error("useBootstrap must be used within BootstrapProvider");
  return ctx;
}
