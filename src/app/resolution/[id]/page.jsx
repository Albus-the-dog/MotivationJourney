import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useUser from "@/utils/useUser";
import useUpload from "@/utils/useUpload";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Circle,
  Calendar,
  Globe,
  Lock,
  MessageSquare,
  Heart,
  Loader2,
  Trophy,
  AlertCircle,
  BookOpen,
  PenLine,
  ChevronDown,
  ChevronUp,
  Target,
  TrendingUp,
  Camera,
  X,
  Trash2,
  Send,
} from "lucide-react";
import { format } from "date-fns";

const MOOD_EMOJIS = ["😊", "💪", "😤", "😌", "🔥", "😰", "🎯", "❤️"];

const COMPLETION_MESSAGES = [
  "You actually did it. That's not luck — that's you. 🏆",
  "Goal crushed. Come back and revisit whenever you need a reminder of what you're capable of. 🎉",
  "100%. Not almost, not nearly — done. Be proud of this one. ✨",
  "This is what commitment looks like. You set a goal and you finished it. 🔥",
  "Not everyone finishes what they start. You did. Remember that. 💪",
  "One down. Proof that you can do hard things. What's next? 🚀",
  "You showed up every time it counted. This goal is yours forever. 🌟",
];

export default function ResolutionDetailPage({ params }) {
  const { id } = params;
  const { data: user, loading: userLoading } = useUser();
  const queryClient = useQueryClient();
  const [upload, { loading: uploading }] = useUpload();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [cheerMessage, setCheerMessage] = useState("");
  const [checkinNote, setCheckinNote] = useState("");
  const [selectedMood, setSelectedMood] = useState("");
  const [showAllCheckins, setShowAllCheckins] = useState(false);
  // Photo report state
  const [photoUrl, setPhotoUrl] = useState(null);
  const [photoPublic, setPhotoPublic] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const aiSectionRef = useRef(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualSteps, setManualSteps] = useState([{ title: "", description: "" }]);
  const [showEditSteps, setShowEditSteps] = useState(false);
  const [editSteps, setEditSteps] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [pendingNote, setPendingNote] = useState("");
  const storageKey = `ai-hint-dismissed-${id}`;
  const [showAiHint, setShowAiHint] = useState(false);
  const [showCompletionBanner, setShowCompletionBanner] = useState(false);
  const [completionMessage, setCompletionMessage] = useState("");

  const dismissAiHint = () => {
    localStorage.setItem(storageKey, "1");
    setShowAiHint(false);
  };

  const goToAi = () => {
    dismissAiHint();
    aiSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const {
    data: resolution,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["resolution", id],
    queryFn: async () => {
      const response = await fetch(`/api/resolutions/${id}`);
      if (!response.ok) throw new Error("Failed to fetch resolution");
      return response.json();
    },
    enabled: !userLoading,
  });

  const { data: checkins = [] } = useQuery({
    queryKey: ["checkins", id],
    queryFn: async () => {
      const response = await fetch(`/api/checkins?resolution_id=${id}`);
      if (!response.ok) throw new Error("Failed to fetch checkins");
      return response.json();
    },
    enabled: !!id,
  });

  const { data: boosts = [] } = useQuery({
    queryKey: ["boosts", id],
    queryFn: async () => {
      const response = await fetch(`/api/boosts?resolution_id=${id}`);
      if (!response.ok) throw new Error("Failed to fetch boosts");
      return response.json();
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (!resolution) return;
    const tSteps = resolution.steps?.length || 0;
    const cSteps = resolution.steps?.filter((s) => s.is_completed).length || 0;
    const hasTN = !!(resolution.target_number && resolution.target_number > 0);
    const tProg = parseInt(resolution.total_progress) || 0;
    const tNum = parseInt(resolution.target_number) || 0;
    const prog = hasTN
      ? Math.min(100, Math.round((tProg / tNum) * 100))
      : tSteps > 0 ? Math.round((cSteps / tSteps) * 100) : 0;

    if (prog === 100) {
      const msg = COMPLETION_MESSAGES[Math.floor(Math.random() * COMPLETION_MESSAGES.length)];
      setCompletionMessage(msg);
      setShowCompletionBanner(true);
    } else if (!localStorage.getItem(storageKey)) {
      setShowAiHint(true);
    }
  }, [storageKey, resolution?.id]);

  useEffect(() => {
    if (!resolution?.created_at) return;
    const remaining = 24 * 60 * 60 * 1000 - (Date.now() - new Date(resolution.created_at).getTime());
    if (remaining <= 0) {
      setIsWithin24Hours(false);
      return;
    }
    setIsWithin24Hours(true);
    const timer = setTimeout(() => setIsWithin24Hours(false), remaining);
    return () => clearTimeout(timer);
  }, [resolution?.created_at]);

  const toggleStepMutation = useMutation({
    mutationFn: async ({ stepId, isCompleted }) => {
      const response = await fetch(`/api/steps/${stepId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_completed: isCompleted }),
      });
      if (!response.ok) throw new Error("Failed to update step");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resolution", id] });
      queryClient.invalidateQueries({ queryKey: ["resolutions"] });
    },
  });

  const togglePrivacyMutation = useMutation({
    mutationFn: async (isPublic) => {
      const response = await fetch(`/api/resolutions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: isPublic }),
      });
      if (!response.ok) throw new Error("Failed to update privacy");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resolution", id] });
      queryClient.invalidateQueries({ queryKey: ["resolutions"] });
    },
  });

  const generateStepsMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      setGenerateError("");
      const response = await fetch(`/api/resolutions/${id}/generate-steps`, {
        method: "POST",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate steps");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resolution", id] });
      setIsGenerating(false);
    },
    onError: (err) => {
      setIsGenerating(false);
      setGenerateError(
        err.message || "AI generation failed. Please try again.",
      );
    },
  });

  const saveStepsMutation = useMutation({
    mutationFn: async (steps) => {
      const response = await fetch("/api/steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution_id: id, steps }),
      });
      if (!response.ok) throw new Error("Failed to save steps");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resolution", id] });
      setShowManualForm(false);
      setManualSteps([{ title: "", description: "" }]);
      setShowEditSteps(false);
      setEditSteps([]);
    },
    onError: () => alert("Failed to save steps. Please try again."),
  });

  const sendCheerMutation = useMutation({
    mutationFn: async (message) => {
      const response = await fetch("/api/cheers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution_id: id, message }),
      });
      if (!response.ok) throw new Error("Failed to send cheer");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resolution", id] });
      setCheerMessage("");
    },
  });

  const addCheckinMutation = useMutation({
    mutationFn: async ({
      note,
      mood_emoji,
      progress_value,
      photo_url,
      is_public,
    }) => {
      const response = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolution_id: id,
          note,
          mood_emoji,
          progress_value,
          photo_url: photo_url || null,
          is_public: is_public || false,
        }),
      });
      if (!response.ok) throw new Error("Failed to add check-in");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkins", id] });
      queryClient.invalidateQueries({ queryKey: ["resolution", id] });
      setCheckinNote("");
      setSelectedMood("");
      setPhotoUrl(null);
      setPhotoPublic(false);
      setPhotoError("");
    },
    onError: (err) => {
      alert("Failed to save progress: " + (err.message || "Unknown error"));
    },
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isWithin24Hours, setIsWithin24Hours] = useState(false);
  const [editingCheckinId, setEditingCheckinId] = useState(null);
  const [editingCheckinNote, setEditingCheckinNote] = useState("");

  const updateCheckinMutation = useMutation({
    mutationFn: async ({ checkinId, note }) => {
      const response = await fetch(`/api/checkins/${checkinId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (!response.ok) throw new Error("Failed to update note");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkins", id] });
      setEditingCheckinId(null);
      setEditingCheckinNote("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/resolutions/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete");
      }
      return response.json();
    },
    onSuccess: () => {
      window.location.href = "/dashboard";
    },
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError("");
    const result = await upload({ file });
    if (result.error) {
      setPhotoError(result.error);
      return;
    }
    setPhotoUrl(result.url);
  };

  if (isLoading || userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (error || !resolution) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 text-center">
        <div className="max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Resolution not found
          </h2>
          <p className="text-gray-500 mb-6">
            It might be private or doesn't exist.
          </p>
          <a
            href="/dashboard"
            className="text-indigo-600 font-bold hover:underline"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === resolution.user_id;
  const totalSteps = resolution.steps?.length || 0;
  const completedSteps =
    resolution.steps?.filter((s) => s.is_completed).length || 0;
  const hasTargetNumber = !!(
    resolution.target_number && resolution.target_number > 0
  );
  const totalProgress = parseInt(resolution.total_progress) || 0;
  const targetNumber = parseInt(resolution.target_number) || 0;
  const targetUnit = resolution.target_unit || "units";

  const progress = hasTargetNumber
    ? Math.min(100, Math.round((totalProgress / targetNumber) * 100))
    : totalSteps > 0
      ? Math.round((completedSteps / totalSteps) * 100)
      : 0;


  const sortedCheckins = [...checkins].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at),
  );

  // Map checkin id → which unit it represents (1-based, among progress entries sorted by date)
  const progressCheckinIds = sortedCheckins
    .filter((c) => c.progress_value > 0)
    .map((c) => c.id);
  const checkinUnitMap = Object.fromEntries(
    progressCheckinIds.map((cid, i) => [cid, i + 1])
  );
  const byDay = new Map();
  sortedCheckins
    .filter((c) => (hasTargetNumber ? c.progress_value > 0 : true))
    .forEach((c) => {
      const day = format(new Date(c.created_at), "MMM d");
      const val = hasTargetNumber ? c.progress_value || 1 : 1;
      byDay.set(day, (byDay.get(day) || 0) + val);
    });
  const chartData = Array.from(byDay.entries()).map(([date, progress]) => ({
    date,
    progress,
  }));

  const visibleCheckins = showAllCheckins ? checkins : checkins.slice(0, 3);

  const today = new Date().toDateString();
  const loggedToday = checkins.some(
    (c) =>
      new Date(c.created_at).toDateString() === today && c.progress_value > 0,
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* ── Completion Banner (fixed top, priority over AI hint) ── */}
      {showCompletionBanner && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-white px-4 py-3 flex items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-xl shrink-0">🏆</span>
            <p className="text-sm font-semibold truncate">{completionMessage}</p>
          </div>
          <button
            onClick={() => setShowCompletionBanner(false)}
            className="shrink-0 text-white/80 hover:text-white transition-colors p-1.5 hover:bg-amber-400 rounded-lg"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── AI Hint Banner (fixed top) ── */}
      {showAiHint && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-indigo-600 text-white px-4 py-3 flex items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3 min-w-0">
            <Sparkles size={18} className="flex-shrink-0" />
            <span className="text-sm font-medium truncate">
              Let AI build your 6-step action plan for this goal!
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={goToAi}
              className="bg-white text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-50 transition-all"
            >
              Take me there
            </button>
            <button
              onClick={dismissAiHint}
              className="p-1.5 hover:bg-indigo-500 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className={`bg-white border-b border-gray-100 sticky z-10 ${(showAiHint || showCompletionBanner) ? "top-12" : "top-0"}`}>
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center gap-4">
          <a
            href="/dashboard"
            className="p-2 hover:bg-gray-50 rounded-full transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </a>
          <span className="font-bold text-gray-900 line-clamp-1 flex-1">
            {resolution.title}
          </span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {/* ── HERO CARD ── */}
        <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
            <div className="flex-1">
              {/* Badges row */}
              <div className="flex items-center flex-wrap gap-3 mb-4">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold uppercase tracking-wider">
                  {resolution.category || "General"}
                </span>
                {hasTargetNumber && (
                  <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-xs font-bold flex items-center gap-1">
                    <Target size={11} />
                    Goal: {targetNumber} {targetUnit}
                  </span>
                )}
                {isOwner ? (
                  <button
                    onClick={() =>
                      togglePrivacyMutation.mutate(!resolution.is_public)
                    }
                    disabled={togglePrivacyMutation.isPending}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                      resolution.is_public
                        ? "bg-green-50 text-green-600 border-green-200 hover:bg-green-100"
                        : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {togglePrivacyMutation.isPending ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : resolution.is_public ? (
                      <Globe size={12} />
                    ) : (
                      <Lock size={12} />
                    )}
                    {resolution.is_public ? "Public" : "Private"}
                    <span className="opacity-50 text-[10px] ml-0.5">
                      · change
                    </span>
                  </button>
                ) : (
                  <div
                    className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full ${resolution.is_public ? "bg-green-50 text-green-600" : "bg-gray-50 text-gray-400"}`}
                  >
                    {resolution.is_public ? (
                      <Globe size={12} />
                    ) : (
                      <Lock size={12} />
                    )}
                    {resolution.is_public ? "Public" : "Private"}
                  </div>
                )}
              </div>

              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
                {resolution.title}
              </h1>
              <p className="text-gray-600 text-lg leading-relaxed">
                {resolution.description}
              </p>
            </div>

            {progress === 100 && (
              <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 flex flex-col items-center text-center">
                <Trophy size={40} className="text-amber-500 mb-2" />
                <span className="text-amber-800 font-bold">
                  Goal Completed!
                </span>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-gray-900">Overall Progress</span>
              <span className="font-bold text-indigo-600">
                {hasTargetNumber
                  ? `${totalProgress} / ${targetNumber} ${targetUnit} (${progress}%)`
                  : `${progress}%`}
              </span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-1000 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400 pt-2 flex-wrap">
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                Target:{" "}
                {resolution.target_date
                  ? format(new Date(resolution.target_date), "MMMM d, yyyy")
                  : "No deadline"}
              </div>
              {!hasTargetNumber && (
                <div className="flex items-center gap-1">
                  <CheckCircle2 size={14} />
                  {completedSteps} of {totalSteps} steps
                </div>
              )}
              <div className="flex items-center gap-1">
                <BookOpen size={14} />
                {checkins.length} log{checkins.length !== 1 ? "s" : ""}
              </div>
              {resolution.cheers?.length > 0 && (
                <div className="flex items-center gap-1 text-rose-400 font-semibold">
                  ❤️ {resolution.cheers.length} cheer{resolution.cheers.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          </div>

          {/* Delete button — only within 24 hours of creation */}
          {isOwner && isWithin24Hours && (
            <div className="pt-5 mt-5 border-t border-gray-100">
              {showDeleteConfirm ? (
                <div className="flex items-center gap-3">
                  <p className="text-sm text-gray-500 flex-1">Are you sure? This cannot be undone.</p>
                  <button
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                    className="flex items-center gap-1.5 bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-600 transition-all disabled:opacity-50"
                  >
                    {deleteMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    Yes, delete
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 rounded-xl text-sm font-bold border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 text-red-400 hover:text-red-600 text-sm font-semibold transition-colors"
                >
                  <Trash2 size={15} />
                  Delete this goal
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── BOOSTS ── */}
        {(boosts.length > 0 || (resolution.is_public && !isOwner)) && (
          <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Send size={20} className="text-indigo-500" />
              Boosts
              {boosts.length > 0 && (
                <span className="ml-1 text-sm font-semibold text-indigo-400 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                  {boosts.length}
                </span>
              )}
            </h2>

            {boosts.length === 0 ? (
              <div className="text-center py-8 rounded-2xl bg-gray-50 border border-dashed border-gray-200">
                <Send size={28} className="text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No boosts yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {boosts.map((boost) => (
                  <div
                    key={boost.id}
                    className="flex gap-3 p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100"
                  >
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm border-2 border-white shadow-sm flex-shrink-0 overflow-hidden">
                      {boost.from_user_image ? (
                        <img src={boost.from_user_image} alt={boost.from_user_name} className="w-full h-full object-cover" />
                      ) : (
                        boost.from_user_name?.[0]?.toUpperCase() || "?"
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-900 text-sm">
                          {boost.from_user_name || "Someone"}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {format(new Date(boost.created_at), "MMM d")}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {boost.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MY PROGRESS SECTION ── */}
        {isOwner && (
          <div>
            {/* Section header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center">
                  <TrendingUp size={20} className="text-white" />
                </div>
                <h2 className="text-2xl font-extrabold text-gray-900">
                  My Progress
                </h2>
              </div>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div className="space-y-6">
              {/* ── Mark Your Progress (checkbox grid for target-number goals) ── */}
              {hasTargetNumber && (
                <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Target size={20} className="text-purple-600" />
                      Mark Your Progress
                    </h3>
                    <span className="text-sm font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                      {totalProgress} / {targetNumber} {targetUnit}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm mb-6">
                    Tap each {targetUnit.replace(/s$/, "")} as you complete it.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {Array.from({ length: targetNumber }).map((_, i) => {
                      const unitNum = i + 1;
                      const isDone = unitNum <= totalProgress;
                      const isPending = selectedUnit === unitNum;
                      return (
                        <button
                          key={i}
                          disabled={isDone || addCheckinMutation.isPending}
                          onClick={() => {
                            if (isDone) return;
                            setSelectedUnit(isPending ? null : unitNum);
                            setPendingNote("");
                          }}
                          className={`flex flex-col items-center gap-1 px-4 py-3 rounded-2xl border-2 transition-all font-bold text-sm ${
                            isDone
                              ? "border-purple-200 bg-purple-50 text-purple-600 cursor-default"
                              : isPending
                                ? "border-purple-500 bg-purple-50 text-purple-600"
                                : "border-gray-200 bg-white text-gray-400 hover:border-purple-300 hover:text-purple-500 hover:bg-purple-50"
                          }`}
                        >
                          {isDone ? (
                            <CheckCircle2 size={28} className="text-purple-500" />
                          ) : isPending ? (
                            <CheckCircle2 size={28} className="text-purple-400" />
                          ) : (
                            <Circle size={28} />
                          )}
                          <span className="text-xs">
                            {targetUnit.replace(/s$/, "")} {unitNum}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Inline note for selected box */}
                  {selectedUnit !== null && (
                    <div className="mt-5 p-4 bg-purple-50 rounded-2xl border border-purple-100 space-y-3">
                      <p className="text-sm font-semibold text-purple-700">
                        {targetUnit.replace(/s$/, "")} {selectedUnit} — add a note (optional)
                      </p>
                      <div className="flex gap-2">
                        <input
                          autoFocus
                          type="text"
                          placeholder="How did it go? Any thoughts..."
                          className="flex-1 rounded-xl border border-purple-200 bg-white px-4 py-2.5 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 text-sm"
                          value={pendingNote}
                          onChange={(e) => setPendingNote(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              addCheckinMutation.mutate({
                                note: pendingNote,
                                mood_emoji: "✅",
                                progress_value: 1,
                              });
                              setSelectedUnit(null);
                              setPendingNote("");
                            }
                            if (e.key === "Escape") {
                              setSelectedUnit(null);
                              setPendingNote("");
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            addCheckinMutation.mutate({
                              note: pendingNote,
                              mood_emoji: "✅",
                              progress_value: 1,
                            });
                            setSelectedUnit(null);
                            setPendingNote("");
                          }}
                          disabled={addCheckinMutation.isPending}
                          className="bg-purple-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-purple-700 transition-all disabled:opacity-50"
                        >
                          {addCheckinMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : "Save"}
                        </button>
                        <button
                          onClick={() => { setSelectedUnit(null); setPendingNote(""); }}
                          className="px-3 py-2.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all text-sm"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                  {totalProgress > 0 && (
                    <p className="text-sm text-purple-600 font-bold mt-5">
                      🎯 {totalProgress} of {targetNumber} {targetUnit} done!
                      {totalProgress >= targetNumber ? " 🎉 Goal achieved!" : ""}
                    </p>
                  )}
                </div>
              )}

              {/* ── Log Today (for non-target-number goals) ── */}
              {!hasTargetNumber && (
                <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                    <PenLine size={20} className="text-purple-600" />
                    Log Today's Progress
                  </h3>
                  <div className="space-y-4">
                    <button
                      onClick={() =>
                        !loggedToday &&
                        addCheckinMutation.mutate({
                          note: checkinNote || "",
                          mood_emoji: selectedMood || "",
                          progress_value: 1,
                          photo_url: photoUrl,
                          is_public: photoPublic,
                        })
                      }
                      disabled={loggedToday || addCheckinMutation.isPending}
                      className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl border-2 transition-all font-bold text-base ${
                        loggedToday
                          ? "border-green-300 bg-green-50 text-green-700 cursor-default"
                          : "border-purple-300 bg-white text-purple-700 hover:bg-purple-50 hover:border-purple-400"
                      }`}
                    >
                      {loggedToday ? (
                        <CheckCircle2
                          size={32}
                          className="text-green-500 flex-shrink-0"
                        />
                      ) : addCheckinMutation.isPending ? (
                        <Loader2
                          size={32}
                          className="text-purple-400 flex-shrink-0 animate-spin"
                        />
                      ) : (
                        <Circle
                          size={32}
                          className="text-purple-300 flex-shrink-0"
                        />
                      )}
                      <div className="text-left">
                        <div className="font-bold">
                          {loggedToday
                            ? "Progress logged today! ✓"
                            : "Mark progress for today"}
                        </div>
                        <div className="text-xs font-normal opacity-70 mt-0.5">
                          {loggedToday
                            ? "Come back tomorrow to keep your streak going"
                            : "Click to record that you worked on this goal today"}
                        </div>
                      </div>
                    </button>

                    {!loggedToday && (
                      <>
                        <textarea
                          rows={2}
                          placeholder="Add a note about today's progress (optional)..."
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 resize-none text-sm text-gray-700 placeholder-gray-400"
                          value={checkinNote}
                          onChange={(e) => setCheckinNote(e.target.value)}
                        />
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                            How are you feeling?
                          </label>
                          <div className="flex gap-2 flex-wrap">
                            {MOOD_EMOJIS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() =>
                                  setSelectedMood(
                                    selectedMood === emoji ? "" : emoji,
                                  )
                                }
                                className={`text-2xl w-11 h-11 rounded-xl flex items-center justify-center transition-all border-2 ${
                                  selectedMood === emoji
                                    ? "border-purple-400 bg-purple-50 shadow-md"
                                    : "border-transparent bg-gray-50 hover:bg-gray-100"
                                }`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Photo Report Upload */}
                        <div className="border-t border-gray-100 pt-4">
                          <label className="block text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider flex items-center gap-2">
                            <Camera size={14} /> Photo Report (optional)
                          </label>
                          {photoUrl ? (
                            <div className="relative rounded-xl overflow-hidden border border-gray-200 mb-3">
                              <img
                                src={photoUrl}
                                alt="Progress"
                                className="w-full max-h-48 object-cover"
                              />
                              <button
                                onClick={() => setPhotoUrl(null)}
                                className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-purple-300 hover:bg-purple-50 transition-all">
                              {uploading ? (
                                <Loader2
                                  size={18}
                                  className="text-gray-400 animate-spin"
                                />
                              ) : (
                                <Camera size={18} className="text-gray-400" />
                              )}
                              <span className="text-sm text-gray-500 font-medium">
                                {uploading
                                  ? "Uploading..."
                                  : "Upload a progress photo"}
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                className="hidden"
                                disabled={uploading}
                              />
                            </label>
                          )}
                          {photoError && (
                            <p className="text-red-500 text-xs mt-1">
                              {photoError}
                            </p>
                          )}
                          {photoUrl && (
                            <div className="flex items-center justify-between mt-3">
                              <span className="text-xs text-gray-500 font-medium">
                                Share this photo publicly?
                              </span>
                              <button
                                type="button"
                                onClick={() => setPhotoPublic(!photoPublic)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${
                                  photoPublic
                                    ? "border-green-400 bg-green-50 text-green-700"
                                    : "border-gray-200 bg-gray-50 text-gray-500"
                                }`}
                              >
                                {photoPublic ? (
                                  <Globe size={12} />
                                ) : (
                                  <Lock size={12} />
                                )}
                                {photoPublic ? "Public" : "Private"}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Log button with photo */}
                        {(checkinNote.trim() || selectedMood || photoUrl) && (
                          <button
                            onClick={() =>
                              addCheckinMutation.mutate({
                                note: checkinNote || "",
                                mood_emoji: selectedMood || "",
                                progress_value: 0,
                                photo_url: photoUrl,
                                is_public: photoPublic,
                              })
                            }
                            disabled={addCheckinMutation.isPending}
                            className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                          >
                            {addCheckinMutation.isPending ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <BookOpen size={16} />
                            )}
                            Save to Log
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ── AI Action Plan ── */}
              <div ref={aiSectionRef} className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Sparkles size={20} className="text-indigo-600" />
                    AI Action Plan
                  </h3>
                  {totalSteps === 0 && (
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowManualForm((v) => !v)}
                          className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-50 transition-all"
                        >
                          <PenLine size={15} />
                          Create My Own
                        </button>
                        <button
                          onClick={() => generateStepsMutation.mutate()}
                          disabled={isGenerating}
                          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-50"
                        >
                          {isGenerating ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <Sparkles size={15} />
                          )}
                          {isGenerating ? "Generating..." : "Generate Steps"}
                        </button>
                      </div>
                      {generateError && (
                        <p className="text-xs text-red-500 font-medium">
                          {generateError}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Manual step creation form */}
                {showManualForm && totalSteps === 0 && (
                  <div className="mb-6 space-y-3">
                    {manualSteps.map((step, i) => (
                      <div key={i} className="rounded-2xl border border-gray-200 p-4 space-y-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {i + 1}
                          </span>
                          <input
                            type="text"
                            placeholder={`Step ${i + 1} title`}
                            value={step.title}
                            onChange={(e) => {
                              const updated = [...manualSteps];
                              updated[i] = { ...updated[i], title: e.target.value };
                              setManualSteps(updated);
                            }}
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                          />
                          {manualSteps.length > 1 && (
                            <button
                              onClick={() => setManualSteps(manualSteps.filter((_, idx) => idx !== i))}
                              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                        <textarea
                          rows={2}
                          placeholder="Description (optional)"
                          value={step.description}
                          onChange={(e) => {
                            const updated = [...manualSteps];
                            updated[i] = { ...updated[i], description: e.target.value };
                            setManualSteps(updated);
                          }}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 resize-none"
                        />
                      </div>
                    ))}
                    <button
                      onClick={() => setManualSteps([...manualSteps, { title: "", description: "" }])}
                      className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-3 text-sm font-bold text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-all"
                    >
                      + Add Step
                    </button>
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={() => saveStepsMutation.mutate(manualSteps.filter((s) => s.title.trim()))}
                        disabled={saveStepsMutation.isPending || manualSteps.every((s) => !s.title.trim())}
                        className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        {saveStepsMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                        Save Steps
                      </button>
                      <button
                        onClick={() => { setShowManualForm(false); setManualSteps([{ title: "", description: "" }]); }}
                        className="text-gray-500 text-sm font-medium hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {totalSteps === 0 && !showManualForm ? (
                  <div className="bg-indigo-50/50 border-2 border-dashed border-indigo-100 rounded-2xl p-10 text-center">
                    <Sparkles
                      size={36}
                      className="text-indigo-300 mx-auto mb-3"
                    />
                    <h4 className="text-base font-bold text-gray-900 mb-1">
                      No plan yet
                    </h4>
                    <p className="text-gray-500 text-sm">
                      Generate AI steps or create your own above.
                    </p>
                  </div>
                ) : totalSteps > 0 ? (
                  <div className="space-y-4">
                    {resolution.steps.map((step, index) => (
                      <div
                        key={step.id}
                        className={`rounded-2xl p-5 border transition-all duration-300 ${
                          step.is_completed
                            ? "border-green-100 bg-green-50/40 opacity-75"
                            : "border-gray-200 bg-white hover:shadow-sm"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <button
                            onClick={() =>
                              toggleStepMutation.mutate({
                                stepId: step.id,
                                isCompleted: !step.is_completed,
                              })
                            }
                            disabled={toggleStepMutation.isPending}
                            className={`flex-shrink-0 mt-0.5 transition-colors ${
                              step.is_completed
                                ? "text-green-500"
                                : "text-gray-200 hover:text-indigo-400"
                            }`}
                          >
                            {step.is_completed ? (
                              <CheckCircle2 size={28} />
                            ) : (
                              <Circle size={28} />
                            )}
                          </button>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                Step {index + 1}
                              </span>
                              {step.is_completed && (
                                <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-bold uppercase">
                                  Done
                                </span>
                              )}
                            </div>
                            <h4
                              className={`text-base font-bold mb-1 ${step.is_completed ? "text-gray-400 line-through" : "text-gray-900"}`}
                            >
                              {step.title}
                            </h4>
                            <p className="text-gray-500 text-sm leading-relaxed">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Edit steps form */}
                    {showEditSteps ? (
                      <div className="pt-2 space-y-3">
                        {editSteps.map((step, i) => (
                          <div key={i} className="rounded-2xl border border-indigo-200 bg-indigo-50/30 p-4 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                                {i + 1}
                              </span>
                              <input
                                type="text"
                                value={step.title}
                                onChange={(e) => {
                                  const updated = [...editSteps];
                                  updated[i] = { ...updated[i], title: e.target.value };
                                  setEditSteps(updated);
                                }}
                                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 bg-white"
                              />
                              {editSteps.length > 1 && (
                                <button
                                  onClick={() => setEditSteps(editSteps.filter((_, idx) => idx !== i))}
                                  className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                            <textarea
                              rows={2}
                              value={step.description}
                              onChange={(e) => {
                                const updated = [...editSteps];
                                updated[i] = { ...updated[i], description: e.target.value };
                                setEditSteps(updated);
                              }}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 resize-none bg-white"
                            />
                          </div>
                        ))}
                        <button
                          onClick={() => setEditSteps([...editSteps, { title: "", description: "" }])}
                          className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-3 text-sm font-bold text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-all"
                        >
                          + Add Step
                        </button>
                        <div className="flex items-center gap-3 pt-1">
                          <button
                            onClick={() => saveStepsMutation.mutate(editSteps.filter((s) => s.title.trim()))}
                            disabled={saveStepsMutation.isPending || editSteps.every((s) => !s.title.trim())}
                            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2"
                          >
                            {saveStepsMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                            Save Changes
                          </button>
                          <button
                            onClick={() => setShowEditSteps(false)}
                            className="text-gray-500 text-sm font-medium hover:text-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditSteps(resolution.steps.map((s) => ({ title: s.title, description: s.description || "" })));
                          setShowEditSteps(true);
                        }}
                        className="w-full text-gray-400 text-xs font-bold py-2 hover:text-indigo-500 transition-colors flex items-center justify-center gap-1.5 border border-dashed border-gray-200 rounded-xl hover:border-indigo-300"
                      >
                        <PenLine size={13} />
                        Edit Steps
                      </button>
                    )}
                  </div>
                ) : null}
              </div>

              {/* ── Progress Chart & Log ── */}
              <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <BookOpen size={20} className="text-purple-600" />
                  Progress Log
                </h3>

                {/* Chart */}
                {chartData.length > 0 ? (
                  <div className="mb-8">
                    <p className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                      {hasTargetNumber
                        ? `Per Entry (Goal: ${targetNumber} ${targetUnit})`
                        : "Each Log Entry"}
                    </p>
                    <div style={{ height: 200 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={chartData}
                          margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#f0f0f0"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11, fill: "#9ca3af" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: "#9ca3af" }}
                            axisLine={false}
                            tickLine={false}
                            allowDecimals={false}
                            width={30}
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: 12,
                              border: "1px solid #e5e7eb",
                              fontSize: 13,
                            }}
                            formatter={(v) => [
                              v,
                              hasTargetNumber ? targetUnit : "logged",
                            ]}
                          />
                          {hasTargetNumber && (
                            <ReferenceLine
                              y={targetNumber}
                              stroke="#7c3aed"
                              strokeDasharray="4 4"
                              label={{
                                value: `Target: ${targetNumber}`,
                                fill: "#7c3aed",
                                fontSize: 11,
                                position: "insideTopRight",
                              }}
                            />
                          )}
                          <Line
                            type="monotone"
                            dataKey="progress"
                            stroke="#7c3aed"
                            strokeWidth={2.5}
                            dot={{ fill: "#7c3aed", r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <div className="mb-8 rounded-2xl border-2 border-dashed border-purple-100 bg-purple-50/40 p-8 text-center">
                    <Target
                      size={24}
                      className="text-purple-300 mx-auto mb-2"
                    />
                    <p className="text-sm font-bold text-gray-500">
                      Your progress chart will appear here
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Start logging to see your journey take shape
                    </p>
                  </div>
                )}

                {/* Log entries */}
                {checkins.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen
                      size={28}
                      className="text-gray-200 mx-auto mb-2"
                    />
                    <p className="text-gray-400 text-sm">
                      {hasTargetNumber
                        ? `Check off your ${targetUnit} above to start tracking!`
                        : "No log entries yet. Start tracking your journey!"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                      {checkins.length} Entr
                      {checkins.length !== 1 ? "ies" : "y"}
                    </p>
                    {visibleCheckins.map((checkin, idx) => (
                      <div
                        key={checkin.id}
                        className="flex gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100"
                      >
                        <div className="flex-shrink-0 flex flex-col items-center">
                          {checkin.mood_emoji && checkin.mood_emoji !== "✅" ? (
                            <span className="text-2xl">
                              {checkin.mood_emoji}
                            </span>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                              <CheckCircle2
                                size={16}
                                className="text-purple-500"
                              />
                            </div>
                          )}
                          {idx < visibleCheckins.length - 1 && (
                            <div className="w-px flex-1 bg-gray-200 mt-2 min-h-[16px]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* Header row: timestamp + completion label */}
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-bold text-gray-400">
                              {format(new Date(checkin.created_at), "MMM d, yyyy · h:mm a")}
                            </span>
                            {checkin.progress_value > 0 && hasTargetNumber && checkinUnitMap[checkin.id] && (
                              <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-bold">
                                ✅ {targetUnit.replace(/s$/, "")} {checkinUnitMap[checkin.id]} of {targetNumber}
                              </span>
                            )}
                            {checkin.progress_value > 0 && !hasTargetNumber && (
                              <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-bold">
                                +1 logged
                              </span>
                            )}
                          </div>

                          {/* Note row — editable, always shown for progress entries */}
                          {isOwner && (checkin.progress_value > 0 ? hasTargetNumber : true) && (
                            editingCheckinId === checkin.id ? (
                              <div className="mt-1.5 flex gap-2">
                                <input
                                  autoFocus
                                  type="text"
                                  value={editingCheckinNote}
                                  placeholder="Add a note..."
                                  onChange={(e) => setEditingCheckinNote(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") updateCheckinMutation.mutate({ checkinId: checkin.id, note: editingCheckinNote });
                                    if (e.key === "Escape") { setEditingCheckinId(null); setEditingCheckinNote(""); }
                                  }}
                                  className="flex-1 rounded-lg border border-purple-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                                />
                                <button
                                  onClick={() => updateCheckinMutation.mutate({ checkinId: checkin.id, note: editingCheckinNote })}
                                  disabled={updateCheckinMutation.isPending}
                                  className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-purple-700 transition-all disabled:opacity-50"
                                >
                                  {updateCheckinMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : "Save"}
                                </button>
                                <button
                                  onClick={() => { setEditingCheckinId(null); setEditingCheckinNote(""); }}
                                  className="text-gray-400 hover:text-gray-600 px-2 rounded-lg hover:bg-gray-100 transition-all"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <div
                                className="mt-1 flex items-center gap-1.5 group/note cursor-pointer"
                                onClick={() => { setEditingCheckinId(checkin.id); setEditingCheckinNote(checkin.note || ""); }}
                              >
                                {checkin.note ? (
                                  <p className="text-gray-700 text-sm leading-relaxed">{checkin.note}</p>
                                ) : (
                                  <p className="text-gray-300 text-sm italic">Add a note...</p>
                                )}
                                <PenLine size={12} className="text-gray-200 group-hover/note:text-purple-400 transition-colors flex-shrink-0" />
                              </div>
                            )
                          )}
                          {/* Non-owner: just show the note */}
                          {!isOwner && checkin.note && (
                            <p className="text-gray-700 text-sm leading-relaxed mt-1">{checkin.note}</p>
                          )}
                          {checkin.photo_url && (
                            <div className="mt-2 rounded-xl overflow-hidden border border-gray-200">
                              <img
                                src={checkin.photo_url}
                                alt="Progress report"
                                className="w-full max-h-48 object-cover"
                              />
                              {checkin.is_public && (
                                <div className="px-3 py-1.5 bg-green-50 border-t border-green-100 flex items-center gap-1">
                                  <Globe size={11} className="text-green-500" />
                                  <span className="text-[10px] text-green-600 font-bold">
                                    Shared to community
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {checkins.length > 3 && (
                      <button
                        onClick={() => setShowAllCheckins(!showAllCheckins)}
                        className="w-full text-purple-600 text-sm font-bold py-2 hover:text-purple-700 transition-colors flex items-center justify-center gap-1"
                      >
                        {showAllCheckins ? (
                          <>
                            <ChevronUp size={16} /> Show less
                          </>
                        ) : (
                          <>
                            <ChevronDown size={16} /> Show all {checkins.length}{" "}
                            entries
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
