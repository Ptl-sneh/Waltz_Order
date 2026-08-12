"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, RefreshCw, CheckCircle2, Download } from "lucide-react";
import { buttonVariants, Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { DrawingRecord } from "@/types/editor";

export function EditorLayout({ drawing }: { drawing: DrawingRecord }) {
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced" | "error">("idle");
  const [hasUpdates, setHasUpdates] = useState(false);

  useEffect(() => {
    if (!drawing.driveFileId) return;

    const eventSource = new EventSource(`/api/drawings/${drawing.id}/sync`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.updated) {
          setSyncStatus("synced");
          setHasUpdates(true);
          toast.success("DWG file synchronized!", {
            description: "Changes from AutoCAD have been saved.",
          });
          setTimeout(() => setSyncStatus("idle"), 3000);
        } else if (data.error) {
          setSyncStatus("error");
        }
      } catch (err) {
        console.error("Failed to parse SSE event:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE connection error:", err);
      setSyncStatus("error");
    };

    return () => {
      eventSource.close();
    };
  }, [drawing.id, drawing.driveFileId]);

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
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold">{drawing.filename}</h1>
          <p className="text-xs text-muted-foreground">Native DWG editor</p>
        </div>
        
        {drawing.driveFileId && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-4 bg-muted/50 rounded-full py-1">
            {syncStatus === "syncing" && <RefreshCw className="h-3 w-3 animate-spin" />}
            {syncStatus === "synced" && <CheckCircle2 className="h-3 w-3 text-green-500" />}
            {syncStatus === "error" && <span className="text-destructive">Sync Error</span>}
            <span>
              {syncStatus === "syncing" ? "Checking Drive..." : 
               syncStatus === "synced" ? "Updated!" : "Auto-sync active"}
            </span>
          </div>
        )}
      </header>
      
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Edit in AutoCAD</h2>
            <p className="text-muted-foreground">
              To edit this DWG file, open it in Google Drive and select <strong>Open With &rarr; AutoCAD web app</strong>.
            </p>
          </div>

          <div className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
            <div className="space-y-2 text-sm text-left text-muted-foreground">
              <p><strong>Note:</strong></p>
              <ul className="list-disc pl-4 space-y-1">
                <li>You must have a paid Autodesk subscription.</li>
                <li>The first time you do this, you will need to authorize the AutoCAD web app Marketplace connector.</li>
                <li>Changes made in AutoCAD will instantly sync back to this system.</li>
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              {drawing.driveWebViewLink ? (
                <Button 
                  render={<a href={drawing.driveWebViewLink} target="_blank" rel="noopener noreferrer" />}
                  nativeButton={false}
                  className="w-full gap-2" 
                  size="lg"
                >
                  Open in Google Drive
                  <ExternalLink className="h-4 w-4" />
                </Button>
              ) : (
                <Button disabled className="w-full gap-2" size="lg">
                  Drive Link Unavailable
                </Button>
              )}
              
              <Button 
                render={<a href={drawing.dwgUrl} download={drawing.filename} />}
                nativeButton={false}
                variant={hasUpdates ? "default" : "secondary"}
                className={cn("w-full gap-2 transition-all duration-500", hasUpdates && "ring-2 ring-primary ring-offset-2")}
                size="lg"
              >
                {hasUpdates ? "Download updated DWG" : "Download original DWG"}
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

