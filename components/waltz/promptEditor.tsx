"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_PROMPT_BODY } from "@/lib/waltz-prompt";

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function PromptEditor({ value, onChange, disabled }: PromptEditorProps) {
  const [expanded, setExpanded] = useState(false);
  const isEdited = value !== DEFAULT_PROMPT_BODY;

  return (
    <Card>
      <CardHeader
        className="flex cursor-pointer flex-row items-center justify-between space-y-0 py-4"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium">Reconciliation instructions</CardTitle>
          {isEdited && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              Edited
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Edit the rules Claude uses to compare the two documents. The output format (JSON
            shape used to render the table below) is fixed and always applied automatically,
            so edits here only affect the comparison logic and writing style, not the response
            structure.
          </p>
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            rows={16}
            className="font-mono text-xs leading-relaxed"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange(DEFAULT_PROMPT_BODY)}
            disabled={disabled || !isEdited}
          >
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            Reset to default
          </Button>
        </CardContent>
      )}
    </Card>
  );
}