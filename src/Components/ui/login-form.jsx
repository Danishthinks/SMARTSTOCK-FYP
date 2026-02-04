import React, { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "../../lib/firebase"
import { useNavigate, Link } from "react-router-dom"
import { useTheme } from "../../Components/ThemeContext"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()
  const { theme } = useTheme()
  
  const isLightMode = theme === 'light'
  
  const glassCardStyle = isLightMode ? {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 10px 35px rgba(0, 0, 0, 0.2)',
  } : {}
  
  const glassInputStyle = isLightMode ? {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  } : {}

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
      navigate("/dashboard")
    } catch (err) {
      console.error("Login error:", err)
      setError(err.message || "Login failed. Please check your credentials.")
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="mx-auto w-full max-w-sm">
        <div 
          className="relative rounded-xl p-8 text-center text-slate-900 dark:bg-[#181a1f] dark:text-slate-100"
          style={glassCardStyle}
        >
        <div className="mb-6">
          <h2 className="mb-2 text-2xl font-bold text-black dark:text-slate-100">
            SMARTSTOCK
          </h2>
          <p className="mb-6 text-sm text-black dark:text-slate-400">
            Login to continue
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <input
            type="email"
            id="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
              className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-black focus:ring-2 focus:ring-black dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-slate-400 dark:focus:ring-slate-400"
              style={glassInputStyle}
            required
          />

          {/* Password + Eye Icon */}
          <div className="relative mb-4">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-3 pr-10 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-black focus:ring-2 focus:ring-black dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-slate-400 dark:focus:ring-slate-400"
              style={glassInputStyle}
              required
            />
            {/* Eye Icon Button */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 mt-2 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 w-full rounded-lg bg-black dark:bg-white py-3 text-sm font-medium text-white dark:text-black transition hover:bg-gray-800 dark:hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="mt-4 text-sm text-slate-700 dark:text-slate-300">
          Don't have an account?{" "}
          <Link 
            to="/register" 
            className="font-semibold text-black hover:underline dark:text-white dark:font-bold"
          >
            Register
          </Link>
        </div>
      </div>
    </div>
    </>
  )
}
