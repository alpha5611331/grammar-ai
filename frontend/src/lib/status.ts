// Maps app.js's status color names (blue/green/red/gray) to Tailwind text classes.
// Mirrors the .status.blue/.green/.red/.gray rules in the old style.css.
export function statusColorClass(color: string): string {
  switch (color) {
    case "blue":
      return "text-primary";
    case "green":
      return "text-emerald-600 dark:text-emerald-400";
    case "red":
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
}
