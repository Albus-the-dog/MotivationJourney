"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useUser from "@/utils/useUser";
import {
  Users,
  Target,
  MessageSquare,
  Heart,
  TrendingUp,
  Loader2,
  Globe,
  ArrowUpRight,
  UserPlus,
  Lock,
  X,
  Send,
  Camera,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format } from "date-fns";

function AvatarBubble({ name, image, avatar, size = 10 }) {
  const sizeClass = `w-${size} h-${size}`;
  if (avatar) {
    return (
      <div
        className={`${sizeClass} rounded-full bg-green-50 flex items-center justify-center text-lg border-2 border-white shadow-sm`}
      >
        {avatar}
      </div>
    );
  }
  if (image) {
    return (
      <div
        className={`${sizeClass} rounded-full overflow-hidden border-2 border-white shadow-sm`}
      >
        <img src={image} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div
      className={`${sizeClass} rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold border-2 border-white shadow-sm`}
    >
      {name?.[0] || "?"}
    </div>
  );
}

function PhotoCard({ photo, user }) {
  const [expanded, setExpanded] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading: loadingComments } = useQuery({
    queryKey: ["checkin-comments", photo.id],
    queryFn: async () => {
      const res = await fetch(`/api/checkin-comments?checkin_id=${photo.id}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: showComments,
  });

  const commentMutation = useMutation({
    mutationFn: async (comment) => {
      const res = await fetch("/api/checkin-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkin_id: photo.id, comment }),
      });
      if (!res.ok) throw new Error("Failed to post comment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["checkin-comments", photo.id],
      });
      queryClient.invalidateQueries({ queryKey: ["photo-feed"] });
      setCommentText("");
    },
  });

  return (
    <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* User + resolution info */}
      <div className="p-6 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <AvatarBubble
            name={photo.user_name}
            image={photo.user_image}
            avatar={photo.user_avatar}
          />
          <div>
            <div className="font-bold text-gray-900 text-sm">
              {photo.user_name}
            </div>
            <div className="text-xs text-gray-400">
              {photo.category && (
                <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase mr-2">
                  {photo.category}
                </span>
              )}
              {format(new Date(photo.created_at), "MMM d, yyyy")}
            </div>
          </div>
          {photo.mood_emoji && (
            <span className="ml-auto text-2xl">{photo.mood_emoji}</span>
          )}
        </div>
        <a
          href={`/resolution/${photo.resolution_id}`}
          className="text-base font-bold text-gray-900 hover:text-indigo-600 transition-colors line-clamp-1"
        >
          {photo.resolution_title}
        </a>
        {photo.note && (
          <p className="text-gray-500 text-sm mt-1 leading-relaxed">
            {photo.note}
          </p>
        )}
      </div>

      {/* Photo */}
      <div className="relative">
        <img
          src={photo.photo_url}
          alt="Progress photo"
          className={`w-full object-cover transition-all duration-300 ${expanded ? "max-h-[600px]" : "max-h-64"} cursor-pointer`}
          onClick={() => setExpanded(!expanded)}
        />
        {!expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="absolute bottom-2 right-2 bg-black/40 text-white text-xs px-2 py-1 rounded-lg backdrop-blur-sm"
          >
            Expand
          </button>
        )}
      </div>

      {/* Footer: cheers count + comment toggle */}
      <div className="px-6 py-4 flex items-center justify-between border-t border-gray-50">
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors"
        >
          <MessageSquare size={18} />
          <span className="text-sm font-bold">
            {parseInt(photo.comment_count) || 0} Comments
          </span>
          {showComments ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <a
          href={`/resolution/${photo.resolution_id}`}
          className="text-indigo-600 font-bold text-sm flex items-center gap-1 hover:underline"
        >
          View goal <ArrowUpRight size={14} />
        </a>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="px-6 pb-6 space-y-3 border-t border-gray-50 pt-4">
          {loadingComments && (
            <Loader2 size={16} className="text-gray-400 animate-spin mx-auto" />
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <AvatarBubble
                name={c.user_name}
                image={c.user_image}
                avatar={c.user_avatar}
                size={8}
              />
              <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-bold text-xs text-gray-900">
                    {c.user_name}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {format(new Date(c.created_at), "MMM d")}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{c.comment}</p>
              </div>
            </div>
          ))}
          {comments.length === 0 && !loadingComments && (
            <p className="text-xs text-gray-400 text-center py-2">
              No comments yet. Be the first!
            </p>
          )}
          {user && (
            <div className="flex gap-2 pt-1">
              <AvatarBubble
                name={user.name}
                image={user.image}
                avatar={user.avatar}
                size={8}
              />
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  placeholder="Leave a cheer..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && commentText.trim())
                      commentMutation.mutate(commentText);
                  }}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
                />
                <button
                  onClick={() =>
                    commentText.trim() && commentMutation.mutate(commentText)
                  }
                  disabled={!commentText.trim() || commentMutation.isPending}
                  className="bg-indigo-600 text-white px-3 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all"
                >
                  {commentMutation.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TeamUpModal({ resolution, onClose, user }) {
  const queryClient = useQueryClient();
  const [teamName, setTeamName] = useState(`${resolution.title} Squad`);
  const [teamDesc, setTeamDesc] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [view, setView] = useState("create"); // "create" or "browse"

  const { data: existingTeams = [], isLoading: loadingTeams } = useQuery({
    queryKey: ["teams", resolution.category],
    queryFn: async () => {
      const res = await fetch(
        `/api/teams?category=${encodeURIComponent(resolution.category || "")}`,
      );
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: teamName,
          description: teamDesc,
          goal_category: resolution.category,
          goal_title: resolution.title,
          is_public: isPublic,
        }),
      });
      if (!res.ok) throw new Error("Failed to create team");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      onClose();
    },
  });

  const joinMutation = useMutation({
    mutationFn: async (teamId) => {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join" }),
      });
      if (!res.ok) throw new Error("Failed to join team");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Team Up 🤝</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Work toward this goal together
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl"
          >
            <X size={20} />
          </button>
        </div>

        {/* Goal badge */}
        <div className="px-6 pt-4">
          <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
              {resolution.category || "Goal"}
            </p>
            <p className="font-bold text-indigo-900">{resolution.title}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mx-6 mt-4 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setView("create")}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${view === "create" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
          >
            Create Team
          </button>
          <button
            onClick={() => setView("browse")}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${view === "browse" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
          >
            Browse Teams ({existingTeams.length})
          </button>
        </div>

        {view === "create" && (
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Team Name
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-400 text-sm"
                placeholder="Team name"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                rows={2}
                value={teamDesc}
                onChange={(e) => setTeamDesc(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-400 resize-none text-sm"
                placeholder="What's the team about?"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Visibility
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsPublic(true)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${isPublic ? "border-green-400 bg-green-50 text-green-700" : "border-gray-200 text-gray-500"}`}
                >
                  <Globe size={16} /> Public
                </button>
                <button
                  onClick={() => setIsPublic(false)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${!isPublic ? "border-gray-400 bg-gray-100 text-gray-700" : "border-gray-200 text-gray-500"}`}
                >
                  <Lock size={16} /> Private
                </button>
              </div>
            </div>
            <button
              onClick={() => createMutation.mutate()}
              disabled={!teamName.trim() || createMutation.isPending}
              className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {createMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <UserPlus size={16} />
              )}
              Create & Join Team
            </button>
          </div>
        )}

        {view === "browse" && (
          <div className="p-6">
            {loadingTeams ? (
              <div className="flex justify-center py-8">
                <Loader2 size={24} className="text-indigo-500 animate-spin" />
              </div>
            ) : existingTeams.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Users size={36} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm">
                  No teams yet for this category. Be the first!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {existingTeams.map((team) => (
                  <div
                    key={team.id}
                    className="border border-gray-200 rounded-2xl p-4 flex items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-gray-900 text-sm truncate">
                          {team.name}
                        </span>
                        {!team.is_public && (
                          <Lock
                            size={12}
                            className="text-gray-400 flex-shrink-0"
                          />
                        )}
                      </div>
                      {team.description && (
                        <p className="text-xs text-gray-400 truncate">
                          {team.description}
                        </p>
                      )}
                      <p className="text-xs text-indigo-500 font-bold mt-1">
                        {team.member_count} member
                        {parseInt(team.member_count) !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => joinMutation.mutate(team.id)}
                      disabled={joinMutation.isPending}
                      className="flex-shrink-0 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all disabled:opacity-50"
                    >
                      {joinMutation.isPending ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        "Join"
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CommunityFeed() {
  const { data: user } = useUser();
  const [activeTab, setActiveTab] = useState("resolutions");
  const [teamUpResolution, setTeamUpResolution] = useState(null);

  const { data: publicResolutions = [], isLoading } = useQuery({
    queryKey: ["community"],
    queryFn: async () => {
      const response = await fetch("/api/community");
      if (!response.ok) throw new Error("Failed to fetch community data");
      return response.json();
    },
  });

  const { data: photoFeed = [], isLoading: photoLoading } = useQuery({
    queryKey: ["photo-feed"],
    queryFn: async () => {
      const res = await fetch("/api/photo-feed");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: activeTab === "photos",
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
              R
            </div>
            <span className="font-bold text-gray-900 text-lg">
              Community Feed
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
            >
              Home
            </a>
            {user ? (
              <a
                href="/dashboard"
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm"
              >
                My Dashboard
              </a>
            ) : (
              <a
                href="/account/signin"
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm"
              >
                Sign In
              </a>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
            <Globe size={16} /> Global Resolutions
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
            Everyone's Journey
          </h1>
          <p className="text-gray-600 text-lg max-w-xl mx-auto">
            See what others are working on, get inspired, and share some
            encouragement.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl mb-8">
          <button
            onClick={() => setActiveTab("resolutions")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "resolutions" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            <Target size={16} /> Resolutions
          </button>
          <button
            onClick={() => setActiveTab("photos")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "photos" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            <Camera size={16} /> Photo Reports
          </button>
        </div>

        {/* Resolutions Tab */}
        {activeTab === "resolutions" && (
          <div className="space-y-8">
            {publicResolutions.length === 0 ? (
              <div className="bg-white rounded-3xl border border-gray-100 p-20 text-center shadow-sm">
                <Users size={40} className="text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500">
                  No public resolutions to show right now.
                </p>
              </div>
            ) : (
              publicResolutions.map((res) => {
                const progress =
                  res.total_steps > 0
                    ? Math.round((res.completed_steps / res.total_steps) * 100)
                    : 0;
                return (
                  <div
                    key={res.id}
                    className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="p-8">
                      <div className="flex items-center gap-3 mb-6">
                        <AvatarBubble
                          name={res.user_name}
                          image={res.user_image}
                          avatar={res.user_avatar}
                        />
                        <div>
                          <div className="font-bold text-gray-900">
                            {res.user_name}
                          </div>
                          <div className="text-xs text-gray-400 uppercase tracking-tighter">
                            Joined{" "}
                            {format(new Date(res.created_at), "MMMM yyyy")}
                          </div>
                        </div>
                      </div>

                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 bg-gray-50 text-gray-500 rounded text-[10px] font-bold uppercase tracking-widest">
                            {res.category || "General"}
                          </span>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-3">
                          {res.title}
                        </h3>
                        <p className="text-gray-600 leading-relaxed mb-6 italic">
                          "
                          {res.description ||
                            "Take the first step toward your goal."}
                          "
                        </p>
                      </div>

                      <div className="space-y-4 pt-6 border-t border-gray-50">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 font-bold text-gray-900">
                            <TrendingUp size={16} className="text-green-500" />{" "}
                            {progress}% Complete
                          </div>
                          <div className="text-gray-400 text-xs">
                            {res.completed_steps} / {res.total_steps} Steps
                          </div>
                        </div>
                        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 transition-all duration-700"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-gray-400">
                          <Heart
                            size={18}
                            className={
                              res.cheer_count > 0
                                ? "text-rose-500 fill-rose-500"
                                : ""
                            }
                          />
                          <span className="text-sm font-bold text-gray-600">
                            {res.cheer_count} Cheers
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {user && (
                          <button
                            onClick={() => setTeamUpResolution(res)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all"
                          >
                            <Users size={15} /> Team Up
                          </button>
                        )}
                        <a
                          href={`/resolution/${res.id}`}
                          className="text-indigo-600 font-bold text-sm flex items-center gap-1 hover:underline"
                        >
                          Cheer them on <ArrowUpRight size={16} />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Photo Reports Tab */}
        {activeTab === "photos" && (
          <div className="space-y-8">
            {photoLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 size={28} className="text-indigo-500 animate-spin" />
              </div>
            ) : photoFeed.length === 0 ? (
              <div className="bg-white rounded-3xl border border-gray-100 p-20 text-center shadow-sm">
                <ImageIcon size={40} className="text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">
                  No photo reports yet.
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  When members share progress photos on their resolutions,
                  they'll show up here.
                </p>
              </div>
            ) : (
              photoFeed.map((photo) => (
                <PhotoCard key={photo.id} photo={photo} user={user} />
              ))
            )}
          </div>
        )}
      </main>

      {/* Team Up Modal */}
      {teamUpResolution && (
        <TeamUpModal
          resolution={teamUpResolution}
          onClose={() => setTeamUpResolution(null)}
          user={user}
        />
      )}
    </div>
  );
}

export default CommunityFeed;
