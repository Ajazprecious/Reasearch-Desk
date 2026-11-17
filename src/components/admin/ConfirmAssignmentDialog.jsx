import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TextAreaField } from "@/components/workspace/Field";
import { ProgressBar } from "@/components/workspace/ProgressBar";
import { confirmAssignment } from "@/lib/server-fns";

/** Administrator confirmation of one ranked supervisor suggestion. */
export function ConfirmAssignmentDialog({ open, onOpenChange, candidate, student, onConfirmed }) {
  const confirm = useServerFn(confirmAssignment);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setNote("");
      setError("");
    }
  }, [open]);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const result = await confirm({ data: { recommendationId: candidate.id, note: note.trim() } });
      if (result?.ok === false) {
        toast.error(result.message);
      } else {
        toast.success(`${candidate.supervisor_name} confirmed`, {
          description: `${student.student_name || student.student_email} has been notified.`,
        });
        onOpenChange(false);
        await onConfirmed?.();
      }
    } catch (err) {
      setError(err?.message || "Could not confirm this assignment");
    } finally {
      setBusy(false);
    }
  }

  if (!candidate) return null;
  const [load, max] = String(candidate.capacity_snapshot || "0/0")
    .split("/")
    .map((value) => Number(value) || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[18px]">Confirm supervisor assignment</DialogTitle>
          <DialogDescription className="text-[13px]">
            This creates the supervision workspace, opens the standard milestones and notifies both people.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-[#FBFCFC] p-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-slate-400">Student</p>
            <p className="mt-1 text-[13.5px] font-medium text-[#0A1929]">{student.student_name || student.student_email}</p>
            <p className="mt-0.5 text-[12px] text-slate-500">{student.research_title}</p>
          </div>

          <div className="rounded-xl border border-[#C8E6C9] bg-[#F4FBF5] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] text-[#7BA37E]">Supervisor</p>
                <p className="mt-1 text-[13.5px] font-medium text-[#0A1929]">{candidate.supervisor_name}</p>
                <p className="mt-0.5 text-[12px] text-slate-500">
                  {candidate.academic_rank} · {candidate.supervisor_department}
                </p>
              </div>
              <span className="rounded-lg bg-white px-2.5 py-1.5 text-[13px] font-semibold text-[#2E7D32]">{candidate.match_score}%</span>
            </div>
            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between text-[11.5px] text-slate-500">
                <span>Supervision load</span>
                <span className="tabular-nums">
                  {load}/{max}
                </span>
              </div>
              <ProgressBar value={max ? Math.round((load / max) * 100) : 0} tone={max && load >= max ? "rose" : "teal"} />
            </div>
          </div>

          <TextAreaField
            id="decision-note"
            label="Decision note"
            hint="Optional — recorded with the assignment."
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Expertise in the same methodological area; capacity available."
          />
          {error && <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[12.5px] text-[#C62828]">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10 rounded-xl border-slate-200 text-[13px]">
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy} className="h-10 rounded-xl bg-[#00796B] px-5 text-[13px] font-medium hover:bg-[#007D6D]">
            {busy ? "Confirming…" : "Confirm assignment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}