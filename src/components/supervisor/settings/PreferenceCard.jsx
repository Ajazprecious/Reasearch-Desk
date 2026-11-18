import { SectionCard } from "@/components/workspace/SectionCard";
import { ToggleRow } from "@/components/supervisor/settings/ToggleRow";

export function PreferenceCard({ title, description, items, prefs, set, idPrefix }) {
  return (
    <SectionCard title={title} description={description}>
      <div>
        {items.map((item) => (
          <ToggleRow
            key={item.key}
            id={`${idPrefix}-${item.key}`}
            label={item.label}
            description={item.description}
            checked={prefs[item.key]}
            onChange={(value) => set({ [item.key]: value })}
          />
        ))}
      </div>
    </SectionCard>
  );
}