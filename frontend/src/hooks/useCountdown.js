import { useState, useEffect } from 'react';

export function useCountdown(endsAt) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!endsAt) return;

    const tick = () => {
      const diff = new Date(endsAt) - new Date();
      if (diff <= 0) { setTimeLeft(0); return; }
      setTimeLeft(diff);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (timeLeft === null) return null;
  if (timeLeft <= 0) return { hours: 0, minutes: 0, seconds: 0, expired: true, display: '00:00:00' };

  const hours = Math.floor(timeLeft / 3600000);
  const minutes = Math.floor((timeLeft % 3600000) / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  const display = [hours, minutes, seconds].map(n => String(n).padStart(2, '0')).join(':');

  return { hours, minutes, seconds, expired: false, display, ms: timeLeft };
}
