export type FcmAudience = "all" | "staff" | "guests";

export interface FcmAlertInput {
  title: string;
  body: string;
  audience?: FcmAudience;
  hotelId?: string;
  roomId?: string;
  floor?: number;
  sound?: string;
}

export interface FcmPayload {
  notification: {
    title: string;
    body: string;
  };
  data: Record<string, string>;
  android: {
    priority: "high";
    notification: {
      sound: string;
      channelId: string;
      defaultSound: boolean;
      defaultVibrateTimings: boolean;
    };
  };
  webpush: {
    headers: {
      Urgency: "high";
    };
    notification: {
      icon: string;
      badge: string;
      tag: string;
      renotify: boolean;
      requireInteraction: boolean;
    };
  };
}

export function buildStaffAlertPayload(input: FcmAlertInput): FcmPayload {
  const sound = input.sound || "crisis_alert";

  return {
    notification: {
      title: input.title,
      body: input.body,
    },
    data: {
      audience: input.audience || "all",
      hotelId: input.hotelId || "",
      roomId: input.roomId || "",
      floor: input.floor ? String(input.floor) : "",
      sound,
      category: "guardianlink-alert",
    },
    android: {
      priority: "high",
      notification: {
        sound,
        channelId: "guardianlink-crisis",
        defaultSound: false,
        defaultVibrateTimings: true,
      },
    },
    webpush: {
      headers: {
        Urgency: "high",
      },
      notification: {
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: "guardianlink-crisis",
        renotify: true,
        requireInteraction: true,
      },
    },
  };
}

export function buildNotificationSummary(input: FcmAlertInput) {
  return {
    title: input.title,
    body: input.body,
    audience: input.audience || "all",
    sound: input.sound || "crisis_alert",
  };
}
