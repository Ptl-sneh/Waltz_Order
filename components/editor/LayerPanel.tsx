"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/lib/stores/editor-store";

export function LayerPanel() {
  const [query, setQuery] = useState("");
  const layers = useEditorStore((state) => state.layers);
  const viewer = useEditorStore((state) => state.viewer);

  const filtered = useMemo(
    () => layers.filter((layer) => layer.name.toLowerCase().includes(query.toLowerCase())),
    [layers, query]
  );

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-background md:flex md:flex-col">
      <div className="border-b p-3">
        <h2 className="text-sm font-semibold">Layers</h2>
        <label className="mt-2 flex h-8 items-center gap-2 rounded-md border px-2 text-xs">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent outline-none"
            placeholder="Search layers"
          />
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {filtered.map((layer) => (
          <div key={layer.id} className="grid grid-cols-[18px_1fr_auto] items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted">
            <span className="h-3.5 w-3.5 rounded-sm border" style={{ backgroundColor: layer.color }} />
            <button className="truncate text-left" onClick={() => viewer?.setActiveLayer(layer.id)} title={layer.name}>
              {layer.active ? "* " : ""}
              {layer.name}
            </button>
            <div className="flex gap-1">
              <Button size="icon-xs" variant={layer.visible ? "secondary" : "ghost"} onClick={() => viewer?.setLayerVisibility(layer.id, !layer.visible)} title="Show or hide layer">
                V
              </Button>
              <Button size="icon-xs" variant={layer.locked ? "secondary" : "ghost"} onClick={() => viewer?.setLayerLocked(layer.id, !layer.locked)} title="Lock layer">
                L
              </Button>
              <Button size="icon-xs" variant={layer.frozen ? "secondary" : "ghost"} onClick={() => viewer?.setLayerFrozen(layer.id, !layer.frozen)} title="Freeze layer">
                F
              </Button>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
