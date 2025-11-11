import React from 'react';

export default function SeatGrid({ roomName, seatId }) {
  return (
    <div className="w-full p-3 border rounded bg-white">
      <div className="text-sm text-slate-500">Room</div>
      <div className="text-lg font-medium">{roomName || '—'}</div>
      <div className="mt-2 text-sm">Assigned Seat:</div>
      <div className="text-2xl font-bold text-sky-600">{seatId || 'Not assigned'}</div>
      <div className="mt-3 text-xs text-slate-500">Full room map rendering will appear here in the next iteration.</div>
    </div>
  );
}
