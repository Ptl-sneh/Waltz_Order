"use client";

import { useRef } from "react";
import { FileText, Upload, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FileDropCardProps {
  label: string;
  description: string;
  file: File | null;
  onFileSelected: (file: File | null) => void;
  accept?: string;
  disabled?: boolean;
}

export function FileDropCard({
  label,
  description,
  file,
  onFileSelected,
  accept = "application/pdf",
  disabled,
}: FileDropCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Card
      className={cn(
        "border-dashed transition-colors cursor-pointer hover:border-primary/60",
        file && "border-solid border-emerald-500/60 bg-emerald-50/50 dark:bg-emerald-950/20",
        disabled && "opacity-60 pointer-events-none"
      )}
      onClick={() => inputRef.current?.click()}
    >
      <CardContent className="flex flex-col items-center justify-center gap-2 py-8 text-center">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        ) : (
          <Upload className="h-8 w-8 text-muted-foreground" />
        )}
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground max-w-[220px]">{description}</p>
        {file && (
          <div className="mt-2 flex items-center gap-1.5 rounded-md bg-background/60 px-2 py-1 text-xs">
            <FileText className="h-3.5 w-3.5" />
            <span className="max-w-[180px] truncate">{file.name}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
