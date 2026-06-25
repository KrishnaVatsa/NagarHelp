import { io } from 'socket.io-client';
import { auth } from './firebase';

let socket = null;

export const initSocket = async () => {
  if (socket?.connected) return socket;

  // Get fresh Firebase ID token for Socket auth
  let token = null;
  try {
    if (auth.currentUser) {
      token = await auth.currentUser.getIdToken();
    }
  } catch (e) {
    console.error('Failed to get Firebase token for socket:', e);
  }

  const socketUrl = import.meta.env.VITE_SOCKET_URL || '';
  socket = io(socketUrl, {
    auth: { token },
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connect error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const updateLocation = (longitude, latitude) => {
  if (socket?.connected) {
    socket.emit('update_location', { longitude, latitude });
  }
};

export const broadcastSOS = (sosId) => {
  if (socket?.connected) {
    socket.emit('broadcast_sos', { sosId });
  }
};

export const acceptSOS = (sosId) => {
  if (socket?.connected) {
    socket.emit('accept_sos', { sosId });
  }
};

export const sendMessage = (sosId, message, responderId = null) => {
  if (socket?.connected) {
    socket.emit('send_message', { sosId, message, responderId });
  }
};

export const shareLiveLocation = (sosId, longitude, latitude, responderId = null) => {
  if (socket?.connected) {
    socket.emit('share_live_location', { sosId, longitude, latitude, responderId });
  }
};
