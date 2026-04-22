"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type GuestStatus = "awaiting" | "needs-help" | "evacuated";
type StatusSyncState = "idle" | "syncing" | "live" | "error";

interface RoomContextValue {
  roomId: string;
  floor: number;
  hotelName: string;
  status: GuestStatus;
  syncState: StatusSyncState;
  setStatus: (status: GuestStatus) => void;
}

const RoomContext = createContext<RoomContextValue | null>(null);

function deriveFloor(roomId: string): number {
  const firstDigit = Number.parseInt(roomId.charAt(0), 10);
  if (Number.isNaN(firstDigit) || firstDigit <= 0) {
    return 1;
  }
  return firstDigit;
}

function isGuestStatus(value: unknown): value is GuestStatus {
  return (
    value === "awaiting" || value === "needs-help" || value === "evacuated"
  );
}

interface RoomContextProviderProps {
  roomId: string;
  hotelName?: string;
  children: React.ReactNode;
}

export function RoomContextProvider({
  roomId,
  hotelName = "GuardianLink Demo Hotel",
  children,
}: RoomContextProviderProps) {
  const [status, setStatusState] = useState<GuestStatus>("awaiting");
  const [syncState, setSyncState] = useState<StatusSyncState>("idle");
  const floor = deriveFloor(roomId);
  const statusRef = useRef<GuestStatus>("awaiting");

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    const guestRef = doc(db, "guests", roomId);
    let unsubscribe = () => {};

    async function initializeSync() {
      setSyncState("syncing");

      await setDoc(
        guestRef,
        {
          roomId,
          floor,
          hotelName,
          status: statusRef.current,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      unsubscribe = onSnapshot(
        guestRef,
        (snapshot) => {
          const incomingStatus = snapshot.data()?.status;

          if (
            isGuestStatus(incomingStatus) &&
            incomingStatus !== statusRef.current
          ) {
            statusRef.current = incomingStatus;
            setStatusState(incomingStatus);
          }

          setSyncState("live");
        },
        () => {
          setSyncState("error");
        },
      );
    }

    initializeSync().catch(() => {
      setSyncState("error");
    });

    return () => {
      unsubscribe();
    };
  }, [floor, hotelName, roomId]);

  const setStatus = useCallback(
    (nextStatus: GuestStatus) => {
      statusRef.current = nextStatus;
      setStatusState(nextStatus);
      setSyncState("syncing");

      const guestRef = doc(db, "guests", roomId);

      setDoc(
        guestRef,
        {
          roomId,
          floor,
          hotelName,
          status: nextStatus,
          updatedAt: serverTimestamp(),
          source: "guest-pwa",
        },
        { merge: true },
      )
        .then(() => {
          setSyncState("live");
        })
        .catch(() => {
          setSyncState("error");
        });
    },
    [floor, hotelName, roomId],
  );

  const value = useMemo(
    () => ({
      roomId,
      floor,
      hotelName,
      status,
      syncState,
      setStatus,
    }),
    [floor, hotelName, roomId, status, syncState, setStatus],
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRoomContext() {
  const context = useContext(RoomContext);

  if (!context) {
    throw new Error("useRoomContext must be used within RoomContextProvider");
  }

  return context;
}

export type { GuestStatus, StatusSyncState };
