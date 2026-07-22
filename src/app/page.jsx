import useUser from "@/utils/useUser";
import { Sparkles, Target, Users, Shield } from "lucide-react";

function LandingPage() {
  const { data: user, loading } = useUser();

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
            R
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">
            ResolveAI
          </span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href={user ? "/welcome" : "/account/signin"}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Sign in
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-8">
          <Sparkles size={16} />
          AI-Powered Goal Setting
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 tracking-tight leading-tight">
          Turn your resolutions into <br />
          <span className="text-indigo-600">achievable steps.</span>
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
          ResolveAI uses intelligence to break down your biggest goals into
          bite-sized actions. Track progress, earn milestones, and join a
          supportive community.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="/account/signup"
            className="w-full sm:w-auto bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all transform hover:scale-105 shadow-lg shadow-indigo-200"
          >
            Start Your Resolution
          </a>
          <a
            href="/community"
            className="w-full sm:w-auto bg-white text-gray-900 border-2 border-gray-100 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition-all"
          >
            Explore Community
          </a>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-32 text-left">
          <div className="p-8 rounded-3xl bg-gray-50 border border-gray-100">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
              <Target size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Smart Step Generation
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Don't just set a goal. Get a personalized 6-step action plan
              generated specifically for your journey.
            </p>
          </div>
          <div className="p-8 rounded-3xl bg-gray-50 border border-gray-100">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mb-6">
              <Users size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Social Motivation
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Opt into the community feed to share your progress and receive
              "cheers" from others on similar paths.
            </p>
          </div>
          <div className="p-8 rounded-3xl bg-gray-50 border border-gray-100">
            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-6">
              <Shield size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Privacy First
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Your journey, your rules. Keep your resolutions private or go
              public whenever you're ready for the spotlight.
            </p>
          </div>
        </div>
      </main>

      {/* Social Proof Section */}
      <section className="bg-indigo-900 py-20 mt-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-12">
            Built for Dreamers & Doers
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 opacity-60">
            <div className="text-white text-xl font-bold italic">
              Persistence
            </div>
            <div className="text-white text-xl font-bold italic">
              Consistency
            </div>
            <div className="text-white text-xl font-bold italic">Growth</div>
            <div className="text-white text-xl font-bold italic">Community</div>
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-gray-100 text-center text-gray-500 text-sm">
        &copy; 2026 ResolveAI. All rights reserved.
      </footer>
    </div>
  );
}

export default LandingPage;
