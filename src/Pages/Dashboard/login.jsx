import LoginForm from "../../Components/ui/login-form";
import { SparklesCore } from "../../Components/ui/Sparkles";
import ThemeToggle from "../../Components/ui/ThemeToggle";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Contexts/AuthContext";
import { useEffect } from "react";
import { useTheme } from "../../Components/ThemeContext";

export default function Login() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();

  useEffect(() => {
    if (currentUser) {
      navigate("/dashboard");
    }
  }, [currentUser, navigate]);

  const particleColor = theme === 'dark' ? "#FFFFFF" : "#000000";

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-white dark:bg-black p-4 text-slate-900 dark:text-slate-100">
      {/* Theme Toggle Button */}
      <div className="absolute right-4 top-4 z-30">
        <ThemeToggle />
      </div>

      <div className="w-full absolute inset-0 h-screen">
        <SparklesCore
          id="tsparticlesloginpage"
          background="transparent"
          minSize={0.6}
          maxSize={1.4}
          particleDensity={50}
          className="w-full h-full"
          particleColor={particleColor}
        />
      </div>

      <div className="relative z-20 flex items-center justify-center w-full">
        <LoginForm />
      </div>
    </div>
  );
}

