import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { useAgentControlStore } from "@/stores/agentControlStore";
import type { LLMEventsBatch, PolicyUpdate } from "@/types/agentControl";

const HIVE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

/**
 * WebSocket hook for real-time LLM events and policy updates.
 * Connects to the control WebSocket and handles event routing.
 */
export function useControlSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const addEvents = useAgentControlStore((state) => state.addEvents);
  const queryClient = useQueryClient();

  const connect = useCallback(() => {
    // Check existence, not connected state - prevents duplicate connections during connecting phase
    if (socketRef.current) return;

    const token = localStorage.getItem("token");

    socketRef.current = io(`${HIVE_URL}/v1/control/ws`, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ["websocket"],
      auth: {
        token: token,
      },
    });

    socketRef.current.on("connect", () => {
      setConnectionError(null);
      // 1-second delay before subscribing (matches Vue implementation)
      setTimeout(() => {
        socketRef.current?.emit("subscribe-llm-events", {});
      }, 1000);
    });

    socketRef.current.on("disconnect", () => {
      setIsConnected(false);
    });

    socketRef.current.on("connect_error", (error) => {
      setConnectionError(error.message);
    });

    // Handle all message types via unified 'message' event (matches backend)
    socketRef.current.on(
      "message",
      (data: LLMEventsBatch | PolicyUpdate | { type: string }) => {
        if ("type" in data && data.type === "subscribed") {
          // Subscription confirmed
          setIsConnected(true);
        } else if ("events" in data) {
          // LLMEventsBatch - add to events buffer
          addEvents((data as LLMEventsBatch).events);
        } else if ("policyId" in data) {
          // PolicyUpdate - invalidate budget queries
          queryClient.invalidateQueries({ queryKey: ["budgets"] });
        }
      }
    );
  }, [addEvents, queryClient]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return {
    connect,
    disconnect,
    isConnected,
    connectionError,
  };
}
