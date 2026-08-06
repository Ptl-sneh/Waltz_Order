"use client";

import { Loader2 } from "lucide-react";

export function LoadingOverlay({ message }: { message: string }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        {message}
      </div>
    </div>
  );
}
