/**
 * Toast (client component)
 * - Minimal transient message popup with auto-dismiss.
 */
'use client';

import { useEffect } from 'react';

export default function Toast({
  message,
  onClose,
  duration = 4000,
}: {
  message: string;
  onClose: () => void;
  duration?: number;
}) {
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(onClose, duration);
    return () => clearTimeout(id);
  }, [message, duration, onClose]);

  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed bottom-4 right-4 z-50 rounded bg-gray-900 text-white px-4 py-2 shadow-lg"
    >
      <div className="flex items-center gap-3">
        <span className="text-sm">{message}</span>
        <button
          aria-label="Close"
          className="text-xs opacity-80 hover:opacity-100"
          onClick={onClose}
        >
          ×
        </button>
      </div>
    </div>
  );
}
