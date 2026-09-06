import { createContext, useContext, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";

import { getAccessToken } from "@/api/client";
import { API_BASE } from "@/api/config";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { useFeatureEnabled } from "@/context/FeatureFlagsContext";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const queryClient = useQueryClient();
  const { sessionReady } = useCustomerAuth();
  const liveTracking = useFeatureEnabled("liveTracking");
  
  const socketRef = useRef(null);
  // ref-count rooms to prevent duplicate joins/leaves
  const activeRooms = useRef(new Map());

  useEffect(() => {
    if (!sessionReady || !liveTracking) return;

    const token = getAccessToken();
    if (!token) return;

    const socket = io(API_BASE, {
      auth: { token },
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      // Re-join any active rooms if the socket reconnects
      for (const orderId of activeRooms.current.keys()) {
        socket.emit("join_order", { orderId, token: getAccessToken() });
      }
    });
    
    socket.on("reconnect", () => {
      for (const orderId of activeRooms.current.keys()) {
        socket.emit("join_order", { orderId, token: getAccessToken() });
      }
    });

    socket.on("order_status_updated", (payload) => {
      const orderId = payload?.orderId;
      if (!orderId) return;

      queryClient.setQueryData(["orderTracking", orderId], (old) => {
        if (!old) return old;
        return {
          ...old,
          status: payload.status,
          timeline: (old.timeline ?? []).map((stage) =>
            stage.stage === payload.status
              ? { ...stage, completed: true, timestamp: payload.updatedAt ?? stage.timestamp }
              : stage,
          ),
        };
      });

      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    });

    socket.on("partner_location_updated", (payload) => {
      const orderId = payload?.orderId;
      if (!orderId) return;

      queryClient.setQueryData(["orderTracking", orderId], (old) =>
        old
          ? {
              ...old,
              deliveryPartner: { ...old.deliveryPartner, lat: payload.lat, lng: payload.lng },
            }
          : old,
      );
    });

    socket.on("veg_fleet_status_updated", (payload) => {
      const orderId = payload?.orderId;
      if (!orderId) return;
      queryClient.setQueryData(["vegFleetStatus", orderId], payload);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [queryClient, sessionReady, liveTracking]);

  const joinOrder = useCallback((orderId) => {
    if (!orderId) return;
    
    const count = activeRooms.current.get(orderId) || 0;
    activeRooms.current.set(orderId, count + 1);
    
    if (count === 0 && socketRef.current) {
      socketRef.current.emit("join_order", { orderId, token: getAccessToken() });
    }
  }, []);

  const leaveOrder = useCallback((orderId) => {
    if (!orderId) return;
    
    const count = activeRooms.current.get(orderId);
    if (!count) return;
    
    if (count === 1) {
      activeRooms.current.delete(orderId);
      // If the backend had a leave_order event, emit it. Since it doesn't, we 
      // just clear it from local tracking so reconnects don't re-join.
    } else {
      activeRooms.current.set(orderId, count - 1);
    }
  }, []);

  return (
    <SocketContext.Provider value={{ joinOrder, leaveOrder }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}
