"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

type GuestStatus = "awaiting" | "needs-help" | "evacuated";

interface RoomContextValue {
  roomId: string;
  floor: number;
  hotelName: string;
  status: GuestStatus;
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
  const [status, setStatus] = useState<GuestStatus>("awaiting");

  const value = useMemo(
    () => ({
      roomId,
      floor: deriveFloor(roomId),
      hotelName,
      status,
      setStatus,
    }),
    [hotelName, roomId, status],
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

export type { GuestStatus };
