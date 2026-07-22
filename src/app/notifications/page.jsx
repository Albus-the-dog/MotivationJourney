"use client";
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useUser from "@/utils/useUser";
import { ArrowLeft, Bell, Users, MessageSquare, Loader2, Check, X, ArrowUpRight, AlarmClock } from "lucide-react";
import { format } from "date-fns";

function Avatar({ name, image, size = 9 }) {
  const cls = `w-${size} h-${size} rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 overflow-hidden`;
  if (image) {
    return (
      <div className={cls}>
        <img src={image} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className={`${cls} bg-indigo-100 text-indigo-600`}>
      {name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

export default function NotificationsPage() {
  const { data: user, loading: userLoading } = useUser();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !userLoading && !!user,
  });

  useEffect(() => {
    if (!user?.id || !data) return;
    const total =
      (data.invites?.length ?? 0) +
      (data.boosts?.length ?? 0) +
      (data.reminders?.length ?? 0);
    localStorage.setItem(`notif-seen-count-${user.id}`, String(total));
  }, [user?.id, data]);

  const respondMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const res = await fetch(`/api/team-invites/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    if (typeof window !== "undefined") window.location.href = "/account/signin";
    return null;
  }

  const showBoosts = typeof window !== "undefined"
    ? localStorage.getItem(`notif-boosts-${user?.id}`) !== "0"
    : true;
  const showInvites = typeof window !== "undefined"
    ? localStorage.getItem(`notif-invites-${user?.id}`) !== "0"
    : true;

  const invites = showInvites ? (data?.invites ?? []) : [];
  const boosts = showBoosts ? (data?.boosts ?? []) : [];
  const reminders = data?.reminders ?? [];
  const isEmpty = invites.length === 0 && boosts.length === 0 && reminders.length === 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center gap-4">
          <a href="/dashboard" className="p-2 hover:bg-gray-50 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-gray-600" />
          </a>
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-indigo-600" />
            <span className="font-bold text-gray-900 text-lg">Notifications</span>
          </div>
          {invites.length > 0 && (
            <span className="ml-auto text-xs font-bold bg-rose-500 text-white px-2 py-0.5 rounded-full">
              {invites.length} pending
            </span>
          )}
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={28} className="text-indigo-400 animate-spin" />
          </div>
        ) : isEmpty ? (
          <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center shadow-sm">
            <Bell size={36} className="text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">You're all caught up!</p>
            <p className="text-gray-400 text-sm mt-1">No new notifications right now.</p>
          </div>
        ) : (
          <>
            {/* Team Invites */}
            {invites.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Users size={16} className="text-indigo-600" />
                  <h2 className="font-bold text-gray-900">Team Invites</h2>
                  <span className="text-xs font-bold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                    {invites.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {invites.map((invite) => (
                    <div
                      key={invite.id}
                      className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar name={invite.from_user_name} image={invite.from_user_image} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 leading-snug">
                            <span className="font-bold">{invite.from_user_name || "Someone"}</span>
                            {" "}wants to team up with you on{" "}
                            <span className="font-bold text-indigo-600">"{invite.resolution_title}"</span>
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {format(new Date(invite.created_at), "MMM d, yyyy · h:mm a")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-4 ml-12">
                        <button
                          onClick={() => respondMutation.mutate({ id: invite.id, status: "accepted" })}
                          disabled={respondMutation.isPending}
                          className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all disabled:opacity-50"
                        >
                          {respondMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                          Accept
                        </button>
                        <button
                          onClick={() => respondMutation.mutate({ id: invite.id, status: "declined" })}
                          disabled={respondMutation.isPending}
                          className="flex items-center gap-1.5 border border-gray-200 text-gray-500 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all disabled:opacity-50"
                        >
                          <X size={13} />
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Reminders */}
            {reminders.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <AlarmClock size={16} className="text-amber-500" />
                  <h2 className="font-bold text-gray-900">Reminders</h2>
                  <span className="text-xs font-bold bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">
                    {reminders.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {reminders.map((r) => (
                    <div
                      key={`${r.type}-${r.resolution_id}`}
                      className="bg-white rounded-2xl border border-amber-100 p-5 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 text-lg">
                          {r.type === "deadline" ? "⏰" : "🔁"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 leading-snug">
                            {r.type === "deadline" ? (
                              <>
                                Your goal{" "}
                                <span className="font-bold text-indigo-600">"{r.title}"</span>
                                {" "}is due in{" "}
                                <span className="font-bold text-amber-600">{r.days_left} day{r.days_left !== 1 ? "s" : ""}</span>
                                {" "}— keep pushing!
                              </>
                            ) : (
                              <>
                                It's been{" "}
                                <span className="font-bold text-amber-600">{r.days_since} day{r.days_since !== 1 ? "s" : ""}</span>
                                {" "}since you logged progress on{" "}
                                <span className="font-bold text-indigo-600">"{r.title}"</span>
                                {" "}— don't break your streak!
                              </>
                            )}
                          </p>
                          <div className="mt-2">
                            <a
                              href={`/resolution/${r.resolution_id}`}
                              className="text-xs text-indigo-600 font-bold flex items-center gap-0.5 hover:underline w-fit"
                            >
                              Go to goal <ArrowUpRight size={12} />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Boosts on your goals */}
            {boosts.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare size={16} className="text-indigo-600" />
                  <h2 className="font-bold text-gray-900">Messages on Your Goals</h2>
                  <span className="text-xs font-bold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                    {boosts.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {boosts.map((boost) => (
                    <div
                      key={boost.id}
                      className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar name={boost.from_user_name} image={boost.from_user_image} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 mb-1">
                            <span className="font-bold">{boost.from_user_name || "Someone"}</span>
                            {" "}boosted your goal{" "}
                            <span className="font-bold text-indigo-600">"{boost.resolution_title}"</span>
                          </p>
                          <p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2 leading-relaxed">
                            "{boost.message}"
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-400">
                              {format(new Date(boost.created_at), "MMM d, yyyy · h:mm a")}
                            </span>
                            <a
                              href={`/resolution/${boost.res_id}`}
                              className="text-xs text-indigo-600 font-bold flex items-center gap-0.5 hover:underline"
                            >
                              View goal <ArrowUpRight size={12} />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
