"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useUser from "@/utils/useUser";
import useUpload from "@/utils/useUpload";
import {
  User,
  Settings,
  Target,
  CheckCircle2,
  Trophy,
  LogOut,
  Loader2,
  Calendar,
  Camera,
  X,
  Save,
  Leaf,
} from "lucide-react";
import { format } from "date-fns";

const VEGGIE_AVATARS = [
  "🥕",
  "🥦",
  "🍆",
  "🥑",
  "🌽",
  "🍅",
  "🥬",
  "🥒",
  "🧄",
  "🧅",
  "🫑",
  "🌶️",
  "🥔",
  "🫛",
  "🍄",
  "🫚",
];

function AvatarDisplay({ user, size = "large" }) {
  const isLarge = size === "large";
  const dim = isLarge ? "w-24 h-24 text-5xl" : "w-10 h-10 text-lg";
  const avatar = user?.avatar;
  const image = user?.image;
  const name = user?.name || user?.email;

  if (avatar) {
    return (
      <div
        className={`${dim} rounded-3xl flex items-center justify-center bg-green-50 border-4 border-white shadow-lg`}
      >
        {avatar}
      </div>
    );
  }
  if (image) {
    return (
      <div
        className={`${dim} rounded-3xl bg-indigo-100 border-4 border-white shadow-lg overflow-hidden`}
      >
        <img src={image} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div
      className={`${dim} rounded-3xl flex items-center justify-center bg-indigo-100 text-indigo-600 font-bold border-4 border-white shadow-lg`}
    >
      {name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

function ProfilePage() {
  const { data: user, loading: userLoading } = useUser();
  const queryClient = useQueryClient();
  const [upload, { loading: uploading }] = useUpload();

  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAvatar, setEditAvatar] = useState(null); // emoji string or null
  const [editImage, setEditImage] = useState(null); // uploaded URL or null
  const [uploadError, setUploadError] = useState("");

  const { data: resolutions = [], isLoading: resLoading } = useQuery({
    queryKey: ["resolutions"],
    queryFn: async () => {
      const response = await fetch("/api/resolutions");
      if (!response.ok) throw new Error("Failed to fetch resolutions");
      return response.json();
    },
    enabled: !!user,
  });

  const { data: profileData } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
    enabled: !!user,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates) => {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setEditMode(false);
    },
  });

  const handleOpenEdit = () => {
    setEditName(profileData?.name || user?.name || "");
    setEditAvatar(profileData?.avatar || null);
    setEditImage(profileData?.image || user?.image || null);
    setUploadError("");
    setEditMode(true);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    const result = await upload({ file });
    if (result.error) {
      setUploadError(result.error);
      return;
    }
    setEditImage(result.url);
    setEditAvatar(null); // photo overrides emoji
  };

  const handleSelectVeggie = (emoji) => {
    setEditAvatar(emoji);
    setEditImage(null); // emoji overrides photo
  };

  const handleSave = () => {
    const updates = { name: editName };
    if (editAvatar) {
      updates.avatar = editAvatar;
      updates.image = null;
    } else if (editImage) {
      updates.image = editImage;
      updates.avatar = null;
    }
    updateProfileMutation.mutate(updates);
  };

  if (userLoading || resLoading) {
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

  const displayProfile = { ...user, ...(profileData || {}) };

  const completedResolutions = resolutions.filter(
    (r) =>
      r.total_steps > 0 &&
      parseInt(r.completed_steps) === parseInt(r.total_steps),
  );

  const totalStepsCompleted = resolutions.reduce(
    (sum, r) => sum + (parseInt(r.completed_steps) || 0),
    0,
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
              R
            </div>
            <span className="font-bold text-gray-900 text-lg">ResolveAI</span>
          </div>
          <a
            href="/dashboard"
            className="text-sm font-medium text-gray-600 hover:text-indigo-600"
          >
            Back to Dashboard
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Profile Card */}
        <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm mb-8 flex flex-col md:flex-row items-center gap-8">
          <div className="relative">
            <AvatarDisplay user={displayProfile} size="large" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-1">
              {displayProfile.name || "Member"}
            </h1>
            <p className="text-gray-500 mb-6">{displayProfile.email}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <a
                href="/account/logout"
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-red-50 hover:text-red-600 transition-all"
              >
                <LogOut size={16} />
                Sign Out
              </a>
              <button
                onClick={handleOpenEdit}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-all"
              >
                <Settings size={16} />
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* Edit Profile Modal */}
        {editMode && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">
                  Edit Profile
                </h2>
                <button
                  onClick={() => setEditMode(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Avatar preview */}
                <div className="flex flex-col items-center gap-3">
                  <div className="w-24 h-24 rounded-3xl flex items-center justify-center overflow-hidden bg-green-50 border-4 border-indigo-100 text-5xl shadow">
                    {editAvatar ? (
                      editAvatar
                    ) : editImage ? (
                      <img
                        src={editImage}
                        alt="profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-indigo-400 text-4xl font-bold">
                        {editName?.[0]?.toUpperCase() || "?"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    Choose a vegetable or upload a photo
                  </p>
                </div>

                {/* Name input */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 text-sm"
                    placeholder="Your name"
                  />
                </div>

                {/* Veggie Avatar Section */}
                <div>
                  <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <Leaf size={16} className="text-green-500" /> Pick a Veggie
                    Avatar
                  </p>
                  <div className="grid grid-cols-8 gap-2">
                    {VEGGIE_AVATARS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleSelectVeggie(emoji)}
                        className={`text-2xl w-10 h-10 rounded-xl flex items-center justify-center transition-all border-2 ${
                          editAvatar === emoji
                            ? "border-green-400 bg-green-50 shadow-md scale-110"
                            : "border-transparent bg-gray-50 hover:bg-green-50 hover:border-green-200"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Photo Upload */}
                <div>
                  <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <Camera size={16} className="text-indigo-500" /> Or Upload a
                    Photo
                  </p>
                  <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                    <Camera size={20} className="text-gray-400" />
                    <span className="text-sm text-gray-500 font-medium">
                      {uploading
                        ? "Uploading..."
                        : editImage && !editAvatar
                          ? "Change Photo"
                          : "Upload Photo"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                  {uploadError && (
                    <p className="text-red-500 text-xs mt-2">{uploadError}</p>
                  )}
                  {editImage && !editAvatar && (
                    <div className="mt-2 flex items-center gap-2">
                      <img
                        src={editImage}
                        alt="preview"
                        className="w-10 h-10 rounded-lg object-cover border"
                      />
                      <span className="text-xs text-gray-500">
                        Photo selected
                      </span>
                      <button
                        onClick={() => setEditImage(null)}
                        className="text-red-400 text-xs hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 p-6 border-t border-gray-100">
                <button
                  onClick={() => setEditMode(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={updateProfileMutation.isPending || uploading}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {updateProfileMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm text-center">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Target size={24} />
            </div>
            <div className="text-2xl font-black text-gray-900">
              {resolutions.length}
            </div>
            <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">
              Total Goals
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm text-center">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={24} />
            </div>
            <div className="text-2xl font-black text-gray-900">
              {totalStepsCompleted}
            </div>
            <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">
              Steps Done
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm text-center">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trophy size={24} />
            </div>
            <div className="text-2xl font-black text-gray-900">
              {completedResolutions.length}
            </div>
            <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">
              Full Wins
            </div>
          </div>
        </div>

        {/* Recent History */}
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Journey Highlights
        </h2>
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          {resolutions.length === 0 ? (
            <div className="p-12 text-center text-gray-400 italic">
              No highlights yet. Start your first resolution!
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {resolutions.slice(0, 5).map((res) => (
                <div
                  key={res.id}
                  className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                      <Target size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{res.title}</h4>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Calendar size={12} />
                        Started{" "}
                        {format(new Date(res.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-indigo-600">
                      {Math.round(
                        (parseInt(res.completed_steps) /
                          (parseInt(res.total_steps) || 1)) *
                          100,
                      )}
                      %
                    </div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                      Progress
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default ProfilePage;
