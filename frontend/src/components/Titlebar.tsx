import { MoonIcon, SunIcon } from "lucide-react";
import { api } from "@/lib/pywebview";
import { useTheme } from "@/hooks/useTheme";

export function Titlebar({ appName }: { appName: string }) {
  const { theme, toggle } = useTheme();

  return (
    <div className="pywebview-drag-region flex h-7 flex-none items-center border-b border-border bg-card pr-1 pl-2">
      <span className="truncate text-xs font-semibold text-muted-foreground">{appName}</span>
      <span className="flex-1" />
      <button
        type="button"
        title="Toggle theme"
        aria-label="Toggle theme"
        onClick={toggle}
        className="rounded p-1 text-foreground hover:bg-border"
      >
        {theme === "dark" ? <SunIcon className="size-3.5" /> : <MoonIcon className="size-3.5" />}
      </button>
      <button
        type="button"
        title="Close"
        onClick={() => api().close_window()}
        className="rounded px-1.5 py-0.5 text-sm text-foreground hover:bg-border"
      >
        &times;
      </button>
    </div>
  );
}
