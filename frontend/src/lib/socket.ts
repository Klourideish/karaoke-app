import { io } from "socket.io-client";
import { API_BASE_URL } from "./backendUrl";
import { getClientId } from "./clientIdentity";

export const socket = io(API_BASE_URL, {
  auth: {
    clientId: getClientId(),
  },
});
