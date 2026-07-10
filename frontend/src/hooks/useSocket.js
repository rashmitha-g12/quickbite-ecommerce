/**
 * hooks/useSocket.js
 * Returns a connected socket.io-client instance.
 * Automatically reconnects when the token changes.
 */

import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";

const useSocket = () => {
  const { userInfo } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!userInfo?.token) return;

    const socket = io(
      import.meta.env.VITE_SOCKET_URL || "http://localhost:5000",
      {
        auth: { token: userInfo.token },
        transports: ["websocket"],
        reconnectionAttempts: 5,
      }
    );

    socket.on("connect", () =>
      console.log("🔌 Socket connected:", socket.id)
    );
    socket.on("connect_error", (err) =>
      console.warn("Socket error:", err.message)
    );

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userInfo?.token]);

  return socketRef.current;
};

export default useSocket;
