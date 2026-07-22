import { useEffect, useState } from "react";
import useUser from "@/utils/useUser";

const GREETINGS = [
  "Hello",
  "Welcome back",
  "Hey",
  "Good to see you",
  "Great to have you back",
  "Welcome",
  "Nice to see you",
];

export default function WelcomePage() {
  const [greeting] = useState(
    () => GREETINGS[Math.floor(Math.random() * GREETINGS.length)]
  );
  const { data: user, loading } = useUser();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Fade in immediately
    const fadeIn = setTimeout(() => setVisible(true), 50);
    // Redirect to dashboard after 1.8s
    const redirect = setTimeout(() => {
      window.location.href = "/dashboard";
    }, 1800);
    return () => {
      clearTimeout(fadeIn);
      clearTimeout(redirect);
    };
  }, []);

  // If not authenticated at all, skip straight to dashboard
  useEffect(() => {
    if (!loading && !user) {
      window.location.href = "/dashboard";
    }
  }, [user, loading]);

  const name = user?.name || user?.email?.split("@")[0] || "there";

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center bg-indigo-600 transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="text-center px-8">
        <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight">
          {greeting}, {loading ? "…" : name}
        </h1>
        <p className="mt-6 text-indigo-300 text-base">
          Taking you to your dashboard…
        </p>
        <div className="mt-8 flex justify-center gap-1.5">
          <span className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}
