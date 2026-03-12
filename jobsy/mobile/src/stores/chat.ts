import { create } from "zustand";
import { StreamChat } from "stream-chat";

import { getStreamToken } from "@/api/stream";

interface ChatState {
  client: StreamChat | null;
  isReady: boolean;

  initialize: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  client: null,
  isReady: false,

  initialize: async () => {
    // Avoid re-initializing if already connected
    if (get().client) return;

    try {
      const { token, api_key, user_id } = await getStreamToken();
      const client = StreamChat.getInstance(api_key);

      await client.connectUser({ id: user_id }, token);

      set({ client, isReady: true });
    } catch (error) {
      console.error("Failed to initialize Stream Chat:", error);
    }
  },

  disconnect: async () => {
    const { client } = get();
    if (client) {
      await client.disconnectUser();
      set({ client: null, isReady: false });
    }
  },
}));
