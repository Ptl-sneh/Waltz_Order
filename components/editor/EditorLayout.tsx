"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DrawingRecord, DrawingTarget } from "@/types/editor";
import { LayerPanel } from "./LayerPanel";
import { PropertiesPanel } from "./PropertiesPanel";
import { StatusBar } from "./StatusBar";
import { Toolbar } from "./Toolbar";
import { ViewerCanvas } from "./ViewerCanvas";

export function EditorLayout({ drawing, target }: { drawing: DrawingRecord; target?: DrawingTarget }) {
  return (
    <main className="flex h-screen min-h-0 flex-col bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-3">
        <Link
          href="/"
          title="Back to comparison"
          aria-label="Back to comparison"
          className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
        >
          <ArrowLeft />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold">{drawing.filename}</h1>
          <p className="text-xs text-muted-foreground">Native DWG editor</p>
        </div>
      </header>
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        <LayerPanel />
        <ViewerCanvas drawing={drawing} target={target} />
        <PropertiesPanel />
      </div>
      <StatusBar />
    </main>
  );
}
