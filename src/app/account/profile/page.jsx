import { useState, useEffect } from "react";
import { signOut } from "@auth/create/react";
import useUser from "@/utils/useUser";
import {
  ArrowLeft, PenLine, Check, X, Loader2, LogOut, Eye, EyeOff, Bell,
} from "lucide-react";

function ProfilePage() {
  const { data: user, loading: userLoading, refetch } = useUser();

  // Name
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [nameError, setNameError] = useState("");
  const [nameSaving, setNameSaving] = useState(false);

  // Email
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [displayEmail, setDisplayEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);

  // Notification prefs (localStorage, per user)
  const [notifPrefs, setNotifPrefs] = useState({
    showBadge: true,
    showBoosts: true,
    showInvites: true,
  });

  // Password
  const [editingPassword, setEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);


  useEffect(() => {
    if (!userLoading && !user && typeof window !== "undefined") {
      window.location.href = "/account/signin";
    }
  }, [user, userLoading]);

  useEffect(() => {
    if (user?.name) setDisplayName(user.name);
    if (user?.email) setDisplayEmail(user.email);
  }, [user?.name, user?.email, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    setNotifPrefs({
      showBadge: localStorage.getItem(`notif-badge-${user.id}`) !== "0",
      showBoosts: localStorage.getItem(`notif-boosts-${user.id}`) !== "0",
      showInvites: localStorage.getItem(`notif-invites-${user.id}`) !== "0",
    });
  }, [user?.id]);

  const toggleNotifPref = (key, lsKey) => {
    const next = !notifPrefs[key];
    if (!next) {
      localStorage.setItem(lsKey, "0");
    } else {
      localStorage.removeItem(lsKey);
    }
    setNotifPrefs((prev) => ({ ...prev, [key]: next }));
  };

  // ── Name ──
  const saveName = async () => {
    if (!nameValue.trim()) return;
    setNameSaving(true); setNameError("");
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameValue.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      setDisplayName(data.name || nameValue.trim());
      setEditingName(false);
      refetch?.();
    } catch (err) {
      setNameError(err.message);
    } finally { setNameSaving(false); }
  };

  // ── Email ──
  const saveEmail = async () => {
    if (!newEmail.trim() || !emailPassword) return;
    setEmailSaving(true); setEmailError("");
    try {
      const res = await fetch("/api/profile/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: newEmail.trim(), currentPassword: emailPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      setDisplayEmail(data.email);
      setEditingEmail(false);
      setNewEmail(""); setEmailPassword("");
      refetch?.();
    } catch (err) {
      setEmailError(err.message);
    } finally { setEmailSaving(false); }
  };

  // ── Password ──
  const savePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) { setPasswordError("Passwords don't match"); return; }
    if (newPassword.length < 6) { setPasswordError("Password must be at least 6 characters"); return; }
    setPasswordSaving(true); setPasswordError("");
    try {
      const res = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      setPasswordSuccess(true);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setTimeout(() => { setPasswordSuccess(false); setEditingPassword(false); }, 2000);
    } catch (err) {
      setPasswordError(err.message);
    } finally { setPasswordSaving(false); }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const name = displayName || user?.name || "";
  const email = displayEmail || user?.email || "";
  const userId = user?.id || "";
  const initials = name
    ? name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : email.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/dashboard" className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={18} /> Dashboard
          </a>
          <span className="font-bold text-gray-900">Account</span>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-2 text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        {/* Avatar hero */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8 flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold select-none overflow-hidden">
            {user?.image ? (
              <img src={user.image} alt="avatar" className="w-full h-full object-cover" />
            ) : initials}
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">{name || "—"}</p>
            <p className="text-sm text-gray-400">{email}</p>
          </div>
        </div>

        {/* Details card */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm divide-y divide-gray-100">

          {/* ── Name ── */}
          <div className="px-8 py-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Name</p>
            {editingName ? (
              <div className="mt-2 space-y-2">
                <div className="flex gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value.replace(/\s/g, ""))}
                    onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                    placeholder="Your name"
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <button onClick={saveName} disabled={nameSaving || !nameValue.trim()} className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50">
                    {nameSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  </button>
                  <button onClick={() => { setEditingName(false); setNameError(""); }} className="p-2.5 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors">
                    <X size={16} />
                  </button>
                </div>
                {nameError && <p className="text-xs text-red-500">{nameError}</p>}
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-base font-semibold text-gray-900">{name || "—"}</p>
                <button onClick={() => { setNameValue(name); setNameError(""); setEditingName(true); }} className="text-gray-300 hover:text-indigo-500 transition-colors">
                  <PenLine size={16} />
                </button>
              </div>
            )}
          </div>

          {/* ── Email ── */}
          <div className="px-8 py-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Email</p>
            {editingEmail ? (
              <div className="mt-2 space-y-2">
                <input
                  autoFocus
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="New email address"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <div className="relative">
                  <input
                    type={showEmailPassword ? "text" : "password"}
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveEmail(); if (e.key === "Escape") setEditingEmail(false); }}
                    placeholder="Current password to confirm"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 pr-11 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <button type="button" onClick={() => setShowEmailPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showEmailPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {emailError && <p className="text-xs text-red-500">{emailError}</p>}
                <div className="flex gap-2 pt-1">
                  <button onClick={saveEmail} disabled={emailSaving || !newEmail.trim() || !emailPassword} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                    {emailSaving ? <Loader2 size={14} className="animate-spin" /> : null} Update Email
                  </button>
                  <button onClick={() => { setEditingEmail(false); setNewEmail(""); setEmailPassword(""); setEmailError(""); }} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-base font-semibold text-gray-900">{email || "—"}</p>
                <button onClick={() => { setNewEmail(""); setEmailError(""); setEditingEmail(true); }} className="text-gray-300 hover:text-indigo-500 transition-colors">
                  <PenLine size={16} />
                </button>
              </div>
            )}
          </div>

          {/* ── Password ── */}
          <div className="px-8 py-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Password</p>
            {editingPassword ? (
              <div className="mt-2 space-y-2">
                {/* Current password */}
                <div className="relative">
                  <input
                    autoFocus
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Current password"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 pr-11 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <button type="button" onClick={() => setShowCurrent((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {/* New password */}
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 pr-11 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {/* Confirm password */}
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") savePassword(); if (e.key === "Escape") setEditingPassword(false); }}
                    placeholder="Confirm new password"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 pr-11 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordError && <p className="text-xs text-red-500">{passwordError}</p>}
                {passwordSuccess && <p className="text-xs text-green-600 font-semibold">Password updated!</p>}
                <div className="flex gap-2 pt-1">
                  <button onClick={savePassword} disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                    {passwordSaving ? <Loader2 size={14} className="animate-spin" /> : null} Update Password
                  </button>
                  <button onClick={() => { setEditingPassword(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setPasswordError(""); setPasswordSuccess(false); }} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-base font-semibold text-gray-400 tracking-widest">••••••••</p>
                <button onClick={() => { setPasswordError(""); setPasswordSuccess(false); setEditingPassword(true); }} className="text-gray-300 hover:text-indigo-500 transition-colors">
                  <PenLine size={16} />
                </button>
              </div>
            )}
          </div>

          {/* ── Account ID ── */}
          <div className="px-8 py-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Account ID</p>
            <p className="text-sm text-gray-400 font-mono break-all">{userId || "—"}</p>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-8 py-5 border-b border-gray-100 flex items-center gap-2">
            <Bell size={16} className="text-indigo-600" />
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Notifications</h3>
          </div>

          {/* Show badge on dashboard */}
          <div className="px-8 py-5 flex items-center justify-between border-b border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-900">Dashboard badge</p>
              <p className="text-xs text-gray-400 mt-0.5">Show the red notification dot on your menu</p>
            </div>
            <button
              type="button"
              onClick={() => toggleNotifPref("showBadge", `notif-badge-${user.id}`)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${notifPrefs.showBadge ? "bg-indigo-600" : "bg-gray-200"}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${notifPrefs.showBadge ? "left-6" : "left-1"}`} />
            </button>
          </div>

          {/* Boost / comment notifications */}
          <div className="px-8 py-5 flex items-center justify-between border-b border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-900">Comments on your goals</p>
              <p className="text-xs text-gray-400 mt-0.5">Notify you when someone boosts one of your public goals</p>
            </div>
            <button
              type="button"
              onClick={() => toggleNotifPref("showBoosts", `notif-boosts-${user.id}`)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${notifPrefs.showBoosts ? "bg-indigo-600" : "bg-gray-200"}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${notifPrefs.showBoosts ? "left-6" : "left-1"}`} />
            </button>
          </div>

          {/* Team invite notifications */}
          <div className="px-8 py-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Team invites</p>
              <p className="text-xs text-gray-400 mt-0.5">Notify you when someone sends a team up request</p>
            </div>
            <button
              type="button"
              onClick={() => toggleNotifPref("showInvites", `notif-invites-${user.id}`)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${notifPrefs.showInvites ? "bg-indigo-600" : "bg-gray-200"}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${notifPrefs.showInvites ? "left-6" : "left-1"}`} />
            </button>
          </div>
        </div>

        {/* Sign out */}
        <div className="bg-white rounded-3xl border border-red-100 shadow-sm p-8">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Sign out</h3>
          <p className="text-sm text-gray-400 mb-4">You'll be redirected to the home page.</p>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-2 bg-red-50 text-red-500 hover:bg-red-100 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </main>

    </div>
  );
}

export default ProfilePage;
