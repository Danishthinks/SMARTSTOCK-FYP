import React, { useState, useEffect } from "react";
import { SparklesCore } from "../../Components/ui/Sparkles";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { useNavigate, Link } from "react-router-dom";
import ThemeToggle from "../../Components/ui/ThemeToggle";
import { useAuth } from "../../Contexts/AuthContext";
import { useTheme } from "../../Components/ThemeContext";
import { Eye, EyeOff } from "lucide-react";

export default function Register() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { theme } = useTheme();

  useEffect(() => {
    if (currentUser) {
      navigate("/dashboard");
    }
  }, [currentUser, navigate]);

  const particleColor = theme === 'dark' ? "#FFFFFF" : "#000000";
  const isLightMode = theme === 'light';

  const glassCardStyle = isLightMode ? {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 10px 35px rgba(0, 0, 0, 0.2)',
  } : {};

  const glassInputStyle = isLightMode ? {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  } : {};

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    if (!username.trim()) {
      setError("Please enter a username.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    if (!confirmPassword) {
      setError("Please confirm your password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);

    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      setSuccess("Account created successfully. Redirecting to login...");
      setTimeout(() => {
        navigate("/");
      }, 900);
    } catch (err) {
      console.error("Register error:", err);
      setError(err.message || "Registration failed");
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-white dark:bg-black p-4 text-slate-900 dark:text-slate-100">
      {/* Theme Toggle Button */}
      <div className="absolute right-4 top-4 z-30">
        <ThemeToggle />
      </div>

      {/* Sparkles Animation Background */}
      <div className="absolute inset-0">
        <SparklesCore
          background="transparent"
          particleColor={particleColor}
          particleDensity={50}
          minSize={0.6}
          maxSize={1.4}
          className="w-full h-full"
        />
      </div>

      {/* REGISTER CARD */}
      <div className="mx-auto w-full max-w-md">
        <div
          className="relative rounded-xl p-8 text-center text-slate-900 dark:bg-[#181a1f] dark:text-slate-100 border-2 border-blue-500"
          style={glassCardStyle}
        >
          <h2 className="mb-1 text-3xl font-bold text-black dark:text-slate-100">
            SMARTSTOCK
          </h2>
          <p className="mb-6 text-sm font-semibold text-blue-600 dark:text-blue-400">
            Create Your Account
          </p>

          <form onSubmit={handleRegister}>
            {/* Email Field */}
            <input
              type="email"
              id="register-email"
              placeholder="Email Address"
              className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
              style={glassInputStyle}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {/* Username Field */}
            <input
              type="text"
              id="register-username"
              placeholder="Username"
              className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
              style={glassInputStyle}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            {/* Company Name Field */}
            <input
              type="text"
              id="register-company"
              placeholder="Company Name (Optional)"
              className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
              style={glassInputStyle}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />

            {/* Password + Eye Icon */}
            <div className="relative mb-3">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-3 pr-10 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
                style={glassInputStyle}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Confirm Password + Eye Icon */}
            <div className="relative mb-3">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirm-password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-3 pr-10 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
                style={glassInputStyle}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 mt-2 rounded-lg bg-red-100 p-3 text-sm text-red-700 dark:bg-red-900 dark:text-red-200">
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="mb-4 mt-2 rounded-lg bg-green-100 p-3 text-sm text-green-700 dark:bg-green-900 dark:text-green-200">
                {success}
              </div>
            )}

            {/* Register Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="mt-4 w-full rounded-lg bg-blue-600 dark:bg-blue-500 py-3 text-sm font-bold text-white transition hover:bg-blue-700 dark:hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? "Creating account..." : "Register"}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-5 border-t border-slate-300 pt-4 text-sm text-slate-700 dark:border-slate-600 dark:text-slate-300">
            Already have an account?{" "}
            <Link
              to="/"
              className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}