import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConnected(false);
      return;
    }

    const token = localStorage.getItem('token');
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:4000', {
      auth: { token },
      transports: ['polling'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: true,
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setConnected(true);
    });
    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });
    socket.on('reconnect', () => {
      console.log('Socket reconnected');
      setConnected(true);
    });
    socket.on('connect_error', (err) => {
      console.log('Socket connect error:', err.message);
      setConnected(false);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, socketRef }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);