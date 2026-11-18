import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SelectField, TextAreaField, TextField } from "@/components/workspace/Field";
import { scheduleDefence } from "@/lib/server-fns";

export function ScheduleDefenceDialog({ open, onOpenChange, candidates, onScheduled }) {
  const schedule = useServerFn(scheduleDefence);
  const [form, setForm] = useState({ studentEmail: "", scheduledDate: "", scheduledTime: "", venue: "", panel: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm({
      studentEmail: candidates[0]?.student_email || "",
      scheduledDate: "",
      scheduledTime: "10:00",
      venue: "",
      panel: "",
      notes: "",
    });
    setError("");
  }, [open, candidates]);

  const set = (key) => (event) => setForm((previous) => ({ ...previous, [key]: event.target.value }));

  async function submit() {
    setError("");
    if (!form.studentEmail || !form.scheduledDate) {
      setError("Choose the student and a defence date.");
      return;
    }
    setBusy(true);
    try {
      await schedule({ data: form });
      toast.success("Defence scheduled", { description: "The student and supervisor have been notified." });
      onOpenChange(false);
      await onScheduled?.();
    } catch (err) {
      setError(err?.message || "Could not schedule this defence");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[18px]">Schedule a defence</DialogTitle>
          <DialogDescription className="text-[13px]">Add the examination slot to the timeline.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <SelectField
            id="student"
            label="Student"
            value={form.studentEmail}
            onChange={set("studentEmail")}
            options={
              candidates.length
                ? candidates.map((candidate) => ({
                    value: candidate.student_email,
                    label: `${candidate.student_name} — ${candidate.department || "department not set"}`,
                  }))
                : [{ value: "", label: "No active assignments yet" }]
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField id="date" label="Date" type="date" value={form.scheduledDate} onChange={set("scheduledDate")} />
            <TextField id="time" label="Time" type="time" value={form.scheduledTime} onChange={set("scheduledTime")} />
          </div>
          <TextField id="venue" label="Venue" value={form.venue} onChange={set("venue")} placeholder="Senate Room 2" />
          <TextAreaField id="panel" label="Panel" hint="Comma separated names." rows={2} value={form.panel} onChange={set("panel")} placeholder="Prof. A. Bello, Dr. C. Nwosu" />
          <TextAreaField id="notes" label="Notes" rows={2} value={form.notes} onChange={set("notes")} />
          {error && <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[12.5px] text-[#C62828]">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10 rounded-xl border-slate-200 text-[13px]">
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy} className="h-10 rounded-xl bg-[#00796B] px-5 text-[13px] font-medium hover:bg-[#007D6D]">
            {busy ? "Scheduling…" : "Schedule defence"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}