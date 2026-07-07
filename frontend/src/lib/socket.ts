import { io } from "socket.io-client";
import { getClientId } from "./clientIdentity";

export const socket = io("http://localhost:3001", {
  auth: {
    clientId: getClientId(),
  },
});