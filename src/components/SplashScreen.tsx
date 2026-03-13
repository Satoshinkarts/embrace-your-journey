import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [phase, setPhase] = useState<"video" | "exit">("video");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Fallback: if video doesn't play or takes too long, finish after 5s
    const fallback = setTimeout(() => {
      setPhase("exit");
      setTimeout(onFinish, 500);
    }, 5000);

    return () => clearTimeout(fallback);
  }, [onFinish]);

  const handleVideoEnd = () => {
    setPhase("exit");
    setTimeout(onFinish, 500);
  };

  return (
    <AnimatePresence>
      {phase !== "exit" ? (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] bg-black"
          style={{ width: '100vw', height: '100vh', top: 0, left: 0 }}
        >
          <video
            ref={videoRef}
            src="/splash-video.mp4"
            autoPlay
            muted
            playsInline
            onEnded={handleVideoEnd}
            style={{ width: '100vw', height: '100vh', objectFit: 'cover' }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
