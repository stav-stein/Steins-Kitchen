import { useEffect, useState } from 'react';
import { Icon } from './Icon';

interface ToastProps {
  message: string;
  onDone: () => void;
  duration?: number;
}

export function Toast({ message, onDone, duration = 3000 }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); setTimeout(onDone, 300); }, duration);
    return () => clearTimeout(t);
  }, [duration, onDone]);

  return (
    <div
      className={`fixed bottom-28 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2
        bg-inverse-surface text-inverse-on-surface px-5 py-3 rounded-full shadow-editorial
        transition-all duration-300 whitespace-nowrap
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
    >
      <Icon name="check_circle" filled className="text-primary-fixed" size={18} />
      <span className="font-label text-sm font-medium">{message}</span>
    </div>
  );
}
