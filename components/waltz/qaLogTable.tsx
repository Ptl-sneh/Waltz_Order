import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { QaLogRow } from "@/types/waltz";

function isCleanRow(row: QaLogRow) {
  return row.errorNumber.endsWith(".0");
}

export function QaLogTable({ rows }: { rows: QaLogRow[] }) {
  const wordCount = rows.reduce((sum, r) => sum + r.note.split(/\s+/).filter(Boolean).length, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">QA log</h3>
        <span className="text-xs text-muted-foreground">{wordCount} words</span>
      </div>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[160px]">Error Number</TableHead>
              <TableHead>What we can learn</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow
                key={i}
                className={cn(!isCleanRow(row) && "bg-amber-50/40 dark:bg-amber-950/10")}
              >
                <TableCell className="align-top font-mono text-xs">
                  <Badge
                    variant="secondary"
                    className={
                      isCleanRow(row)
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    }
                  >
                    {row.errorNumber}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm leading-snug">{row.note}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
