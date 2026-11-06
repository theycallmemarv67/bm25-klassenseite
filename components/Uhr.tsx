'use client';

import { useEffect, useState } from 'react';
import { MODUS_NAMEN, szenenzeit, type Modus } from './Winter';

// Digitale Uhr der Szene (HH:MM, Doppelpunkt blinkt). Im Zeitraffer läuft sie mit.
export default function Uhr({ modus }: { modus: Modus }) {
  const [minuten, setMinuten] = useState<number | null>(null);

  useEffect(() => {
    setMinuten(szenenzeit);
    const neu = (e: Event) => setMinuten((e as CustomEvent<number>).detail);
    addEventListener('szenenzeit', neu);
    return () => removeEventListener('szenenzeit', neu);
  }, []);

  if (minuten === null) return null;
  const hh = String(Math.floor(minuten / 60) % 24).padStart(2, '0');
  const mm = String(Math.floor(minuten % 60)).padStart(2, '0');

  return (
    <div className="uhr" aria-label={`Uhrzeit ${hh}:${mm}, ${MODUS_NAMEN[modus]}`} role="timer">
      <span className="uhr-zeit" aria-hidden="true">
        {hh}
        <span className="uhr-punkt">:</span>
        {mm}
      </span>
      <small aria-hidden="true">{MODUS_NAMEN[modus]}</small>
    </div>
  );
}
