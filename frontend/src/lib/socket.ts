import { io } from "socket.io-client";
import { SOCKET_BASE_URL } from "./backendUrl";
import { getClientId } from "./clientIdentity";

export const socket = io(SOCKET_BASE_URL, {
  auth: {
    clientId: getClientId(),
  },
});
