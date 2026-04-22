import GuestRoomShell from "./GuestRoomShell";
import { RoomContextProvider } from "./RoomContext";

type GuestRoomPageProps = {
  params: Promise<{ roomId: string }>;
};

export default async function GuestRoomPage({ params }: GuestRoomPageProps) {
  const { roomId } = await params;

  return (
    <RoomContextProvider roomId={roomId}>
      <GuestRoomShell />
    </RoomContextProvider>
  );
}
