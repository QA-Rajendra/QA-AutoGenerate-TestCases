import { JSX, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useAuthTheme, THEME_COLORS } from "../contexts/ThemeContext";
import ThemeSelectorAuth from "../components/ThemeSelectorAuth";

export default function Signup(): JSX.Element {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const { authTheme } = useAuthTheme();
  const colors = THEME_COLORS[authTheme];
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!displayName || !email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setError("");
      setLoading(true);
      await signup(email, password, displayName);
      navigate("/app");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 dark:from-black dark:via-slate-900 dark:to-black flex items-center justify-center p-3 sm:p-4 md:p-6">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl animate-pulse opacity-20" style={{background: "linear-gradient(135deg, currentColor, transparent)"}}></div>
        <div className="absolute bottom-20 right-10 w-60 h-60 rounded-full blur-3xl animate-pulse opacity-20" style={{animationDelay: "1s", background: "linear-gradient(135deg, currentColor, transparent)"}}></div>
      </div>

      <ThemeSelectorAuth />

      <div className="w-full max-w-sm relative z-10">
        {/* Card */}
        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div 
              className="inline-flex items-center justify-center w-16 h-16 rounded-xl mb-4 shadow-lg transform hover:scale-105 transition-transform duration-300"
              style={{
                background: `linear-gradient(135deg, var(--color-from), var(--color-to))`,
                boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.25)`,
              } as React.CSSProperties}
            >
              <span className="text-3xl">✨</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{background: `linear-gradient(to right, var(--gradient-from), var(--gradient-to))`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'} as React.CSSProperties}>
              Get Started
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
              Create your QA AutoGenerate account
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 dark:bg-red-500/20 border border-red-400/50 dark:border-red-500/50 rounded-xl backdrop-blur-sm animate-in fade-in duration-300">
              <p className="text-red-700 dark:text-red-400 text-sm font-medium flex items-center gap-2">
                <span className="text-lg">⚠️</span> {error}
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Display Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-3 border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-700/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-400/50 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
                disabled={loading}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-700/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-400/50 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-700/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-400/50 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
                At least 6 characters
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-700/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-400/50 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
                disabled={loading}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-bold py-3 rounded-xl transition-all duration-300 transform hover:shadow-lg active:scale-95 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: `linear-gradient(to right, rgb(var(--color-from-rgb)), rgb(var(--color-to-rgb)))`,
                '--color-from-rgb': colors.from === 'from-blue-500' ? '59, 130, 246' : 
                                    colors.from === 'from-purple-500' ? '168, 85, 247' :
                                    colors.from === 'from-cyan-500' ? '6, 182, 212' :
                                    colors.from === 'from-indigo-500' ? '99, 102, 241' :
                                    colors.from === 'from-emerald-500' ? '16, 185, 129' :
                                    '244, 63, 94',
                '--color-to-rgb': colors.to === 'to-cyan-500' ? '6, 182, 212' :
                                  colors.to === 'to-pink-500' ? '236, 72, 153' :
                                  colors.to === 'to-blue-500' ? '59, 130, 246' :
                                  colors.to === 'to-purple-500' ? '168, 85, 247' :
                                  colors.to === 'to-teal-500' ? '20, 184, 166' :
                                  '249, 115, 22',
                boxShadow: `0 20px 25px -5px rgba(0, 0, 0, 0.1)`,
              } as React.CSSProperties}
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span className="ml-2">Creating account...</span>
                </>
              ) : (
                <><span>🚀</span> Create Account</>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gradient-to-r from-transparent via-gray-300 dark:via-slate-600 to-transparent"></div>
            </div>
            <div className="relative flex justify-center text-xs sm:text-sm">
              <span className="px-3 bg-white/95 dark:bg-slate-800/95 text-gray-500 dark:text-gray-400 font-medium">
                Already have an account?
              </span>
            </div>
          </div>

          {/* Sign In Link */}
          <Link
            to="/login"
            className="w-full block text-center bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-700 hover:from-slate-200 hover:to-slate-100 dark:hover:from-slate-600 dark:hover:to-slate-600 text-gray-800 dark:text-white font-bold py-3 rounded-xl transition-all duration-200 border border-gray-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-600"
          >
            Sign In
          </Link>

          {/* Terms */}
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-6 leading-relaxed">
            By creating an account, you agree to our
            <br />
            <span className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium">
              Terms of Service
            </span>
            {" "}and{" "}
            <span className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium">
              Privacy Policy
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
