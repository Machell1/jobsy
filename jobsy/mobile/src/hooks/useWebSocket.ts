import { useCallback, useEffect, useRef, useState } from "react";
import * as SecureStore from "expo-secure-store";

const WS_URL =
  process.env.EXPO_PUBLIC_WS_URL ||
  (__DEV__ ? "ws://localhost:8000" : (() => { throw new Error("EXPO_PUBLIC_WS_URL must be set in production"); })());

interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  created_at: string;
  is_read: boolean;
}

export function useWebSocket(conversationId: string | null) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>();
  const reconnectAttempts = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const connect = useCallback(async () => {
    if (!conversationId) return;

    const token = await SecureStore.getItemAsync("access_token");
    if (!token) return;

    const url = `${WS_URL}/ws/${conversationId}?token=${token}`;
    const socket = new WebSocket(url);

    socket.onopen = () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;
    };

    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        const msg: ChatMessage = { ...parsed, is_read: parsed.is_read ?? false };
        setMessages((prev) => [...prev, msg]);
      } catch {
        // Ignore malformed messages
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      // Exponential backoff reconnect
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      reconnectAttempts.current++;
      reconnectTimeout.current = setTimeout(connect, delay);
    };

    socket.onerror = () => {
      socket.close();
    };

    ws.current = socket;
  }, [conversationId]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimeout.current);
      ws.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback(
    (content: string, type = "text") => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ content, type }));
      }
    },
    []
  );

  return { isConnected, messages, setMessages, sendMessage };
}
