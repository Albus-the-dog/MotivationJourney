"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import useUser from "@/utils/useUser";
import { Heart, ArrowLeft, Loader2, AlertCircle } from "lucide-react";

export default function CheerPage({ params }) {
  const { id } = params;
  const { data: user, loading: userLoading } = useUser();
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const { data: resolution, isLoading, error } = useQuery({
    queryKey: ["resolution-cheer", id],
    queryFn: async () => {
      const res = await fetch(`/api/resolutions/${id}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !userLoading,
  });

  const cheerMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/cheers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution_id: id, message: message.trim() }),
      });
      if (!res.ok) throw new Error("Failed to send cheer");
      return res.json();
    },
    onSuccess: () => setSent(true),
  });

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!userLoading && !user) {
    window.location.href = `/account/signin`;
    return null;
  }

  if (error || !resolution) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 text-center">
        <div className="max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Goal not found</h2>
          <p className="text-gray-500 mb-6">It might be private or doesn't exist.</p>
          <a href="/community" className="text-indigo-600 font-bold hover:underline">
            Back to Community
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center gap-4">
          <a
            href="/community"
            className="p-2 hover:bg-gray-50 rounded-full transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </a>
          <span className="font-bold text-gray-900">Cheer Someone On</span>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-10">
        {sent ? (
          <div className="bg-white rounded-3xl p-12 border border-gray-200 shadow-sm text-center">
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart size={32} className="text-rose-500 fill-rose-500" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Cheer sent!</h2>
            <p className="text-gray-500 mb-8">
              {resolution.user_name || "They"} will see your encouragement on their goal.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="/community"
                className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all"
              >
                Back to Community
              </a>
              <a
                href={`/resolution/${id}`}
                className="border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 transition-all"
              >
                View Their Goal
              </a>
            </div>
          </div>
        ) : (
          <>
            {/* Resolution info card */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6 mb-6">
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">
                {resolution.category || "Goal"}
              </p>
              <h2 className="text-xl font-extrabold text-indigo-900 mb-1">
                {resolution.title}
              </h2>
              <p className="text-indigo-600 text-sm font-semibold">
                by {resolution.user_name || "someone"}
              </p>
            </div>

            {/* Cheer form */}
            <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-rose-50 rounded-2xl flex items-center justify-center">
                  <Heart size={20} className="text-rose-500" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Send a Cheer</h3>
                  <p className="text-sm text-gray-500">Leave some encouragement</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm flex-shrink-0">
                    {user?.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <textarea
                    rows={4}
                    placeholder="Write something encouraging... (optional)"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400 text-sm resize-none"
                  />
                </div>

                {cheerMutation.isError && (
                  <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">
                    Something went wrong. Please try again.
                  </p>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => cheerMutation.mutate()}
                    disabled={cheerMutation.isPending}
                    className="flex items-center gap-2 bg-rose-500 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-rose-600 transition-all disabled:opacity-50"
                  >
                    {cheerMutation.isPending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Heart size={16} />
                    )}
                    Send Cheer
                  </button>
                  <a
                    href="/community"
                    className="text-gray-500 text-sm font-medium hover:text-gray-700 transition-colors"
                  >
                    Cancel
                  </a>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
