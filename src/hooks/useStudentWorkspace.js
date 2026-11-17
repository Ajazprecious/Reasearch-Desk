import { localClient } from "@/api/localClient";
import { useAuth } from "@/lib/AuthContext";
import { useAsync } from "@/hooks/useAsync";

/** Loads everything the student workspace tabs share: profile, supervisor, milestones, versions, feedback. */
export function useStudentWorkspace() {
  const { user } = useAuth();

  const state = useAsync(async () => {
    const email = user.email;
    const [profiles, assignments, milestones, drafts, feedbacks] = await Promise.all([
      localClient.entities.ResearchProfile.filter({ student_email: email }, { sort: "-created_date", limit: 1 }),
      localClient.entities.Assignment.filter({ student_email: email }, { sort: "-created_date", limit: 1 }),
      localClient.entities.Milestone.filter({ student_email: email }, { sort: "order", limit: 50 }),
      localClient.entities.Draft.filter({ student_email: email }, { sort: "-submitted_date", limit: 200 }),
      localClient.entities.Feedback.filter({ student_email: email }, { sort: "-reviewed_date", limit: 100 }),
    ]);

    const profile = profiles.items[0] || null;
    let supervisor = null;
    if (profile?.supervisor_email) {
      const supervisors = await localClient.entities.SupervisorProfile.filter({ email: profile.supervisor_email }, { limit: 1 });
      supervisor = supervisors.items[0] || null;
    }

    const list = milestones.items;
    const approved = list.filter((milestone) => milestone.status === "approved").length;

    return {
      profile,
      assignment: assignments.items[0] || null,
      supervisor,
      milestones: list,
      drafts: drafts.items,
      feedbacks: feedbacks.items,
      approved,
      progress: list.length ? Math.round((approved / list.length) * 100) : profile?.progress || 0,
    };
  }, [user?.email]);

  return { ...state, user };
}

export function versionsFor(drafts, milestoneId) {
  return drafts
    .filter((draft) => draft.milestone_id === milestoneId)
    .sort((a, b) => (b.version || 0) - (a.version || 0));
}