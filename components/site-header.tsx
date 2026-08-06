import { ScanSearch } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-4xl items-center gap-2 px-4">
        <ScanSearch className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">JB Glass · Waltz QA</span>
      </div>
    </header>
  );
}