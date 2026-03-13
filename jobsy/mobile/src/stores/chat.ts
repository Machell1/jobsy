import { create } from "zustand";
import { StreamChat } from "stream-chat";

import { getStreamToken } from "@/api/stream";

interface ChatState {
  client: StreamChat | null;
  isReady: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  client: null,
  isReady: false,
  error: null,

  initialize: async () => {
    if (get().client) return;

    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        set({ error: null });
        const { token, api_key, user_id } = await getStreamToken();
        const client = StreamChat.getInstance(api_key);

        await client.connectUser({ id: user_id }, token);

        set({ client, isReady: true, error: null });
        return;
      } catch (error) {
        attempt++;
        console.error(`Stream Chat init attempt ${attempt} failed:`, error);
        if (attempt >= maxRetries) {
          set({ error: "Failed to connect to chat. Please try again later." });
          return;
        }
        // Exponential backoff: 1s, 2s, 4s
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      }
    }
  },

  disconnect: async () => {
    const { client } = get();
    if (client) {
      await client.disconnectUser();
      set({ client: null, isReady: false, error: null });
    }
  },
}));
