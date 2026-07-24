"use client";

import { AlertTriangle, MapPinned, Mic, Video, Camera, Loader2 } from "lucide-react";
import { useRoomContext } from "./RoomContext";
import { useEffect, useState, useRef } from "react";
// Ensure this path matches your actual Firebase config file
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

function DemoExitMap() {
  return (
    <div className="absolute inset-0 bg-[#101522] overflow-hidden">
      <svg viewBox="0 0 600 320" className="absolute inset-0 h-full w-full object-cover">
        <defs>
          <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(148,163,184,0.16)" strokeWidth="1" />
          </pattern>
          <linearGradient id="routeGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="#101522" />
        <rect width="100%" height="100%" fill="url(#grid)" />

        <rect x="40" y="38" width="148" height="92" rx="16" fill="#182035" stroke="#334155" />
        <rect x="214" y="38" width="160" height="92" rx="16" fill="#182035" stroke="#334155" />
        <rect x="400" y="38" width="160" height="92" rx="16" fill="#182035" stroke="#334155" />
        <rect x="40" y="164" width="148" height="110" rx="16" fill="#182035" stroke="#334155" />
        <rect x="214" y="164" width="160" height="110" rx="16" fill="#182035" stroke="#334155" />
        <rect x="400" y="164" width="160" height="110" rx="16" fill="#182035" stroke="#334155" />

        <text x="64" y="76" fill="#e8eaf0" fontSize="16" fontWeight="600">Guest room</text>
        <text x="238" y="76" fill="#e8eaf0" fontSize="16" fontWeight="600">Hallway</text>
        <text x="428" y="76" fill="#e8eaf0" fontSize="16" fontWeight="600">Stairwell B</text>
        <text x="64" y="204" fill="#e8eaf0" fontSize="16" fontWeight="600">Smoke area</text>
        <text x="238" y="204" fill="#e8eaf0" fontSize="16" fontWeight="600">Safe corridor</text>
        <text x="428" y="204" fill="#e8eaf0" fontSize="16" fontWeight="600">Exit door</text>

        <circle cx="112" cy="110" r="10" fill="#ef4444" />
        <circle cx="490" cy="95" r="10" fill="#10b981" />

        <path d="M 122 110 L 214 110 L 214 165 L 400 165 L 400 190 L 490 190 L 490 95" fill="none" stroke="url(#routeGlow)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 122 110 L 214 110 L 214 165 L 400 165 L 400 190 L 490 190 L 490 95" fill="none" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />

        <polygon points="490,95 474,89 476,101" fill="#34d399" />
        <polygon points="490,95 504,88 502,100" fill="#34d399" />
        <polygon points="490,95 482,109 494,108" fill="#34d399" />
      </svg>
    </div>
  );
}

export default function GuestRoomShell() {
  const { roomId, status, setStatus } = useRoomContext();
  const guestDemoMode = process.env.NEXT_PUBLIC_GUEST_DEMO_MODE !== "false";

  const [pulse, setPulse] = useState(true);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(p => !p);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleMediaCapture = async (type: 'video' | 'audio') => {
    try {
      if (type === 'video') setIsRecordingVideo(true);
      if (type === 'audio') setIsRecordingAudio(true);

      const constraints = type === 'video' ? { video: true, audio: true } : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Leaving MIME type blank lets the mobile browser pick its safest default (e.g. mp4 on iOS)
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        setIsRecordingVideo(false);
        setIsRecordingAudio(false);
        setIsUploading(true);

        // Turn off camera/mic hardware light
        stream.getTracks().forEach(track => track.stop());

        const blob = new Blob(chunksRef.current, { type: type === 'video' ? 'video/mp4' : 'audio/webm' });

        try {
          // 1. Upload to Cloudinary Unsigned
          const formData = new FormData();
          formData.append('file', blob);
          formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '');

          const uploadRes = await fetch(
            `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload`,
            { method: 'POST', body: formData }
          );

          const uploadData = await uploadRes.json();

          if (uploadData.secure_url) {
            // 2. Save to Firestore
            await addDoc(collection(db, 'incidents'), {
              roomId: roomId,
              mediaUrl: uploadData.secure_url,
              mediaType: type,
              status: 'needs_triage',
              timestamp: new Date().toISOString()
            });
            console.log("Media successfully saved and logged.");
          }
        } catch (error) {
          console.error("Upload/Database Error:", error);
        } finally {
          setIsUploading(false);
        }
      };

      mediaRecorder.start();

      // Auto-stop: 5s for video, 10s for audio to preserve bandwidth
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }, type === 'video' ? 5000 : 10000);

    } catch (err) {
      console.error("Error accessing media devices.", err);
      setIsRecordingVideo(false);
      setIsRecordingAudio(false);
      alert("Camera/Microphone access is required for SOS capture.");
    }
  };

  const statusColor = status === "needs-help" ? "bg-red-500" : status === "evacuated" ? "bg-green-500" : "bg-yellow-500";

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-black text-white select-none [-webkit-tap-highlight-color:transparent] overflow-hidden relative">
      {/* Floating Header */}
      <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-center pt-12 pb-4 bg-black/60 backdrop-blur-md">
        <div className="flex items-center gap-3 bg-neutral-900/80 px-5 py-2.5 rounded-full border border-white/10 shadow-lg">
          <span className="text-xl font-bold tracking-tight">Room {roomId}</span>
          <span className={`h-3 w-3 rounded-full ${statusColor} animate-pulse shadow-[0_0_8px_currentColor]`} />
        </div>
      </header>

      {/* Full-bleed Map Body */}
      <main className="flex-1 relative w-full h-full">
        {guestDemoMode ? (
          <DemoExitMap />
        ) : (
          <div className="absolute inset-0 bg-neutral-900 flex flex-col items-center justify-center gap-4">
            <MapPinned className="h-12 w-12 text-neutral-500" />
            <span className="text-neutral-500 font-medium">Map Feed Unavailable</span>
          </div>
        )}

        {/* Warning Banner Overlay */}
        <div
          className={`absolute top-28 left-4 right-4 z-40 bg-red-600/95 backdrop-blur-md rounded-2xl p-5 shadow-2xl border-2 border-red-500/50 flex flex-col sm:flex-row items-center gap-4 transition-opacity duration-300 ${pulse ? 'opacity-100' : 'opacity-85'}`}
        >
          <AlertTriangle className="h-10 w-10 text-white shrink-0" strokeWidth={2.5} />
          <span className="font-black text-white uppercase tracking-wider text-xl leading-snug text-center sm:text-left">
            ⚠️ STAY IN ROOM.<br className="hidden sm:block" /> DO NOT OPEN DOOR.
          </span>
        </div>
      </main>

      {/* Stacked Bottom Action Sheet */}
      <footer className="absolute bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-t border-white/10 p-4 pb-8 shadow-[0_-16px_32px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col gap-3 max-w-md mx-auto">

          {/* Primary Row: SOS Button */}
          <button
            onClick={() => setStatus("needs-help")}
            className={`w-full flex items-center justify-center min-h-[80px] rounded-[1.5rem] text-white font-black text-3xl transition-all active:scale-95 shadow-xl border-2 ${status === "needs-help"
                ? "bg-red-700 border-red-500 ring-4 ring-red-500/30"
                : "bg-red-600 active:bg-red-700 border-red-500/50"
              }`}
          >
            SOS
          </button>

          {/* Secondary Row: Quick Capture & Status */}
          <div className="flex items-center justify-between gap-3">

            {/* Video Button */}
            <button
              onClick={() => handleMediaCapture('video')}
              disabled={isRecordingAudio || isUploading}
              className={`flex-shrink-0 h-[72px] w-[72px] flex items-center justify-center rounded-[1.5rem] text-white transition-all active:scale-95 border-2 border-white/10 shadow-xl ${isRecordingVideo ? 'bg-red-600 animate-pulse border-red-400' : 'bg-neutral-800 active:bg-neutral-700'
                }`}
            >
              {isUploading && !isRecordingVideo && !isRecordingAudio ? <Loader2 className="h-8 w-8 animate-spin text-neutral-400" /> : <Camera className="h-8 w-8" strokeWidth={2.5} />}
            </button>

            {/* Audio Button */}
            <button
              onClick={() => handleMediaCapture('audio')}
              disabled={isRecordingVideo || isUploading}
              className={`flex-shrink-0 h-[72px] w-[72px] flex items-center justify-center rounded-[1.5rem] text-white transition-all active:scale-95 border-2 border-white/10 shadow-xl ${isRecordingAudio ? 'bg-red-600 animate-pulse border-red-400' : 'bg-neutral-800 active:bg-neutral-700'
                }`}
            >
              {isUploading && !isRecordingVideo && !isRecordingAudio ? <Loader2 className="h-8 w-8 animate-spin text-neutral-400" /> : <Mic className="h-8 w-8" strokeWidth={2.5} />}
            </button>

            {/* Safe Button */}
            <button
              onClick={() => setStatus("evacuated")}
              className={`flex-1 flex flex-col items-center justify-center min-h-[72px] rounded-[1.5rem] text-white font-black text-xl transition-all active:scale-95 shadow-xl border-2 ${status === "evacuated"
                  ? "bg-emerald-700 border-emerald-500 ring-4 ring-emerald-500/30"
                  : "bg-emerald-600 active:bg-emerald-700 border-emerald-500/50"
                }`}
            >
              I AM SAFE
            </button>
          </div>

        </div>
      </footer>
    </div>
  );
}