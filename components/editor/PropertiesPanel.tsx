"use client";

import { useEditorStore } from "@/lib/stores/editor-store";

function PropertyRow({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="grid grid-cols-[90px_1fr] gap-2 py-1 text-xs">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value ?? "-"}</dd>
    </div>
  );
}

export function PropertiesPanel() {
  const selectedEntities = useEditorStore((state) => state.selectedEntities);
  const viewer = useEditorStore((state) => state.viewer);
  const entity = selectedEntities[0];

  return (
    <aside className="hidden w-72 shrink-0 border-l bg-background lg:flex lg:flex-col">
      <div className="border-b p-3">
        <h2 className="text-sm font-semibold">Properties</h2>
        <p className="text-xs text-muted-foreground">{selectedEntities.length} selected</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {!entity ? (
          <p className="text-xs text-muted-foreground">Select an entity to inspect and edit its properties.</p>
        ) : (
          <dl>
            <PropertyRow label="Type" value={entity.type} />
            <PropertyRow label="Layer" value={entity.layer} />
            <PropertyRow label="Color" value={entity.color} />
            <PropertyRow label="Line weight" value={entity.lineWeight} />
            <PropertyRow label="X" value={entity.coordinates?.x} />
            <PropertyRow label="Y" value={entity.coordinates?.y} />
            <PropertyRow label="Rotation" value={entity.rotation} />
            <PropertyRow label="Scale" value={entity.scale} />
            <PropertyRow label="Length" value={entity.length} />
            <PropertyRow label="Radius" value={entity.radius} />
            <PropertyRow label="Area" value={entity.area} />
            <label className="mt-3 block text-xs text-muted-foreground">
              Text
              <input
                value={entity.text ?? ""}
                onChange={(event) => viewer?.updateEntity(entity.id, { text: event.target.value })}
                className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-foreground outline-none focus:ring-2 focus:ring-ring/30"
              />
            </label>
          </dl>
        )}
      </div>
    </aside>
  );
}
