import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

export function connectRideSocket({ onRideUpdate, onNearbyDrivers }) {
  const base = (import.meta.env.VITE_WS_URL || "http://localhost:8080").replace(/\/$/, "");
  const client = new Client({
    webSocketFactory: () => new SockJS(`${base}/ws`),
    reconnectDelay: 5000
  });
  client.onConnect = () => {
    if (onNearbyDrivers) {
      client.subscribe("/topic/drivers/nearby", (msg) => onNearbyDrivers(JSON.parse(msg.body)));
    }
    if (onRideUpdate) {
      client.subscribe("/topic/rides", (msg) => onRideUpdate(JSON.parse(msg.body)));
    }
  };
  client.activate();
  return () => client.deactivate();
}
