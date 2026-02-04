import { SparklesCore } from "./Sparkles";
import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [particleColor, setParticleColor] = useState("#000000");

  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setParticleColor(isDark ? "#FFFFFF" : "#000000");
    };
    
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);

  return (
    <div className="w-full h-screen bg-white dark:bg-black flex flex-col items-center justify-center overflow-hidden relative">
      <div className="w-full absolute inset-0 h-screen">
        <SparklesCore
          id="tsparticlesfullpage"
          background="transparent"
          minSize={0.6}
          maxSize={1.4}
          particleDensity={100}
          className="w-full h-full"
          particleColor={particleColor}
        />
      </div>

      <div className="text-center relative z-20">
        <style>{`
          @keyframes letterSpacing {
            0% {
              letter-spacing: -0.5em;
              opacity: 0;
            }
            40% {
              opacity: 1;
            }
            100% {
              letter-spacing: 0.2em;
            }
          }

          .splash-text {
            animation: letterSpacing 1.6s ease-in-out;
            font-weight: 800;
            font-size: 4rem;
            color: #000000;
            text-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          }

          .dark .splash-text {
            color: white;
            text-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          }

          @keyframes fadeInSub {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          .splash-subtitle {
            animation: fadeInSub 1s ease-in-out 1.2s forwards;
            opacity: 0;
            color: #4A4A4A;
          }

          .dark .splash-subtitle {
            color: rgba(255, 255, 255, 0.7);
          }
        `}</style>

        <h1 className="splash-text font-sans tracking-wider">SMARTSTOCK</h1>
        <p className="splash-subtitle text-lg mt-4">Your Smart Inventory Solution</p>
      </div>
    </div>
  )
}
