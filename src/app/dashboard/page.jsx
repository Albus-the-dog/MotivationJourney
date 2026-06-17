import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useUser from "@/utils/useUser";
import { signOut } from "@auth/create/react";
import {
  Plus,
  Target,
  Calendar,
  ChevronRight,
  TrendingUp,
  Lock,
  Globe,
  Loader2,
  PartyPopper,
  Sparkles,
  BookOpen,
  Hash,
} from "lucide-react";
import { format } from "date-fns";

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
  const [celebrationResolution, setCelebrationResolution] = useState(null);
  const [hasMeasurable, setHasMeasurable] = useState(false);
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

  // Mutation for adding resolution
  const addMutation = useMutation({
    mutationFn: async (resolution) => {
      const response = await fetch("/api/resolutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resolution),
      });
      if (!response.ok) throw new Error("Failed to create resolution");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["resolutions"] });
      setIsModalOpen(false);
      setCelebrationResolution(data);
      setNewResolution({
        title: "",
        description: "",
        category: "health",
        target_date: "",
        is_public: false,
        target_number: "",
        target_unit: "",
      });
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
    addMutation.mutate({
      ...newResolution,
      target_number: hasMeasurable ? newResolution.target_number : "",
      target_unit: hasMeasurable ? newResolution.target_unit : "",
    });
  };

  // reset measurable toggle when modal closes
  const openModal = () => {
    setHasMeasurable(false);
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
          <div className="flex items-center gap-4">
            <a
              href="/community"
              className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
            >
              Community
            </a>
            <button
              onClick={openModal}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-sm"
            >
              <Plus size={18} />
              New Resolution
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-sm font-medium text-gray-500 hover:text-red-600 transition-colors"
            >
              Sign out
            </button>
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
              You have {resolutions.length} active goals you're working on.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4 min-w-[160px]">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                <Target size={20} />
              </div>
              <div>
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                  Total
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {resolutions.length}
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4 min-w-[160px]">
              <div className="w-10 h-10 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
                <TrendingUp size={20} />
              </div>
              <div>
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                  Growth
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {resolutions.filter((r) => getPercentage(r) >= 50).length}{" "}
                  Active
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resolutions.map((res) => {
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
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Calendar size={12} />
                        {res.target_date
                          ? format(new Date(res.target_date), "MMM d, yyyy")
                          : "No deadline"}
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

      {/* Celebration Modal */}
      {celebrationResolution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl text-center">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-10">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <PartyPopper size={40} className="text-white" />
              </div>
              <h2 className="text-3xl font-extrabold text-white mb-2">
                You're Amazing! 🎉
              </h2>
              <p className="text-indigo-100 text-lg">
                "{celebrationResolution.title}"
                {celebrationResolution.target_number
                  ? ` — ${celebrationResolution.target_number} ${celebrationResolution.target_unit}`
                  : ""}{" "}
                is officially on your journey.
              </p>
            </div>
            <div className="p-8 space-y-5">
              <p className="text-gray-600 leading-relaxed">
                Setting a resolution is the first brave step. Now let's make it
                real — your personalized AI plan is waiting!
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-indigo-50 rounded-2xl p-4 text-left">
                  <Sparkles size={20} className="text-indigo-600 mb-2" />
                  <p className="text-sm font-bold text-indigo-800">
                    View Your AI Plan
                  </p>
                  <p className="text-xs text-indigo-500 mt-1">
                    Get 6 smart steps tailored to your goal
                  </p>
                </div>
                <div className="bg-purple-50 rounded-2xl p-4 text-left">
                  <BookOpen size={20} className="text-purple-600 mb-2" />
                  <p className="text-sm font-bold text-purple-800">
                    Track Progress
                  </p>
                  <p className="text-xs text-purple-500 mt-1">
                    Check off each{" "}
                    {celebrationResolution.target_unit || "milestone"} as you go
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3 pt-2">
                <a
                  href={`/resolution/${celebrationResolution.id}`}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-base hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2"
                >
                  <Sparkles size={18} />
                  View My Plan & Start Tracking
                </a>
                <button
                  onClick={() => setCelebrationResolution(null)}
                  className="w-full text-gray-400 py-2 rounded-xl text-sm hover:text-gray-600 transition-colors"
                >
                  I'll do it later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
