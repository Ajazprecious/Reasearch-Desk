import { useState } from "react";
import { toast } from "sonner";
import { localClient } from "@/api/localClient";
import { Button } from "@/components/ui/button";
import { SelectField, TextAreaField, TextField } from "@/components/workspace/Field";

const RANKS = ["Professor", "Associate Professor", "Senior Lecturer", "Lecturer"];

/** Expertise, capacity and availability — the record the supervisor matcher reads. */
export function ExpertiseForm({ profile, user, onSaved }) {
  const [form, setForm] = useState({
    full_name: profile?.full_name || user?.full_name || "",
    department: profile?.department || "",
    faculty: profile?.faculty || "",
    academic_rank: profile?.academic_rank || "Senior Lecturer",
    research_areas: profile?.research_areas || "",
    keywords: profile?.keywords || "",
    bio: profile?.bio || "",
    max_capacity: profile?.max_capacity ?? 5,
    availability: profile?.availability || "available",
    preferred_level: profile?.preferred_level || "Both",
    office_hours: profile?.office_hours || "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (event) => setForm((previous) => ({ ...previous, [key]: event.target.value }));

  async function save() {
    setError("");
    if (!form.research_areas.trim()) {
      setError("List at least one research area — it is the strongest signal in the matching.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ...form,
        email: user.email,
        max_capacity: Number(form.max_capacity) || 0,
        current_load: profile?.current_load || 0,
      };
      if (profile) await localClient.entities.SupervisorProfile.update(profile.id, payload);
      else await localClient.entities.SupervisorProfile.create(payload);
      await localClient.auth.updateMe({ department: form.department, faculty: form.faculty });
      toast.success("Expertise profile saved");
      await onSaved?.();
    } catch (err) {
      setError(err?.message || "Could not save your profile");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField id="full_name" label="Full name" value={form.full_name} onChange={set("full_name")} />
        <SelectField
          id="academic_rank"
          label="Academic rank"
          value={form.academic_rank}
          onChange={set("academic_rank")}
          options={RANKS.map((rank) => ({ value: rank, label: rank }))}
        />
        <TextField id="department" label="Department" value={form.department} onChange={set("department")} placeholder="Computer Science" />
        <TextField id="faculty" label="Faculty" value={form.faculty} onChange={set("faculty")} placeholder="Faculty of Science" />
      </div>

      <div className="rounded-xl border border-slate-100 bg-[#FAFBFB] p-4">
        <p className="mb-4 text-[12px] font-medium uppercase tracking-[0.1em] text-slate-400">Expertise</p>
        <div className="space-y-4">
          <TextField
            id="research_areas"
            label="Research areas"
            hint="Comma separated — these are matched against student research areas."
            value={form.research_areas}
            onChange={set("research_areas")}
            placeholder="Machine learning, computer vision, data mining"
          />
          <TextField
            id="keywords"
            label="Interests & keywords"
            value={form.keywords}
            onChange={set("keywords")}
            placeholder="deep learning, remote sensing, agriculture"
          />
          <TextAreaField id="bio" label="Short biography" rows={3} value={form.bio} onChange={set("bio")} placeholder="Current projects, methods and the kind of projects you enjoy supervising." />
        </div>
      </div>

      <div className="rounded-xl border border-slate-100 bg-[#FAFBFB] p-4">
        <p className="mb-4 text-[12px] font-medium uppercase tracking-[0.1em] text-slate-400">Capacity & availability</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="max_capacity"
            label="Maximum supervision capacity"
            type="number"
            min="1"
            max="20"
            value={form.max_capacity}
            onChange={set("max_capacity")}
            hint={`Currently supervising ${profile?.current_load || 0}. Supervisors at capacity are excluded from matching.`}
          />
          <SelectField
            id="availability"
            label="Availability"
            value={form.availability}
            onChange={set("availability")}
            options={[
              { value: "available", label: "Available for new students" },
              { value: "limited", label: "Limited availability" },
              { value: "unavailable", label: "Not taking new students" },
            ]}
          />
          <SelectField
            id="preferred_level"
            label="Preferred research level"
            value={form.preferred_level}
            onChange={set("preferred_level")}
            options={[
              { value: "Both", label: "Masters and PhD" },
              { value: "Masters", label: "Masters only" },
              { value: "PhD", label: "PhD only" },
            ]}
          />
          <TextField id="office_hours" label="Consultation hours" value={form.office_hours} onChange={set("office_hours")} placeholder="Tuesdays 10:00–12:00" />
        </div>
      </div>

      {error && <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[12.5px] text-[#C62828]">{error}</p>}

      <Button onClick={save} disabled={busy} className="h-11 rounded-xl bg-[#00796B] px-5 text-[13.5px] font-medium hover:bg-[#007D6D]">
        {busy ? "Saving…" : "Save expertise profile"}
      </Button>
    </div>
  );
}