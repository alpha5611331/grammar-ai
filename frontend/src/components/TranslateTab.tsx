import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/pywebview";
import { useBootstrap } from "@/hooks/useBootstrap";
import { useAlertConfirm } from "@/hooks/useAlertConfirm";
import { useTranslate } from "@/hooks/useTranslate";
import { cn } from "@/lib/utils";
import { statusColorClass } from "@/lib/status";

export interface TranslateTabHandle {
  run: (text: string) => void;
  clear: () => void;
}

interface TranslateTabProps {
  active: boolean;
  onError: (message: string) => void;
}

export const TranslateTab = forwardRef<TranslateTabHandle, TranslateTabProps>(function TranslateTab(
  { active, onError },
  ref
) {
  const { boot } = useBootstrap();
  const { alert } = useAlertConfirm();
  const translate = useTranslate(onError);
  const [justCopied, setJustCopied] = useState(false);

  useImperativeHandle(ref, () => ({ run: translate.run, clear: translate.clear }));

  const triggerFromButton = () => {
    const text = translate.original.trim();
    if (!text) {
      void alert(boot.strings.EMPTY + "\n\n" + boot.strings.ENTER_TEXT_TO_TRANSLATE);
      return;
    }
    translate.run(text);
  };

  const doCopy = async () => {
    if (!translate.output) return;
    await api().copy_text(translate.output);
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 1500);
  };

  return (
    <div className={cn("flex flex-col gap-2", !active && "hidden")}>
      <div>
        <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">
          {boot.strings.ORIGINAL_TEXT}
        </label>
        <Textarea rows={5} value={translate.original} onChange={(e) => translate.setOriginal(e.target.value)} />
      </div>

      <div className="flex items-center gap-1.5">
        <Button type="button" size="sm" variant="outline" disabled={translate.busy} onClick={triggerFromButton}>
          {boot.strings.TRANSLATE} ({boot.translateHotkey})
        </Button>
        <span className={cn("text-[11px]", statusColorClass(translate.status.color))}>
          {translate.status.text}
        </span>
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">
          {boot.strings.TRANSLATED_TEXT}: {boot.translateLanguage}
        </label>
        <Textarea rows={6} readOnly value={translate.output} />
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={!translate.output}
          title={justCopied ? boot.strings.COPIED_EXCL : boot.strings.COPY}
          aria-label={boot.strings.COPY}
          onClick={doCopy}
        >
          {justCopied ? <CheckIcon /> : <CopyIcon />}
        </Button>
      </div>
    </div>
  );
});
