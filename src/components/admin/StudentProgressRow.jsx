import { FileText } from "lucide-react";
import { ProgressBar } from "@/components/workspace/ProgressBar";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { MilestoneStrip } from "@/components/admin/MilestoneStrip";
import { dueLabel, formatDate } from "@/lib/format";

/** One student's supervision cycle at a glance: milestones, drafts and the next deadline. */
export function StudentProgressRow({ student }) {
  const { drafts } = student;

  return (
    <div className="border-b border-slate-100 px-1 py-4 last:border-0">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13.5px] font-medium text-[#0A1929]">{student.student_name || student.student_email}</p>
            {student.matric_number && <span className="text-[11px] text-slate-400">{student.matric_number}</span>}
            <StatusBadge status={student.status} />
            {student.overdue > 0 && (
              <span className="rounded-full bg-[#FFEBEE] px-2 py-0.5 text-[11px] font-medium text-[#C62828]">
                {student.overdue} overdue
              </span>
            )}
          </div>
          <p className="mt-1 max-w-[440px] truncate text-[12px] text-slate-500">{student.research_title}</p>
          <p className="mt-0.5 text-[11.5px] text-slate-400">
            {student.supervisor_name} · {student.department || "No department"}
          </p>
        </div>

        <div className="w-full sm:w-[190px]">
          <ProgressBar value={student.progress} showLabel tone={student.progress < 35 ? "rose" : "teal"} />
          <p className="mt-1 text-[10.5px] text-slate-400">
            {student.approved}/{student.total} milestones confirmed
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <MilestoneStrip milestones={student.milestones} />

        <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-slate-500">
          {drafts.awaitingReview > 0 && (
            <span className="rounded-full bg-[#E3F2FD] px-2 py-0.5 font-medium text-[#1565C0]">
              {drafts.awaitingReview} awaiting review
            </span>
          )}
          {drafts.revisions > 0 && (
            <span className="rounded-full bg-[#FFEBEE] px-2 py-0.5 font-medium text-[#C62828]">
              {drafts.revisions} in revision
            </span>
          )}
          {drafts.approved > 0 && (
            <span className="rounded-full bg-[#E8F5E9] px-2 py-0.5 font-medium text-[#2E7D32]">
              {drafts.approved} approved
            </span>
          )}
          {drafts.latest ? (
            <span className="inline-flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              {drafts.latest.milestone_title} · v{drafts.latest.version}
              <StatusBadge status={drafts.latest.status} />
            </span>
          ) : (
            <span className="text-slate-400">No drafts yet</span>
          )}
        </div>

        {student.next && (
          <span className="text-[11.5px] text-slate-400">
            Next: {student.next.title} · {formatDate(student.next.due_date)} ({dueLabel(student.next.due_date)})
          </span>
        )}
      </div>
    </div>
  );
}