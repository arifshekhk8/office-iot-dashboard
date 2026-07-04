import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { Alert, Snapshot } from '@office/shared';

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected';

interface UseSnapshotResult {
  snapshot: Snapshot | null;
  connection: ConnectionState;
  /** Alerts that newly appeared, kept for ~4s so the panel can flash them. */
  justArrived: Set<string>;
  toggleDevice: (id: string) => void;
}

/**
 * Single Socket.IO connection for the whole app: the dashboard is a thin
 * client that renders whatever `snapshot` the backend last pushed — it never
 * computes power totals or alerts itself.
 */
export function useSnapshot(): UseSnapshotResult {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [connection, setConnection] = useState<ConnectionState>('connecting');
  const [justArrived, setJustArrived] = useState<Set<string>>(new Set());
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(BACKEND_URL, { reconnection: true, reconnectionDelay: 800 });
    socketRef.current = socket;

    socket.on('connect', () => setConnection('connected'));
    socket.on('disconnect', () => setConnection('disconnected'));
    socket.on('connect_error', () => setConnection('disconnected'));
    socket.on('snapshot', (data: Snapshot) => setSnapshot(data));
    socket.on('alert:new', (alert: Alert) => {
      setJustArrived((prev) => new Set(prev).add(alert.id));
      setTimeout(() => {
        setJustArrived((prev) => {
          const next = new Set(prev);
          next.delete(alert.id);
          return next;
        });
      }, 4000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const toggleDevice = (id: string) => {
    fetch(`${BACKEND_URL}/api/devices/${id}/toggle`, { method: 'POST' }).catch(() => {
      /* the next snapshot push will resync the UI either way */
    });
  };

  return { snapshot, connection, justArrived, toggleDevice };
}
