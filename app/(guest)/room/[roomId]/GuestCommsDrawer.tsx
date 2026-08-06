"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Mic, Keyboard, Send, Loader2 } from "lucide-react";

interface GuestCommsDrawerProps {
  connectionStatus: "idle" | "connecting" | "live";
  messages: Array<{
    id: string;
    speaker: "responder" | "guest" | "system";
    text: string;
    translatedText?: string;
    createdAt: string;
  }>;
  onSendText: (text: string) => void;
  onSendVoice: (blob: Blob) => void;
  onSendDetail: (detailKey: string) => void;
  onDisconnect: () => void;
}

const QUICK_CHIPS = [
  { label: "Heavy Smoke 🔥", key: "heavy_smoke" },
  { label: "Door Blocked 🚪", key: "door_blocked" },
  { label: "Injured Person 🤕", key: "injured" },
  { label: "Multiple People 👥", key: "multiple_people" },
  { label: "Water Rising 🌊", key: "flood" },
];

export default function GuestCommsDrawer({
  connectionStatus,
  messages,
  onSendText,
  onSendVoice,
  onSendDetail,
  onDisconnect,
}: GuestCommsDrawerProps) {
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll transcript to bottom on new messages
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle PTT Timer
  useEffect(() => {
    if (isRecording) {
      recordTimerRef.current = setInterval(() => {
        setRecordTime((t) => t + 1);
      }, 100);
    } else {
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
      }
      setRecordTime(0);
    }

    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, [isRecording]);

  const handleStartRecording = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (typeof window === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Microphone capture requires secure context.");
      return;
    }

    try {
      setIsRecording(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size > 0) {
          onSendVoice(blob);
        }
      };

      recorder.start();
    } catch (err) {
      console.error("Microphone access error:", err);
      setIsRecording(false);
    }
  };

  const handleStopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const handleTextSubmit = () => {
    if (!typedText.trim()) return;
    onSendText(typedText.trim());
    setTypedText("");
  };

  const isLive = connectionStatus === "live";

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-[100] h-[42vh] bg-slate-950/95 border-t border-slate-900/60 shadow-[0_-16px_32px_rgba(0,0,0,0.8)] flex flex-col transition-transform duration-300 ease-in-out select-none backdrop-blur-xl ${
        isLive ? "translate-y-0" : "translate-y-full"
      }`}
    >
      {/* 1. Pulse Status Header */}
      <div className="h-12 border-b border-slate-900/60 px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-mono tracking-widest text-emerald-400 font-black uppercase">
            LIVE: Rescue Command Connected
          </span>
        </div>

        {/* Close Connection Button */}
        <button
          onClick={onDisconnect}
          className="h-9 w-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-400 active:scale-95 transition-all cursor-pointer"
          title="Disconnect Comms"
        >
          <X size={14} />
        </button>
      </div>

      {/* 2. Scrollable detail chips */}
      <div className="overflow-x-auto whitespace-nowrap flex gap-2 p-2 px-4 border-b border-slate-900/40 flex-shrink-0 scrollbar-none">
        {QUICK_CHIPS.map((chip) => (
          <button
            key={chip.key}
            onClick={() => onSendDetail(chip.label)}
            className="flex-shrink-0 h-10 px-4 bg-slate-900 active:bg-slate-800 border border-slate-800/80 rounded-xl text-[11px] font-mono font-bold text-slate-300 uppercase tracking-tight active:scale-[0.96] transition duration-150 flex items-center justify-center cursor-pointer"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* 3. Conversations Feed */}
      <div className="flex-grow overflow-y-auto p-4 space-y-3.5">
        {messages.map((msg) => {
          const isResponder = msg.speaker === "responder";
          if (msg.speaker === "system") {
            return (
              <div key={msg.id} className="text-center">
                <span className="inline-block px-2.5 py-1 bg-slate-900/60 border border-slate-900 text-[8px] font-mono text-slate-500 rounded uppercase">
                  {msg.text}
                </span>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex flex-col gap-1 max-w-[85%] ${
                isResponder ? "mr-auto items-start" : "ml-auto items-end"
              }`}
            >
              <span className="text-[8px] text-slate-500 font-mono uppercase tracking-wider font-bold">
                {isResponder ? "Crisis Command" : "Your SOS Link"}
              </span>

              <div
                className={`px-3.5 py-2 rounded-2xl border text-[11px] leading-relaxed transition-all ${
                  isResponder
                    ? "bg-slate-900 border-slate-800 text-slate-200"
                    : "bg-slate-950 border-slate-900 text-slate-200"
                }`}
              >
                <p className={isResponder ? "text-slate-200 font-sans font-medium" : "text-slate-300 font-mono italic"}>
                  {isResponder ? msg.text : `"${msg.text}"`}
                </p>

                {/* Subtitle translation */}
                {msg.translatedText && (
                  <div className="mt-1 pt-1.5 border-t border-slate-900/60 text-[10px]">
                    <span className="text-[8px] font-mono text-cyan-400 block uppercase font-bold tracking-tight mb-0.5">
                      [TRANSLATION]
                    </span>
                    <p className="font-semibold text-slate-300">
                      {msg.translatedText}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={transcriptEndRef} />
      </div>

      {/* PTT Recording Overlay Visuals */}
      {isRecording && (
        <div className="absolute inset-x-0 bottom-24 bg-slate-950/95 border-y border-slate-900/60 py-4 flex flex-col items-center justify-center gap-1.5 z-50 animate-fade-in backdrop-blur-md">
          <span className="text-[9px] font-mono font-bold text-red-500 tracking-[0.2em] animate-pulse">
            RECORDING DISTRESS AUDIO...
          </span>
          <div className="flex items-end gap-1 h-6">
            <div className="w-0.5 bg-red-500 rounded-full animate-bounce h-[50%]" style={{ animationDelay: "0.1s" }} />
            <div className="w-0.5 bg-red-500 rounded-full animate-bounce h-[90%]" style={{ animationDelay: "0.3s" }} />
            <div className="w-0.5 bg-red-500 rounded-full animate-bounce h-[30%]" style={{ animationDelay: "0.2s" }} />
            <div className="w-0.5 bg-red-500 rounded-full animate-bounce h-[70%]" style={{ animationDelay: "0.5s" }} />
            <div className="w-0.5 bg-red-500 rounded-full animate-bounce h-[45%]" style={{ animationDelay: "0.4s" }} />
          </div>
          <span className="text-[8px] text-slate-500 font-mono">
            Release to transmit ({(recordTime / 10).toFixed(1)}s)
          </span>
        </div>
      )}

      {/* 4. Controls Footer */}
      <div className="p-3 pb-6 border-t border-slate-900/60 bg-slate-950/80 backdrop-blur-sm flex-shrink-0 flex items-center justify-between gap-3">
        {/* Flanking Keyboard Toggle */}
        <button
          onClick={() => setShowKeyboard(!showKeyboard)}
          className={`h-12 w-12 rounded-xl flex items-center justify-center border transition-all duration-150 shrink-0 cursor-pointer ${
            showKeyboard
              ? "bg-cyan-950/80 border-cyan-500 text-cyan-400"
              : "bg-slate-900 border-slate-800 text-slate-400 active:bg-slate-850"
          }`}
        >
          <Keyboard size={20} />
        </button>

        {/* Center Input (PTT or Text) */}
        {showKeyboard ? (
          <div className="flex-grow flex items-center gap-2 relative">
            <input
              type="text"
              placeholder="Type translation fallback note..."
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
              className="flex-grow h-12 bg-slate-900 border border-slate-850 rounded-xl px-4 pr-12 text-xs text-slate-200 focus:outline-none focus:border-slate-700"
            />
            <button
              onClick={handleTextSubmit}
              disabled={!typedText.trim()}
              className="absolute right-1.5 h-9 w-9 bg-cyan-600 disabled:bg-slate-800 hover:bg-cyan-500 text-white rounded-lg flex items-center justify-center transition-colors disabled:text-slate-500 cursor-pointer"
            >
              <Send size={14} />
            </button>
          </div>
        ) : (
          <button
            onMouseDown={handleStartRecording}
            onMouseUp={handleStopRecording}
            onMouseLeave={handleStopRecording}
            onTouchStart={handleStartRecording}
            onTouchEnd={handleStopRecording}
            className={`flex-grow h-12 rounded-xl font-mono font-bold text-xs tracking-wider flex items-center justify-center gap-2 border transition-all duration-200 cursor-pointer ${
              isRecording
                ? "bg-red-950/80 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.15)] animate-pulse"
                : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 active:scale-[0.98]"
            }`}
          >
            <Mic size={16} />
            <span>{isRecording ? "RECORDING COMMS" : "HOLD TO TRANSMIT"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
