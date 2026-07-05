import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/pywebview";
import { useBootstrap } from "@/hooks/useBootstrap";
import { useAlertConfirm } from "@/hooks/useAlertConfirm";

export interface TranslateStatus {
  text: string;
  color: string;
}

// Mirrors app.js's Translate-tab state/logic (app.js:338-388): runTranslate(), the
// window.onTranslateDone/onTranslateError push handlers, and clearTranslate().
export function useTranslate(onError: (message: string) => void) {
  const { boot } = useBootstrap();
  const { alert } = useAlertConfirm();

  const [original, setOriginal] = useState("");
  const [output, setOutput] = useState("");
  const [status, setStatusState] = useState<TranslateStatus>({ text: "", color: "gray" });
  const [busy, setBusy] = useState(false);

  const setStatus = useCallback((text: string, color: string) => setStatusState({ text, color }), []);

  const run = useCallback(
    (text: string) => {
      if (!boot.config.api_key) {
        void alert(boot.strings.NO_API_KEY + "\n\n" + boot.strings.CONFIGURE_API_KEY);
        return;
      }
      setOriginal(text);
      setOutput("");
      setStatus(boot.strings.TRANSLATING, "blue");
      setBusy(true);
      void api().translate(text);
    },
    [boot, alert, setStatus]
  );

  useEffect(() => {
    // No late-result guard here (unlike Polish): Api.translate() in api.py never echoes the
    // original text back to onTranslateDone/onTranslateError, so there's nothing to compare
    // against - lastOriginalRef is unused for that reason. This matches app.js exactly,
    // which declared `lastTranslateOriginal` but never actually read it either.
    window.onTranslateDone = (result) => {
      setOutput(result);
      setStatus(boot.strings.TRANSLATION_READY, "green");
      setBusy(false);
    };
    window.onTranslateError = (error) => {
      setStatus(boot.strings.ERROR, "red");
      setBusy(false);
      onError(error);
    };
    return () => {
      delete window.onTranslateDone;
      delete window.onTranslateError;
    };
  }, [boot, onError, setStatus]);

  const clear = useCallback(() => {
    setOriginal("");
    setOutput("");
    setStatus("", "gray");
  }, [setStatus]);

  return { original, setOriginal, output, status, busy, run, clear };
}
