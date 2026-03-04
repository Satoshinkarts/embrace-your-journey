import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import habalLogo from "@/assets/habal-logo.png";
import { Bike, Shield, MapPin, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: MapPin, title: "GPS-Powered Booking", description: "Precise pickup with high-accuracy GPS" },
  { icon: Bike, title: "Verified Riders", description: "Every rider is verified and tracked" },
  { icon: Shield, title: "Safe & Transparent", description: "Real-time tracking, fare estimates, ratings" },
];

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-background px-5 py-12 overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-primary/8 blur-[150px]" />
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-info/6 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-accent/6 blur-[120px]" />
      </div>

      {/* Logo & branding */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 mb-10 text-center"
      >
        <div className="relative mx-auto mb-5 h-24 w-24">
          <div className="absolute -inset-6 rounded-full bg-primary/10 blur-[50px]" />
          <div className="absolute -inset-3 rounded-full bg-primary/15 blur-[30px]" />
          <img src={habalLogo} alt="Habal Logo" className="relative h-24 w-24 object-contain drop-shadow-2xl" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Habal</h1>
        <p className="mt-1 text-sm text-muted-foreground">Iloilo Verified Rider Network</p>
      </motion.div>

      {/* Features */}
      <div className="relative z-10 w-full max-w-sm space-y-2.5 mb-8">
        {features.map((feature, i) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-4 rounded-2xl border border-border/60 bg-gradient-to-r from-primary/10 to-primary/5 p-4"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-background/50 backdrop-blur-sm">
                <Icon className="h-5 w-5 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{feature.title}</p>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="relative z-10 w-full max-w-sm space-y-3"
      >
        <Button
          className="h-12 w-full text-sm font-semibold"
          onClick={() => navigate("/auth")}
        >
          Get Started
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          className="h-12 w-full text-sm font-medium"
          onClick={() => navigate("/auth")}
        >
          Sign In
        </Button>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-8 text-center text-xs text-muted-foreground"
      >
        Safe rides across Iloilo City
      </motion.p>
    </div>
  );
}
