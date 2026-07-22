import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useUser from "@/utils/useUser";
import { signOut } from "@auth/create/react";
import {
  Plus,
  Target,
  Calendar,
  ChevronRight,
  Lock,
  Globe,
  Loader2,
  Hash,
  Menu,
  Search,
  Users,
  X,
} from "lucide-react";
import { format } from "date-fns";

const blockPlusMinus = (e) => {
  if (e.key === "+" || e.key === "-") e.preventDefault();
};

const UNIT_PRESETS = [
  "books",
  "pounds",
  "kg",
  "km",
  "miles",
  "pages",
  "hours",
  "sessions",
  "days",
  "videos",
  "lessons",
  "chapters",
];

function Dashboard() {
  const { data: user, loading: userLoading } = useUser();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasMeasurable, setHasMeasurable] = useState(false);
  const [teamUpEnabled, setTeamUpEnabled] = useState(false);
  const [teamUpSearch, setTeamUpSearch] = useState("");
  const [teamUpUser, setTeamUpUser] = useState(null);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [newResolution, setNewResolution] = useState({
    title: "",
    description: "",
    category: "health",
    target_date: "",
    is_public: false,
    target_number: "",
    target_unit: "",
  });

  // Fetch resolutions
  const {
    data: resolutions = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["resolutions"],
    queryFn: async () => {
      const response = await fetch("/api/resolutions");
      if (!response.ok) throw new Error("Failed to fetch resolutions");
      return response.json();
    },
  });

  // Notification badge count (pending team invites)
  const { data: notifData } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) return { invites: [], boosts: [] };
      return res.json();
    },
    enabled: !!user,
    refetchInterval: 60000,
  });
  const pendingInvites = notifData?.invites?.length ?? 0;
  const unreadBoosts = notifData?.boosts?.length ?? 0;
  const pendingReminders = notifData?.reminders?.length ?? 0;
  const totalNotifs = pendingInvites + unreadBoosts + pendingReminders;
  const lastSeenCount = typeof window !== "undefined"
    ? parseInt(localStorage.getItem(`notif-seen-count-${user?.id}`) || "0", 10)
    : 0;
  const showNotifBadge =
    totalNotifs > lastSeenCount &&
    typeof window !== "undefined" &&
    localStorage.getItem(`notif-badge-${user?.id}`) !== "0";

  // User search for Team Up
  const { data: userSearchResults = [], isLoading: userSearchLoading } = useQuery({
    queryKey: ["user-search", teamUpSearch],
    queryFn: async () => {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(teamUpSearch)}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: teamUpEnabled && teamUpSearch.length >= 2,
  });

  // Mutation for adding resolution
  const addMutation = useMutation({
    mutationFn: async ({ resolution, partner }) => {
      const response = await fetch("/api/resolutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resolution),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${response.status}`);
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["resolutions"] });
      setNewResolution({
        title: "",
        description: "",
        category: "health",
        target_date: "",
        is_public: false,
        target_number: "",
        target_unit: "",
      });
      if (variables.partner) {
        fetch("/api/team-invites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resolution_id: data.id, to_user_id: variables.partner.id }),
        }).catch(console.error);
      }
      const msgs = [
        `Good luck on ${data.title}`,
        `Congratulations on creating ${data.title}`,
        `We believe in you, you can do ${data.title}`,
      ];
      const msg = msgs[Math.floor(Math.random() * msgs.length)];
      setNotification({ msg, resolutionId: data.id });
    },
    onError: (error) => {
      setNotification({ msg: `Something went wrong: ${error.message}`, resolutionId: null });
    },
  });

  const getProgressInfo = (resolution) => {
    const percentage = getPercentage(resolution);
    if (percentage === 100)
      return {
        label: "🎉 Complete!",
        color: "text-amber-600",
        bg: "bg-amber-50",
      };
    if (percentage >= 75)
      return {
        label: "🔥 Almost there!",
        color: "text-orange-600",
        bg: "bg-orange-50",
      };
    if (percentage >= 50)
      return { label: "⚡ Halfway!", color: "text-blue-600", bg: "bg-blue-50" };
    if (percentage >= 25)
      return {
        label: "🌱 Growing!",
        color: "text-green-600",
        bg: "bg-green-50",
      };
    return {
      label: "✨ Just starting",
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    };
  };

  const getPercentage = (resolution) => {
    if (resolution.target_number) {
      const done = parseInt(resolution.total_progress) || 0;
      return Math.min(100, Math.round((done / resolution.target_number) * 100));
    }
    const total = parseInt(resolution.total_steps) || 0;
    const completed = parseInt(resolution.completed_steps) || 0;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const handleAdd = (e) => {
    e.preventDefault();
    setIsModalOpen(false);
    addMutation.mutate({
      resolution: {
        ...newResolution,
        target_number: hasMeasurable ? newResolution.target_number : "",
        target_unit: hasMeasurable ? newResolution.target_unit : "",
        reminders_enabled: remindersEnabled,
      },
      partner: teamUpUser,
    });
    setTeamUpEnabled(false);
    setTeamUpUser(null);
    setTeamUpSearch("");
    setRemindersEnabled(false);
  };

  const openModal = () => {
    setHasMeasurable(false);
    setTeamUpEnabled(false);
    setTeamUpUser(null);
    setTeamUpSearch("");
    setRemindersEnabled(false);
    setNewResolution({
      title: "",
      description: "",
      category: "health",
      target_date: "",
      is_public: false,
      target_number: "",
      target_unit: "",
    });
    setIsModalOpen(true);
  };

  // Redirect unauthenticated users in an effect (never during render)
  useEffect(() => {
    if (!userLoading && !user && typeof window !== "undefined") {
      window.location.href = "/account/signin";
    }
  }, [user, userLoading]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (!e.target.closest("[data-menu]")) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
              R
            </div>
            <span className="font-bold text-gray-900 text-lg">
              My Resolutions
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={openModal}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-sm"
            >
              <Plus size={18} />
              New Resolution
            </button>
            <div className="relative" data-menu>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="relative flex flex-col items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 transition-colors gap-0 ml-2"
                aria-label="Menu"
              >
                <span className={`block w-5 h-0.5 bg-gray-600 transition-all duration-300 ${menuOpen ? "rotate-45 translate-y-[8px]" : ""}`} />
                <span className={`block w-5 h-0.5 bg-gray-600 transition-all duration-300 mt-1.5 ${menuOpen ? "opacity-0" : ""}`} />
                <span className={`block w-5 h-0.5 bg-gray-600 transition-all duration-300 mt-1.5 ${menuOpen ? "-rotate-45 -translate-y-[8px]" : ""}`} />
                {showNotifBadge && !menuOpen && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
                )}
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-12 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-dropdown z-50">
                  <a
                    href="/"
                    className="flex items-center gap-3 px-5 py-3.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    🏠 Home
                  </a>
                  <a
                    href="/community"
                    className="flex items-center gap-3 px-5 py-3.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    🌍 Community
                  </a>
                  <a
                    href="/notifications"
                    className="flex items-center justify-between px-5 py-3.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    <span className="flex items-center gap-3">🔔 Notifications</span>
                    {showNotifBadge && (
                      <span className="text-xs font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {totalNotifs}
                      </span>
                    )}
                  </a>
                  <a
                    href="/account/profile"
                    className="flex items-center gap-3 px-5 py-3.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    👤 Account
                  </a>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors border-t border-gray-100"
                  >
                    🚪 Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Welcome Stats */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Hey {user.name || "there"},
            </h1>
            <p className="text-gray-500">
              You have {resolutions.filter((r) => getPercentage(r) < 100).length} active goals you're working on.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4 min-w-[160px]">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                <Target size={20} />
              </div>
              <div>
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                  Active Goals
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {resolutions.filter((r) => getPercentage(r) < 100).length}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resolutions Grid */}
        {resolutions.length === 0 ? (
          <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 p-20 text-center">
            <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Target size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              No resolutions yet
            </h2>
            <p className="text-gray-500 mb-8">
              Ready to turn your dreams into a plan? Create your first
              resolution.
            </p>
            <button
              onClick={openModal}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all"
            >
              Start Here
            </button>
          </div>
        ) : (
          <>
            {/* Active Goals */}
            {resolutions.filter((r) => getPercentage(r) < 100).length > 0 && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {resolutions.filter((r) => getPercentage(r) < 100).map((res) => {
                  const info = getProgressInfo(res);
                  const percentage = getPercentage(res);
                  const done = parseInt(res.total_progress) || 0;
                  const hasTarget = !!(res.target_number && res.target_number > 0);

                  return (
                    <a
                      key={res.id}
                      href={`/resolution/${res.id}`}
                      className="group bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${info.bg} ${info.color}`}
                        >
                          {res.category || "General"}
                        </div>
                        <div className="flex items-center gap-2">
                          {hasTarget && (
                            <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Hash size={10} />
                              {done}/{res.target_number} {res.target_unit}
                            </span>
                          )}
                          {res.is_public ? (
                            <Globe size={16} className="text-gray-300" />
                          ) : (
                            <Lock size={16} className="text-gray-300" />
                          )}
                        </div>
                      </div>

                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                        {res.title}
                      </h3>
                      <p className="text-gray-500 text-sm line-clamp-2 mb-6 h-10">
                        {res.description || "Take the first step toward your goal."}
                      </p>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className={`font-bold ${info.color}`}>
                            {info.label}
                          </span>
                          <span className="text-gray-400">{percentage}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <div className="flex items-center gap-1">
                              <Calendar size={12} />
                              {res.target_date
                                ? format(new Date(res.target_date), "MMM d, yyyy")
                                : "No deadline"}
                            </div>
                            {parseInt(res.cheer_count) > 0 && (
                              <div className="flex items-center gap-1 text-rose-400 font-semibold">
                                ❤️ {res.cheer_count}
                              </div>
                            )}
                          </div>
                          <div className="text-indigo-600 text-sm font-bold flex items-center gap-1">
                            View Plan <ChevronRight size={16} />
                          </div>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}

            {/* Completed Goals */}
            {resolutions.filter((r) => getPercentage(r) === 100).length > 0 && (
              <div className="mt-14">
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Completed Goals</h2>
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                    🎉 {resolutions.filter((r) => getPercentage(r) === 100).length} achieved
                  </span>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {resolutions.filter((r) => getPercentage(r) === 100).map((res) => {
                    const done = parseInt(res.total_progress) || 0;
                    const hasTarget = !!(res.target_number && res.target_number > 0);

                    return (
                      <a
                        key={res.id}
                        href={`/resolution/${res.id}`}
                        className="group bg-white rounded-2xl border border-amber-100 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 opacity-80 hover:opacity-100"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-600">
                            {res.category || "General"}
                          </div>
                          <div className="flex items-center gap-2">
                            {hasTarget && (
                              <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Hash size={10} />
                                {done}/{res.target_number} {res.target_unit}
                              </span>
                            )}
                            {res.is_public ? (
                              <Globe size={16} className="text-gray-300" />
                            ) : (
                              <Lock size={16} className="text-gray-300" />
                            )}
                          </div>
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-amber-600 transition-colors">
                          {res.title}
                        </h3>
                        <p className="text-gray-500 text-sm line-clamp-2 mb-6 h-10">
                          {res.description || "Take the first step toward your goal."}
                        </p>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-bold text-amber-600">🎉 Complete!</span>
                            <span className="text-gray-400">100%</span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400 w-full transition-all duration-500" />
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                            <div className="flex items-center gap-3 text-xs text-gray-400">
                              <div className="flex items-center gap-1">
                                <Calendar size={12} />
                                {res.target_date
                                  ? format(new Date(res.target_date), "MMM d, yyyy")
                                  : "No deadline"}
                              </div>
                              {parseInt(res.cheer_count) > 0 && (
                                <div className="flex items-center gap-1 text-rose-400 font-semibold">
                                  ❤️ {res.cheer_count}
                                </div>
                              )}
                            </div>
                            <div className="text-amber-600 text-sm font-bold flex items-center gap-1">
                              View Plan <ChevronRight size={16} />
                            </div>
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* New Resolution Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-bold text-gray-900">
                New Resolution
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-8 space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  What do you want to achieve?
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Read more books, Lose weight, Learn guitar"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  value={newResolution.title}
                  onKeyDown={blockPlusMinus}
                  onChange={(e) =>
                    setNewResolution({
                      ...newResolution,
                      title: e.target.value,
                    })
                  }
                />
              </div>

              {/* Measurable Goal Toggle */}
              <div className="rounded-2xl border-2 border-dashed border-indigo-100 bg-indigo-50/40 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      <Hash size={16} className="text-indigo-500" />
                      Set a measurable target
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      e.g. "Read <strong>5 books</strong>" or "Lose{" "}
                      <strong>3 pounds</strong>"
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHasMeasurable(!hasMeasurable)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      hasMeasurable ? "bg-indigo-600" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                        hasMeasurable ? "left-7" : "left-1"
                      }`}
                    />
                  </button>
                </div>

                {hasMeasurable && (
                  <div className="space-y-3">
                    {/* Number + unit row */}
                    <div className="flex gap-3">
                      <div className="w-28">
                        <label className="block text-xs font-semibold text-indigo-700 mb-1">
                          How many?
                        </label>
                        <input
                          type="number"
                          min="1"
                          required={hasMeasurable}
                          placeholder="e.g. 5"
                          className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-center font-bold text-lg"
                          value={newResolution.target_number}
                          onKeyDown={blockPlusMinus}
                          onChange={(e) =>
                            setNewResolution({
                              ...newResolution,
                              target_number: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-indigo-700 mb-1">
                          Unit
                        </label>
                        <input
                          type="text"
                          required={hasMeasurable}
                          placeholder="books, pounds, km…"
                          className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          value={newResolution.target_unit}
                          onKeyDown={blockPlusMinus}
                          onChange={(e) =>
                            setNewResolution({
                              ...newResolution,
                              target_unit: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    {/* Quick-pick unit chips */}
                    <div>
                      <p className="text-xs text-indigo-600 font-semibold mb-2">
                        Quick pick:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {UNIT_PRESETS.map((unit) => (
                          <button
                            key={unit}
                            type="button"
                            onClick={() =>
                              setNewResolution({
                                ...newResolution,
                                target_unit: unit,
                              })
                            }
                            className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                              newResolution.target_unit === unit
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-white text-indigo-600 border-indigo-200 hover:border-indigo-400"
                            }`}
                          >
                            {unit}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Live preview */}
                    {newResolution.target_number &&
                      newResolution.target_unit && (
                        <div className="bg-white rounded-xl px-4 py-2.5 border border-indigo-200 text-sm text-indigo-800 font-medium">
                          🎯 Goal:{" "}
                          <strong>
                            {newResolution.target_number}{" "}
                            {newResolution.target_unit}
                          </strong>
                          {newResolution.title
                            ? ` — ${newResolution.title}`
                            : ""}
                        </div>
                      )}
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Why is this important?{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  placeholder="Tell us a bit more..."
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                  value={newResolution.description}
                  onKeyDown={blockPlusMinus}
                  onChange={(e) =>
                    setNewResolution({
                      ...newResolution,
                      description: e.target.value,
                    })
                  }
                ></textarea>
              </div>

              {/* Category + Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Category
                  </label>
                  <select
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    value={newResolution.category}
                    onChange={(e) =>
                      setNewResolution({
                        ...newResolution,
                        category: e.target.value,
                      })
                    }
                  >
                    <option value="health">Health</option>
                    <option value="career">Career</option>
                    <option value="finance">Finance</option>
                    <option value="creativity">Creativity</option>
                    <option value="relationships">Relationships</option>
                    <option value="travel">Travel</option>
                    <option value="growth">Growth</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Target Date
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    value={newResolution.target_date}
                    onChange={(e) =>
                      setNewResolution({
                        ...newResolution,
                        target_date: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {/* Public toggle */}
              <div className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  id="is_public"
                  className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  checked={newResolution.is_public}
                  onChange={(e) =>
                    setNewResolution({
                      ...newResolution,
                      is_public: e.target.checked,
                    })
                  }
                />
                <label
                  htmlFor="is_public"
                  className="text-sm font-medium text-gray-700 cursor-pointer"
                >
                  Share publicly to receive community cheers
                </label>
              </div>

              {/* Team Up */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 py-1">
                  <input
                    type="checkbox"
                    id="team_up"
                    className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    checked={teamUpEnabled}
                    onChange={(e) => {
                      setTeamUpEnabled(e.target.checked);
                      if (!e.target.checked) { setTeamUpUser(null); setTeamUpSearch(""); }
                    }}
                  />
                  <label htmlFor="team_up" className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-2">
                    <Users size={15} className="text-indigo-500" />
                    Team Up with a partner
                  </label>
                </div>

                {teamUpEnabled && (
                  <div className="ml-8">
                    {teamUpUser ? (
                      <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2 w-fit">
                        <div className="w-6 h-6 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs overflow-hidden flex-shrink-0">
                          {teamUpUser.image ? (
                            <img src={teamUpUser.image} alt={teamUpUser.name} className="w-full h-full object-cover" />
                          ) : (
                            teamUpUser.name?.[0]?.toUpperCase() || "?"
                          )}
                        </div>
                        <span className="text-sm font-semibold text-indigo-700">{teamUpUser.name || teamUpUser.email}</span>
                        <button
                          type="button"
                          onClick={() => { setTeamUpUser(null); setTeamUpSearch(""); }}
                          className="text-indigo-400 hover:text-indigo-600 transition-colors ml-1"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="relative">
                          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={teamUpSearch}
                            onChange={(e) => setTeamUpSearch(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                          />
                        </div>
                        {teamUpSearch.length >= 2 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden z-20">
                            {userSearchLoading ? (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 size={16} className="text-indigo-400 animate-spin" />
                              </div>
                            ) : userSearchResults.length === 0 ? (
                              <div className="px-4 py-3 text-sm text-gray-400">No users found</div>
                            ) : (
                              userSearchResults.map((u) => (
                                <button
                                  key={u.id}
                                  type="button"
                                  onClick={() => { setTeamUpUser(u); setTeamUpSearch(""); }}
                                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 transition-colors text-left border-t border-gray-50 first:border-t-0"
                                >
                                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm overflow-hidden flex-shrink-0">
                                    {u.image ? (
                                      <img src={u.image} alt={u.name} className="w-full h-full object-cover" />
                                    ) : (
                                      u.name?.[0]?.toUpperCase() || "?"
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-semibold text-gray-900 text-sm truncate">{u.name || "Unknown"}</div>
                                    <div className="text-xs text-gray-400 truncate">{u.email}</div>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Reminders */}
              <div className="flex items-start gap-3 py-1">
                <input
                  type="checkbox"
                  id="reminders_enabled"
                  className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-0.5 flex-shrink-0"
                  checked={remindersEnabled}
                  onChange={(e) => setRemindersEnabled(e.target.checked)}
                />
                <label htmlFor="reminders_enabled" className="text-sm font-medium text-gray-700 cursor-pointer leading-snug">
                  Receive reminders
                  <span className="block text-xs text-gray-400 font-normal mt-0.5">
                    Get notified if you haven't logged progress in 3+ days or your deadline is approaching
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={addMutation.isPending}
                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-100"
              >
                {addMutation.isPending ? "Creating..." : "Set Resolution"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 w-80">
          <p className="text-gray-800 font-semibold text-sm mb-4">{notification.msg}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setNotification(null)}
              className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            <a
              href={`/resolution/${notification.resolutionId}`}
              className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold text-center hover:bg-indigo-700 transition-colors"
            >
              Track Goal
            </a>
          </div>
        </div>
      )}

    </div>
  );
}

export default Dashboard;
