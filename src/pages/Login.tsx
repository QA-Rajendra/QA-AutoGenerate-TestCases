import { JSX, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Login(): JSX.Element {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setError("");
      setLoading(true);
      await login(email, password);
      navigate("/app");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to log in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 dark:from-black dark:via-slate-900 dark:to-black flex items-center justify-center p-3 sm:p-4 md:p-6">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: "1s"}}></div>
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Card */}
        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-600 rounded-xl mb-4 shadow-lg shadow-blue-500/30 transform hover:scale-105 transition-transform duration-300">
              <span className="text-3xl">🔐</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent mb-2">
              Welcome Back
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
              Access QA AutoGenerate TestCases
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
          <form onSubmit={handleSubmit} className="space-y-6">
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
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 via-blue-600 to-cyan-500 hover:from-blue-600 hover:via-blue-700 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all duration-300 transform hover:shadow-lg hover:shadow-blue-500/30 active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span className="ml-2">Signing in...</span>
                </>
              ) : (
                <><span>🔑</span> Sign In</>
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
                Don't have an account?
              </span>
            </div>
          </div>

          {/* Sign Up Link */}
          <Link
            to="/signup"
            className="w-full block text-center bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-700 hover:from-slate-200 hover:to-slate-100 dark:hover:from-slate-600 dark:hover:to-slate-600 text-gray-800 dark:text-white font-bold py-3 rounded-xl transition-all duration-200 border border-gray-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-600"
          >
            Create Account
          </Link>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-gradient-to-br from-blue-400/10 to-cyan-400/10 dark:from-blue-500/10 dark:to-cyan-500/10 border border-blue-300/30 dark:border-blue-500/30 rounded-xl backdrop-blur-sm">
            <p className="text-xs font-bold text-blue-700 dark:text-blue-300 mb-3 flex items-center gap-2">
              <span>📝</span> Demo Credentials (for testing)
            </p>
            <div className="space-y-2">
              <p className="text-xs text-blue-700 dark:text-blue-400">
                Email: <code className="bg-blue-200/50 dark:bg-blue-900/50 px-2 py-1 rounded-md font-mono text-xs border border-blue-300/50 dark:border-blue-600/50">demo@test.com</code>
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-400">
                Password: <code className="bg-blue-200/50 dark:bg-blue-900/50 px-2 py-1 rounded-md font-mono text-xs border border-blue-300/50 dark:border-blue-600/50">password123</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
