import { useState } from "react";
import { toast } from "sonner";
import { localClient } from "@/api/localClient";
import { Button } from "@/components/ui/button";
import { SelectField, TextAreaField, TextField } from "@/components/workspace/Field";
import { wordCount } from "@/lib/format";

const PROGRAMMES = [
  "MSc Computer Science",
  "MSc Public Health",
  "MSc Economics",
  "MPhil Education",
  "MBA",
  "PhD Computer Science",
  "PhD Public Policy",
];

/** Research profile form: the input the supervisor matcher works from. */
export function ResearchProfileForm({ profile, user, onSaved }) {
  const [form, setForm] = useState({
    student_name: profile?.student_name || user?.full_name || "",
    matric_number: profile?.matric_number || "",
    programme: profile?.programme || PROGRAMMES[0],
    department: profile?.department || "",
    faculty: profile?.faculty || "",
    level: profile?.level || "Masters",
    research_title: profile?.research_title || "",
    research_area: profile?.research_area || "",
    keywords: profile?.keywords || "",
    description: profile?.description || "",
  });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const set = (key) => (event) => setForm((previous) => ({ ...previous, [key]: event.target.value }));

  async function persist(status) {
    setError("");
    if (!form.research_title.trim() || !form.research_area.trim()) {
      setError("A research title and research area are needed before saving.");
      return;
    }
    if (status === "submitted" && form.description.trim().length < 40) {
      setError("Add a short description (at least 40 characters) so the matcher has enough to work with.");
      return;
    }
    setBusy(status);
    try {
      const payload = {
        ...form,
        student_email: user.email,
        status,
        submitted_date: status === "submitted" ? new Date().toISOString().slice(0, 10) : profile?.submitted_date || "",
      };
      if (profile) await localClient.entities.ResearchProfile.update(profile.id, payload);
      else await localClient.entities.ResearchProfile.create(payload);
      await localClient.auth.updateMe({ department: form.department, faculty: form.faculty });
      toast.success(status === "submitted" ? "Research profile submitted" : "Draft saved");
      await onSaved?.(status);
    } catch (err) {
      setError(err?.message || "Could not save your research profile");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField id="student_name" label="Full name" value={form.student_name} onChange={set("student_name")} placeholder="Amara Okonkwo" />
        <TextField id="matric" label="Matric / registration number" value={form.matric_number} onChange={set("matric_number")} placeholder="PG/2024/0193" />
        <SelectField
          id="programme"
          label="Programme"
          value={form.programme}
          onChange={set("programme")}
          options={PROGRAMMES.map((programme) => ({ value: programme, label: programme }))}
        />
        <SelectField
          id="level"
          label="Research level"
          value={form.level}
          onChange={set("level")}
          options={[
            { value: "Masters", label: "Masters" },
            { value: "PhD", label: "PhD" },
          ]}
        />
        <TextField id="department" label="Department" value={form.department} onChange={set("department")} placeholder="Computer Science" />
        <TextField id="faculty" label="Faculty" value={form.faculty} onChange={set("faculty")} placeholder="Faculty of Science" />
      </div>

      <div className="rounded-xl border border-slate-100 bg-[#FAFBFB] p-4">
        <p className="mb-4 text-[12px] font-medium uppercase tracking-[0.1em] text-slate-400">Research information</p>
        <div className="space-y-4">
          <TextField
            id="research_title"
            label="Research title"
            value={form.research_title}
            onChange={set("research_title")}
            placeholder="Machine learning for early detection of crop disease in smallholder farms"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField id="research_area" label="Research area" value={form.research_area} onChange={set("research_area")} placeholder="Applied machine learning" />
            <TextField id="keywords" label="Keywords" hint="Comma separated — they sharpen the supervisor match." value={form.keywords} onChange={set("keywords")} placeholder="machine learning, agriculture, computer vision" />
          </div>
          <TextAreaField
            id="description"
            label="Short description"
            hint={`${wordCount(form.description)} words`}
            rows={5}
            value={form.description}
            onChange={set("description")}
            placeholder="Summarise the problem, your proposed approach and the data you plan to use."
          />
        </div>
      </div>

      {error && <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[12.5px] text-[#C62828]">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={() => persist("submitted")}
          disabled={Boolean(busy)}
          className="h-11 rounded-xl bg-[#00796B] px-5 text-[13.5px] font-medium hover:bg-[#007D6D]"
        >
          {busy === "submitted" ? "Submitting…" : profile?.status === "submitted" ? "Resubmit for matching" : "Submit for supervisor matching"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => persist("draft")}
          disabled={Boolean(busy)}
          className="h-11 rounded-xl border-slate-200 px-5 text-[13.5px] font-medium text-slate-600 shadow-none hover:bg-slate-50"
        >
          {busy === "draft" ? "Saving…" : "Save draft"}
        </Button>
      </div>
    </div>
  );
}