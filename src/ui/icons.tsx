import type { ReactNode } from "react";

function Icon({ children, size = 20, stroke = 2.4 }: { children: ReactNode; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-none">
      {children}
    </svg>
  );
}

export const GiftIcon = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <rect x="3" y="8" width="18" height="4" rx="1" />
    <path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5" />
  </Icon>
);
export const PlusIcon = () => <Icon stroke={3}><path d="M12 5v14M5 12h14" /></Icon>;
export const PencilIcon = () => <Icon size={18}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></Icon>;
export const CrossIcon = () => <Icon size={18}><path d="M18 6 6 18M6 6l12 12" /></Icon>;
export const LinkIcon = () => (
  <Icon size={18}>
    <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
  </Icon>
);
export const CheckIcon = () => <Icon size={16} stroke={3.2}><path d="M20 6 9 17l-5-5" /></Icon>;
export const WarningIcon = () => (
  <Icon size={22}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4M12 16h.01" />
  </Icon>
);
export const HourglassIcon = () => <Icon size={28}><path d="M6 2h12M6 22h12M7 2v4l5 6-5 6v4M17 2v4l-5 6 5 6v4" /></Icon>;
