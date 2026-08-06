"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, PencilRuler, RotateCcw, ScanSearch, Upload } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DEFAULT_PROMPT_BODY } from "@/lib/waltz-prompt";
import type { ReconciliationResult } from "@/types/waltz";
import { FileDropCard } from "./file-drop-card";
import { PromptEditor } from "./promptEditor";
import { QaLogTable } from "./qaLogTable";

type Stage = "idle" | "uploading" | "analyzing" | "done" | "error";
type DwgUploadStage = "idle" | "uploading" | "ready" | "error";

export function ReconciliationTool() {
  const [orderFile, setOrderFile] = useState<File | null>(null);
  const [shopDrawingFile, setShopDrawingFile] = useState<File | null>(null);
  const [promptBody, setPromptBody] = useState(DEFAULT_PROMPT_BODY);

  const [stage, setStage] = useState<Stage>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ReconciliationResult | null>(null);

  const [dwgFile, setDwgFile] = useState<File | null>(null);
  const [drawingId, setDrawingId] = useState<string | null>(null);
  const [dwgStage, setDwgStage] = useState<DwgUploadStage>("idle");
  const [dwgErrorMessage, setDwgErrorMessage] = useState<string | null>(null);

  const allFilesSelected = orderFile && shopDrawingFile;
  const isBusy = stage === "uploading" || stage === "analyzing";
  const isDwgUploading = dwgStage === "uploading";

  async function handleRun() {
    if (!orderFile || !shopDrawingFile) return;

    setErrorMessage(null);
    setResult(null);
    setDwgFile(null);
    setDrawingId(null);
    setDwgErrorMessage(null);
    setDwgStage("idle");
    setStage("uploading");

    try {
      const formData = new FormData();
      formData.append("order", orderFile);
      formData.append("shopDrawing", shopDrawingFile);

      const uploadRes = await fetch("/api/waltz/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error ?? "Upload failed.");

      setStage("analyzing");

      const analyzeRes = await fetch("/api/waltz/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...uploadData, systemPromptBody: promptBody }),
      });
      const analyzeData = await analyzeRes.json();
      if (!analyzeRes.ok) throw new Error(analyzeData.error ?? "Analysis failed.");

      setResult(analyzeData as ReconciliationResult);
      setStage("done");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      setStage("error");
    }
  }

  async function handleDwgUpload() {
    if (!dwgFile) return;

    setDwgErrorMessage(null);
    setDwgStage("uploading");

    try {
      const formData = new FormData();
      formData.append("dwg", dwgFile);

      const uploadRes = await fetch("/api/drawings", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error ?? "DWG upload failed.");

      setDrawingId(uploadData.drawing.id);
      setDwgStage("ready");
    } catch (err) {
      setDwgErrorMessage(err instanceof Error ? err.message : "DWG upload failed.");
      setDwgStage("error");
    }
  }

  function handleReset() {
    setOrderFile(null);
    setShopDrawingFile(null);
    setResult(null);
    setDwgFile(null);
    setDrawingId(null);
    setDwgErrorMessage(null);
    setDwgStage("idle");
    setErrorMessage(null);
    setStage("idle");
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Waltz Document Reconciliation</h1>
        <p className="text-sm text-muted-foreground">
          Upload the Waltz order PDF and shop drawing PDF for comparison. DWG editing is available
          after the comparison is complete.
        </p>
      </div>

      <PromptEditor value={promptBody} onChange={setPromptBody} disabled={isBusy} />

      <div className="grid gap-4 sm:grid-cols-2">
        <FileDropCard
          label="Waltz Order"
          description="Source of truth PDF"
          file={orderFile}
          onFileSelected={setOrderFile}
          disabled={isBusy}
        />
        <FileDropCard
          label="Shop Drawing"
          description="Fabrication blueprint PDF for comparison"
          file={shopDrawingFile}
          onFileSelected={setShopDrawingFile}
          disabled={isBusy}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleRun} disabled={!allFilesSelected || isBusy} size="lg">
          {isBusy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {stage === "uploading" ? "Uploading PDFs..." : "Analyzing..."}
            </>
          ) : (
            <>
              <ScanSearch className="mr-2 h-4 w-4" />
              Run reconciliation
            </>
          )}
        </Button>
        {(result || errorMessage) && (
          <Button variant="ghost" onClick={handleReset} disabled={isBusy}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Start over
          </Button>
        )}
      </div>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {result && (
        <div className="space-y-4">
          <Separator />
          <h2 className="text-lg font-semibold">
            Location {result.location.number} - {result.location.name}
          </h2>
          <QaLogTable rows={result.rows} />

          <div className="rounded-lg border bg-card p-4">
            <div className="mb-4 space-y-1">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <PencilRuler className="h-4 w-4" />
                Edit original DWG
              </h3>
              <p className="text-xs text-muted-foreground">
                Upload the native DWG for this same shop drawing, then open it in the editor.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <FileDropCard
                label="Shop Drawing DWG"
                description="Original native drawing file"
                file={dwgFile}
                onFileSelected={(file) => {
                  setDwgFile(file);
                  setDrawingId(null);
                  setDwgErrorMessage(null);
                  setDwgStage("idle");
                }}
                accept=".dwg,application/acad"
                disabled={isDwgUploading}
              />
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleDwgUpload} disabled={!dwgFile || isDwgUploading}>
                  {isDwgUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload DWG
                    </>
                  )}
                </Button>
                {drawingId && (
                  <Link className={buttonVariants({ variant: "outline" })} href={`/editor/${drawingId}`}>
                    Edit DWG
                  </Link>
                )}
              </div>
            </div>

            {dwgErrorMessage && <p className="mt-3 text-sm text-destructive">{dwgErrorMessage}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
