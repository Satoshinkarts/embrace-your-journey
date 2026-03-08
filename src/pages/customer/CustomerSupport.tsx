import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft, Search, Plus, Minus, Send, SmilePlus, ChevronLeft,
  Check, CheckCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const FAQ_DATA = [
  {
    question: "What is Habal?",
    answer:
      "At Habal we expect at a day's start is you, better and happier than yesterday. We have got you covered share your concern or check our frequently asked questions listed below.",
  },
  {
    question: "How to book a ride?",
    answer:
      "Open the app, drag the map to set your pickup location and tap 'Pin'. Then search or tap the map for your destination. Choose your ride type, payment method, and tap 'Order'. A nearby rider will be matched to you within minutes.",
  },
  {
    question: "What are the list of locations catered?",
    answer:
      "Habal currently serves Panay Island, focusing on Iloilo City and surrounding areas including Jaro, Mandurriao, City Proper, La Paz, Arevalo, Oton, Pavia, and Santa Barbara.",
  },
  {
    question: "Is the app free?",
    answer:
      "Yes, the Habal app is free to download and use. You only pay for the rides you book. Fare is calculated based on distance traveled plus any zone premiums.",
  },
  {
    question: "How do I pay for rides?",
    answer:
      "You can pay with Cash upon arrival at your destination, or use your in-app Wallet balance. Top up your wallet through the Wallet tab.",
  },
  {
    question: "How do I contact my rider?",
    answer:
      "Once a rider accepts your booking, you can message them through the in-app chat. You'll also see their real-time location on the map.",
  },
];

export default function CustomerSupport() {
  return (
    <DashboardLayout>
      <SupportPage />
    </DashboardLayout>
  );
}

function SupportPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<"faq" | "chat">("faq");

  return (
    <AnimatePresence mode="wait">
      {view === "faq" ? (
        <motion.div key="faq" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          <FAQView onBack={() => navigate(-1)} onOpenChat={() => setView("chat")} />
        </motion.div>
      ) : (
        <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          <ChatSupportView onBack={() => setView("faq")} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── FAQ View ── */
function FAQView({ onBack, onOpenChat }: { onBack: () => void; onOpenChat: () => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const filtered = FAQ_DATA.filter(
    (f) =>
      f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="pb-4">
      {/* Back */}
      <button onClick={onBack} className="mb-4 text-primary">
        <ArrowLeft className="h-5 w-5" />
      </button>

      {/* Header */}
      <h1 className="text-lg font-bold text-foreground mb-1">
        We're here to help with anything and everything on Habal!
      </h1>
      <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
        At Habal we expect at a day's start is you, better and happier than yesterday. We have got you covered share your concern or check our frequently asked questions listed below.
      </p>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search Help"
          className="pl-10 h-10 rounded-full border-border bg-card text-sm"
        />
      </div>

      {/* FAQs */}
      <h2 className="text-base font-bold text-foreground mb-3">FAQs</h2>
      <div className="space-y-0">
        {filtered.map((faq, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={i} className="border-b border-border">
              <button
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="flex w-full items-center justify-between py-3.5 text-left"
              >
                <span className="text-sm font-semibold text-foreground pr-4">{faq.question}</span>
                {isOpen ? (
                  <Minus className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="text-xs text-muted-foreground leading-relaxed pb-3.5">
                      {faq.answer}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">No matching questions found</p>
        )}
      </div>

      {/* Send a message CTA */}
      <div className="mt-8 text-center">
        <p className="text-sm font-bold text-foreground mb-3">Still stuck? Help us a mail away</p>
        <Button onClick={onOpenChat} className="h-12 px-8 text-sm font-bold rounded-full">
          Send a message
        </Button>
      </div>
    </div>
  );
}

/* ── Chat Support View ── */
type ChatMessage = {
  id: string;
  content: string;
  sender: "user" | "support";
  time: string;
  read?: boolean;
};

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  content:
    "Welcome to Habal chat support dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  sender: "support",
  time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
};

function ChatSupportView({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      content: text,
      sender: "user",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      read: true,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInput("");

    // Simulate support reply
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          content: "Thank you for reaching out! A support agent will get back to you shortly. In the meantime, you can check our FAQs for quick answers.",
          sender: "support",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-56px-52px-2rem)]">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 pb-3 border-b border-border mb-3">
        <button onClick={onBack} className="text-primary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-base font-bold text-foreground">Habal Chat Support</h2>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pb-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                msg.sender === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-secondary text-foreground rounded-bl-sm"
              }`}
            >
              <p className="text-sm leading-relaxed">{msg.content}</p>
              <div className={`flex items-center gap-1 mt-1 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                <span className={`text-[10px] ${msg.sender === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {msg.time}
                </span>
                {msg.sender === "user" && (
                  <CheckCheck className={`h-3 w-3 ${msg.read ? "text-primary-foreground/80" : "text-primary-foreground/40"}`} />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input bar */}
      <div className="shrink-0 flex items-center gap-2 pt-2 border-t border-border">
        <button className="shrink-0 text-muted-foreground">
          <SmilePlus className="h-5 w-5" />
        </button>
        <div className="flex-1 rounded-full bg-primary px-4 py-2.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a message..."
            className="w-full bg-transparent text-sm text-primary-foreground placeholder:text-primary-foreground/50 outline-none"
          />
        </div>
        <button className="shrink-0 text-muted-foreground">
          <Plus className="h-5 w-5" />
        </button>
        <button
          onClick={sendMessage}
          className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
