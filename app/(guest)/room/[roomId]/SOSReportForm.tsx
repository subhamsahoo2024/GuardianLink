"use client";

import React, { useMemo, useRef, useState } from "react";
import { Mic, Paperclip, Send, Square, Video } from "lucide-react";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import Badge from "@/app/_components/ui/Badge";
import Button from "@/app/_components/ui/Button";
import Card from "@/app/_components/ui/Card";
import { storage } from "@/lib/firebase";
import { useRoomContext } from "./RoomContext";

type CaptureMode = "audio" | "video";

function pickSupportedMimeType(mode: CaptureMode): string | undefined {
  const candidates =
    mode === "audio"
      ? ["audio/webm;codecs=opus", "audio/webm"]
      : [
          "video/webm;codecs=vp9,opus",
          "video/webm;codecs=vp8,opus",
          "video/webm",
        ];

  return candidates.find((mime) => MediaRecorder.isTypeSupported(mime));
}

export default function SOSReportForm() {
  const { roomId, floor, hotelName, setStatus } = useRoomContext();
  const [mode, setMode] = useState<CaptureMode>("audio");
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mediaInfo, setMediaInfo] = useState<{
    mimeType: string;
    size: number;
  } | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const mediaBlobRef = useRef<Blob | null>(null);

  const mediaSizeLabel = useMemo(() => {
    if (!mediaInfo) return "No recording attached";
    const kiloBytes = Math.max(1, Math.round(mediaInfo.size / 1024));
    return `${mediaInfo.mimeType} · ${kiloBytes} KB`;
  }, [mediaInfo]);

  async function cleanupMedia() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
  }

  async function uploadMediaToFirebase(blob: Blob) {
    const extension = blob.type.includes("video") ? "webm" : "ogg";
    const timestamp = Date.now();
    const filename = `${timestamp}.${extension}`;
    const storagePath = `sos_reports/${roomId}/${filename}`;
    const mediaRef = ref(storage, storagePath);

    await uploadBytes(mediaRef, blob, {
      contentType: blob.type || "application/octet-stream",
      customMetadata: {
        roomId,
        hotelName,
        floor: String(floor),
      },
    });

    const downloadURL = await getDownloadURL(mediaRef);

    return {
      storagePath,
      downloadURL,
      mimeType: blob.type || "application/octet-stream",
      size: blob.size,
    };
  }

  async function startRecording() {
    setError(null);
    setSuccess(null);

    if (typeof window === "undefined" || !("MediaRecorder" in window)) {
      setError("This browser does not support media recording.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: mode === "video",
      });

      const mimeType = pickSupportedMimeType(mode);
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      mediaBlobRef.current = null;
      setMediaInfo(null);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "application/octet-stream",
        });
        mediaBlobRef.current = blob;
        setMediaInfo({
          mimeType: blob.type || "application/octet-stream",
          size: blob.size,
        });
        await cleanupMedia();
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      setError(
        "Unable to start recording. Please allow microphone/camera access.",
      );
      await cleanupMedia();
    }
  }

  async function stopRecording() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      await cleanupMedia();
      return;
    }

    recorder.stop();
  }

  async function submitReport() {
    setError(null);
    setSuccess(null);

    if (!message.trim() && !mediaBlobRef.current) {
      setError("Add a text note or attach a recording before sending SOS.");
      return;
    }

    setIsSubmitting(true);

    try {
      const media = mediaBlobRef.current
        ? await uploadMediaToFirebase(mediaBlobRef.current)
        : undefined;

      const response = await fetch("/api/sos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomId,
          floor,
          hotelName,
          message: message.trim(),
          media,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit SOS report");
      }

      setStatus("needs-help");
      setMessage("");
      mediaBlobRef.current = null;
      setMediaInfo(null);
      setSuccess(
        media
          ? "SOS report and media evidence sent to command center."
          : "SOS report sent to command center.",
      );
    } catch {
      setError("Unable to send SOS report right now. Please retry.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card variant="glass" hover>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-text-primary">
            SOS report form
          </h3>
          <p className="text-sm text-text-secondary">
            Send text and optional audio/video evidence to responders.
          </p>
        </div>
        <Badge variant="danger" dot pulse>
          Live
        </Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant={mode === "audio" ? "warning" : "ghost"}
          size="sm"
          icon={<Mic size={14} />}
          onClick={() => setMode("audio")}
          disabled={isRecording || isSubmitting}
        >
          Audio
        </Button>
        <Button
          variant={mode === "video" ? "warning" : "ghost"}
          size="sm"
          icon={<Video size={14} />}
          onClick={() => setMode("video")}
          disabled={isRecording || isSubmitting}
        >
          Video
        </Button>
      </div>

      <label
        className="mt-4 block text-sm font-semibold text-text-secondary"
        htmlFor="sos-message"
      >
        Situation summary
      </label>
      <textarea
        id="sos-message"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Example: Thick smoke outside door, two adults and one child in room"
        rows={4}
        className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-brand/40"
      />

      <div className="mt-4 rounded-xl border border-border bg-surface/70 px-3 py-2 text-sm text-text-secondary">
        <div className="flex items-center gap-2">
          <Paperclip size={14} />
          {mediaSizeLabel}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {!isRecording ? (
          <Button
            variant="danger"
            size="md"
            icon={mode === "audio" ? <Mic size={16} /> : <Video size={16} />}
            onClick={startRecording}
            disabled={isSubmitting}
          >
            Record {mode}
          </Button>
        ) : (
          <Button
            variant="warning"
            size="md"
            icon={<Square size={16} />}
            onClick={stopRecording}
          >
            Stop recording
          </Button>
        )}

        <Button
          variant="primary"
          size="md"
          icon={<Send size={16} />}
          onClick={submitReport}
          loading={isSubmitting}
          disabled={isRecording}
        >
          Send SOS report
        </Button>
      </div>

      {error && (
        <p className="mt-4 text-sm font-semibold text-danger-light">{error}</p>
      )}
      {success && (
        <p className="mt-4 text-sm font-semibold text-safe-light">{success}</p>
      )}
    </Card>
  );
}
