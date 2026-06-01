import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useUser from "@/utils/useUser";
import useUpload from "@/utils/useUpload";
import {
  AreaChart,
  Area,
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
} from "lucide-react";
import { format } from "date-fns";

const MOOD_EMOJIS = ["😊", "💪", "😤", "😌", "🔥", "😰", "🎯", "❤️"];

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
  let cumulative = 0;
  const chartData = sortedCheckins
    .filter((c) => (hasTargetNumber ? c.progress_value > 0 : true))
    .map((c) => {
      cumulative += hasTargetNumber ? c.progress_value || 1 : 1;
      return {
        date: format(new Date(c.created_at), "MMM d"),
        progress: cumulative,
        fullDate: format(new Date(c.created_at), "MMM d, yyyy"),
      };
    });

  const visibleCheckins = showAllCheckins ? checkins : checkins.slice(0, 3);

  const today = new Date().toDateString();
  const loggedToday = checkins.some(
    (c) =>
      new Date(c.created_at).toDateString() === today && c.progress_value > 0,
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10">
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
                {resolution.description || "No description provided."}
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
            </div>
          </div>
        </div>

        {/* ── COMMUNITY CHEERS (right under hero) ── */}
        {resolution.is_public && (
          <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Heart size={22} className="text-rose-500" />
              Community Cheers
              {resolution.cheers?.length > 0 && (
                <span className="ml-1 text-sm font-semibold text-rose-400 bg-rose-50 px-2.5 py-0.5 rounded-full">
                  {resolution.cheers.length}
                </span>
              )}
            </h2>

            {/* Cheer list */}
            <div className="space-y-4 mb-6">
              {!resolution.cheers || resolution.cheers.length === 0 ? (
                <div className="text-center py-8 rounded-2xl bg-gray-50 border border-dashed border-gray-200">
                  <MessageSquare
                    size={28}
                    className="text-gray-300 mx-auto mb-2"
                  />
                  <p className="text-gray-400 text-sm">
                    No cheers yet. Be the first to encourage!
                  </p>
                </div>
              ) : (
                resolution.cheers.map((cheer) => (
                  <div
                    key={cheer.id}
                    className="flex gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100"
                  >
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm border-2 border-white shadow-sm flex-shrink-0 overflow-hidden">
                      {cheer.from_user_image ? (
                        <img
                          src={cheer.from_user_image}
                          alt={cheer.from_user_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        cheer.from_user_name?.[0]?.toUpperCase() || "?"
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-900 text-sm">
                          {cheer.from_user_name}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {format(new Date(cheer.created_at), "MMM d")}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {cheer.message}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Send cheer input */}
            {user && (
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm flex-shrink-0">
                  {user.name?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    placeholder="Send some encouragement..."
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 text-sm"
                    value={cheerMessage}
                    onChange={(e) => setCheerMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && cheerMessage.trim()) {
                        sendCheerMutation.mutate(cheerMessage);
                      }
                    }}
                  />
                  <button
                    onClick={() => sendCheerMutation.mutate(cheerMessage)}
                    disabled={
                      !cheerMessage.trim() || sendCheerMutation.isPending
                    }
                    className="bg-rose-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-rose-600 transition-all disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {sendCheerMutation.isPending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Heart size={14} />
                    )}
                    Cheer
                  </button>
                </div>
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
                      return (
                        <button
                          key={i}
                          disabled={isDone || addCheckinMutation.isPending}
                          onClick={() =>
                            addCheckinMutation.mutate({
                              note: `Completed ${targetUnit.replace(/s$/, "")} ${unitNum} of ${targetNumber}`,
                              mood_emoji: "✅",
                              progress_value: 1,
                            })
                          }
                          className={`flex flex-col items-center gap-1 px-4 py-3 rounded-2xl border-2 transition-all font-bold text-sm ${
                            isDone
                              ? "border-purple-200 bg-purple-50 text-purple-600 cursor-default"
                              : "border-gray-200 bg-white text-gray-400 hover:border-purple-300 hover:text-purple-500 hover:bg-purple-50"
                          }`}
                        >
                          {isDone ? (
                            <CheckCircle2
                              size={28}
                              className="text-purple-500"
                            />
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
                  {totalProgress > 0 && (
                    <p className="text-sm text-purple-600 font-bold mt-5">
                      🎯 {totalProgress} of {targetNumber} {targetUnit} done!
                      {totalProgress >= targetNumber
                        ? " 🎉 Goal achieved!"
                        : ""}
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

              {/* ── Notes for target-number goals ── */}
              {hasTargetNumber && (
                <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <PenLine size={20} className="text-purple-600" />
                    Add a Note
                  </h3>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="How did it go? Any thoughts..."
                      className="flex-1 rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 text-sm"
                      value={checkinNote}
                      onChange={(e) => setCheckinNote(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && checkinNote.trim()) {
                          addCheckinMutation.mutate({
                            note: checkinNote,
                            mood_emoji: "",
                            progress_value: 0,
                          });
                        }
                      }}
                    />
                    <button
                      onClick={() =>
                        addCheckinMutation.mutate({
                          note: checkinNote,
                          mood_emoji: "",
                          progress_value: 0,
                        })
                      }
                      disabled={
                        addCheckinMutation.isPending || !checkinNote.trim()
                      }
                      className="bg-purple-600 text-white px-5 py-3 rounded-xl font-bold text-sm hover:bg-purple-700 transition-all disabled:opacity-50"
                    >
                      {addCheckinMutation.isPending ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        "Add"
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* ── AI Action Plan ── */}
              <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Sparkles size={20} className="text-indigo-600" />
                    AI Action Plan
                  </h3>
                  {totalSteps === 0 && (
                    <div className="flex flex-col items-end gap-1.5">
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
                      {generateError && (
                        <p className="text-xs text-red-500 font-medium">
                          {generateError}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {totalSteps === 0 ? (
                  <div className="bg-indigo-50/50 border-2 border-dashed border-indigo-100 rounded-2xl p-10 text-center">
                    <Sparkles
                      size={36}
                      className="text-indigo-300 mx-auto mb-3"
                    />
                    <h4 className="text-base font-bold text-gray-900 mb-1">
                      No plan yet
                    </h4>
                    <p className="text-gray-500 text-sm">
                      Click "Generate Steps" above for a tailored 6-step AI
                      action plan.
                    </p>
                  </div>
                ) : (
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
                  </div>
                )}
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
                        ? `Cumulative (Goal: ${targetNumber} ${targetUnit})`
                        : "Days You Made Progress"}
                    </p>
                    <div style={{ height: 200 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={chartData}
                          margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient
                              id="progressGrad"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#7c3aed"
                                stopOpacity={0.18}
                              />
                              <stop
                                offset="95%"
                                stopColor="#7c3aed"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#f0f0f0"
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
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: 12,
                              border: "1px solid #e5e7eb",
                              fontSize: 13,
                            }}
                            formatter={(v) => [
                              v,
                              hasTargetNumber ? targetUnit : "days logged",
                            ]}
                            labelFormatter={(label, payload) =>
                              payload?.[0]?.payload?.fullDate || label
                            }
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
                          <Area
                            type="monotone"
                            dataKey="progress"
                            stroke="#7c3aed"
                            strokeWidth={2.5}
                            fill="url(#progressGrad)"
                            dot={{ fill: "#7c3aed", r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </AreaChart>
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
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-bold text-gray-400">
                              {format(
                                new Date(checkin.created_at),
                                "MMM d, yyyy · h:mm a",
                              )}
                            </span>
                            {checkin.progress_value > 0 && hasTargetNumber && (
                              <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-bold">
                                +{checkin.progress_value}{" "}
                                {targetUnit.replace(/s$/, "")}
                              </span>
                            )}
                          </div>
                          {checkin.note && (
                            <p className="text-gray-700 text-sm leading-relaxed">
                              {checkin.note}
                            </p>
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
