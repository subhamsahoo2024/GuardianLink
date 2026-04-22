import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type QueryConstraint,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { firestoreCollections } from "@/lib/firebase-schema";
import {
  Broadcast,
  DangerZone,
  Incident,
  GuestPresence,
} from "@/lib/staff/types";

function mapDocs<T extends { id: string }>(snapshot: { docs: Array<{ id: string; data: () => unknown }> }) {
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<T, "id">),
  })) as T[];
}

export function listenGuestStatusStream(
  callback: (guests: GuestPresence[]) => void,
  hotelId?: string,
): Unsubscribe {
  const constraints: QueryConstraint[] = [orderBy("updatedAt", "desc"), limit(200)];
  if (hotelId) {
    constraints.unshift(where("hotelId", "==", hotelId));
  }

  return onSnapshot(
    query(collection(db, firestoreCollections.guests), ...constraints),
    (snapshot) => callback(mapDocs<GuestPresence>(snapshot as never)),
  );
}

export function listenIncidentFeedStream(
  callback: (incidents: Incident[]) => void,
  hotelId?: string,
): Unsubscribe {
  const constraints: QueryConstraint[] = [orderBy("updatedAt", "desc"), limit(100)];
  if (hotelId) {
    constraints.unshift(where("hotelId", "==", hotelId));
  }

  return onSnapshot(
    query(collection(db, firestoreCollections.incidents), ...constraints),
    (snapshot) => callback(mapDocs<Incident>(snapshot as never)),
  );
}

export function listenDangerZoneUpdatesStream(
  callback: (zones: DangerZone[]) => void,
  hotelId?: string,
): Unsubscribe {
  const constraints: QueryConstraint[] = [orderBy("updatedAt", "desc")];
  if (hotelId) {
    constraints.unshift(where("hotelId", "==", hotelId));
  }

  return onSnapshot(
    query(collection(db, firestoreCollections.dangerZones), ...constraints),
    (snapshot) => callback(mapDocs<DangerZone>(snapshot as never)),
  );
}

export function listenBroadcastAlertsStream(
  callback: (broadcasts: Broadcast[]) => void,
  hotelId?: string,
): Unsubscribe {
  const constraints: QueryConstraint[] = [orderBy("createdAt", "desc"), limit(100)];
  if (hotelId) {
    constraints.unshift(where("hotelId", "==", hotelId));
  }

  return onSnapshot(
    query(collection(db, firestoreCollections.broadcasts), ...constraints),
    (snapshot) => callback(mapDocs<Broadcast>(snapshot as never)),
  );
}
