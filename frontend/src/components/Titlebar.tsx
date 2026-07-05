import { api } from "@/lib/pywebview";

export function Titlebar({ appName }: { appName: string }) {
  return (
    <div className="pywebview-drag-region flex h-7 flex-none items-center border-b border-border bg-card pr-1 pl-2">
      <span className="truncate text-xs font-semibold text-muted-foreground">{appName}</span>
      <span className="flex-1" />
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
