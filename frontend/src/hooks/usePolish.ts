import { useCallback, useEffect, useRef, useState } from "react";
import { api, type PolishResult } from "@/lib/pywebview";
import { fmt } from "@/lib/format";
import { useBootstrap } from "@/hooks/useBootstrap";
import { useAlertConfirm } from "@/hooks/useAlertConfirm";

export interface PolishStatus {
  text: string;
  color: string;
}

// Mirrors app.js's Polish-tab state/logic (app.js:167-334): runPolish(), the
// window.onPolishResult/onPolishDone/onPolishError push handlers, and clearPolish().
// lastOriginalRef guards against late results for a run the user has since cleared/replaced
// (same purpose as app.js's module-level `lastPolishOriginal`).
export function usePolish(onError: (message: string) => void) {
  const { boot, goalOrder } = useBootstrap();
  const { alert } = useAlertConfirm();

  const [original, setOriginal] = useState("");
  // Frozen snapshot of the text actually submitted to the LLM, distinct from `original`
  // (the live, still-editable textarea) - the user can keep typing while results stream
  // in, same as app.js, where runPolish(text) closes over its `text` param instead of
  // re-reading the textarea's live value for each already-rendered card.
  const [submittedOriginal, setSubmittedOriginal] = useState("");
  const [tone, setTone] = useState(boot.selectedTone);
  const [results, setResults] = useState<PolishResult[]>([]);
  const [status, setStatusState] = useState<PolishStatus>({ text: "", color: "gray" });
  const [busy, setBusy] = useState(false);

  const lastOriginalRef = useRef("");
  const receivedRef = useRef(0);

  const setStatus = useCallback((text: string, color: string) => setStatusState({ text, color }), []);

  const run = useCallback(
    (text: string) => {
      if (!boot.config.api_key) {
        void alert(boot.strings.NO_API_KEY + "\n\n" + boot.strings.CONFIGURE_API_KEY);
        return;
      }
      lastOriginalRef.current = text;
      setOriginal(text);
      setSubmittedOriginal(text);
      setResults([]);
      receivedRef.current = 0;
      setStatus(boot.strings.POLISHING, "blue");
      setBusy(true);
      void api().polish(text, tone);
    },
    [boot, tone, alert, setStatus]
  );

  const onToneChange = useCallback((value: string) => {
    setTone(value);
    void api().set_selected_tone(value);
  }, []);

  useEffect(() => {
    window.onPolishResult = (originalText, result) => {
      if (originalText !== lastOriginalRef.current) return;
      receivedRef.current += 1;
      setStatus(
        fmt(boot.strings.POLISHING_PROGRESS, {
          received: receivedRef.current,
          total: boot.selectedGoals.length,
        }),
        "blue"
      );
      setResults((prev) =>
        [...prev, result].sort((a, b) => goalOrder.indexOf(a.goal) - goalOrder.indexOf(b.goal))
      );
    };
    window.onPolishDone = (originalText) => {
      if (originalText !== lastOriginalRef.current) return;
      setStatus(boot.strings.POLISHED_READY, "green");
      setBusy(false);
    };
    window.onPolishError = (originalText, error) => {
      if (originalText !== lastOriginalRef.current) return;
      setStatus(boot.strings.ERROR, "red");
      setBusy(false);
      onError(error);
    };
    return () => {
      delete window.onPolishResult;
      delete window.onPolishDone;
      delete window.onPolishError;
    };
  }, [boot, goalOrder, onError, setStatus]);

  const clear = useCallback(() => {
    setOriginal("");
    setResults([]);
    setStatus("", "gray");
    lastOriginalRef.current = "";
  }, [setStatus]);

  return {
    original,
    setOriginal,
    submittedOriginal,
    tone,
    onToneChange,
    results,
    status,
    setStatus,
    busy,
    run,
    clear,
  };
}
