import { useEffect, useState } from "react";
import { localClient } from "@/api/localClient";
import { useAuth } from "@/lib/AuthContext";

/** Live counts shown beside sidebar items (review queue, unread notifications). */
export function useNavBadges(role) {
  const { user } = useAuth();
  const [badges, setBadges] = useState({});

  useEffect(() => {
    if (!user?.email) {
      setBadges({});
      return;
    }
    let active = true;
    Promise.all([
      localClient.entities.Notification.count({ user_email: user.email, is_read: false }).catch(() => 0),
      role === "supervisor"
        ? localClient.entities.Draft.count({ supervisor_email: user.email, status: "submitted" }).catch(() => 0)
        : Promise.resolve(0),
    ]).then(([notifications, reviews]) => {
      if (active) setBadges({ notifications, reviews });
    });
    return () => {
      active = false;
    };
  }, [user?.email, role]);

  return badges;
}