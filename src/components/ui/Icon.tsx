/** Jeu d'icônes au trait, dessinées pour Laito (24×24, stroke = currentColor). */
const paths = {
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  users:
    'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.6-3.4 3.3-5.5 6.5-5.5s5.9 2.1 6.5 5.5M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14.8c1.9.7 3.2 2.5 3.5 5.2',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  globe:
    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3z',
  message: 'M20.5 11.5a8 8 0 0 1-11.7 7.1L3.5 20l1.4-4.6A8 8 0 1 1 20.5 11.5z',
  send: 'M21 3 10.5 13.5M21 3l-6.5 18-4-7.5-7.5-4z',
  userPlus:
    'M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20c.6-3.4 3.2-5.5 6.5-5.5 1.6 0 3 .5 4.1 1.4M18.5 13v7M15 16.5h7',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16.5v-5M12 8h.01',
  home: 'M3.5 10.5 12 4l8.5 6.5M5.5 9v11h13V9M10 20v-5.5h4V20',
  library: 'M4 4h4v16H4zM10 4h4v16h-4zM15.5 5.2l3.8-1 3.6 14.6-3.8 1z',
  pen: 'M14.5 4.5l5 5L9 20H4v-5zM12.5 6.5l5 5',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15.5 8.5l-2 5-5 2 2-5z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c.8-3.7 3.8-6 7.5-6s6.7 2.3 7.5 6',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5',
  grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  chevronLeft: 'M15 5l-7 7 7 7',
  chevronRight: 'M9 5l7 7-7 7',
  chevronDown: 'M5 9l7 7 7-7',
  x: 'M6 6l12 12M18 6 6 18',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7 7 0 0 1-2 1.2L14.8 21h-4l-.3-2.4a7 7 0 0 1-2-1.2l-1.9.7-2-3.4 1.6-1.2a7 7 0 0 1 0-2.4L4.6 9.9l2-3.4 1.9.7a7 7 0 0 1 2-1.2L10.8 3h4l.3 2.4a7 7 0 0 1 2 1.2l1.9-.7 2 3.4-1.6 1.2a7 7 0 0 1 0 2.4z',
  maximize: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  minimize: 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5',
  bold: 'M7 4.5h6a3.5 3.5 0 0 1 0 7H7zM7 11.5h7a4 4 0 0 1 0 8H7z',
  italic: 'M10 4.5h8M6 19.5h8M14.5 4.5l-5 15',
  heading: 'M6 4.5v15M18 4.5v15M6 12h12',
  quote: 'M5 17c0-4 1-7 4-9M14 17c0-4 1-7 4-9M5 17h4v-4H5zM14 17h4v-4h-4z',
  list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  alignCenter: 'M4 6h16M7 10h10M4 14h16M7 18h10',
  separator: 'M6 12h.01M12 12h.01M18 12h.01',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  cloudOff: 'M3 3l18 18M8.5 8.6A5 5 0 0 0 7 18h10.5M19.6 16.4A4 4 0 0 0 17 9a6 6 0 0 0-6.8-3.6',
  cloud: 'M7 18a5 5 0 0 1-.6-10A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z',
  bookOpen: 'M3 5.5c3-1 6-.8 9 1.5 3-2.3 6-2.5 9-1.5v13c-3-1-6-.8-9 1.5-3-2.3-6-2.5-9-1.5zM12 7v13',
  type: 'M5 7V5h14v2M12 5v14M9 19h6',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  sparkle:
    'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  download: 'M12 4v11M7 10.5l5 5 5-5M5 20h14',
  logOut: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  image: 'M4 5h16v14H4zM8.5 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM20 15l-5-5-9 9',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
  sidebar: 'M4 4h16v16H4zM9.5 4v16',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  undo: 'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  feather: 'M20 4c-6 0-11 4-12 11l-3 5M8 15h6M20 4c0 6-3 10-8 11',
  mail: 'M3.5 5.5h17v13h-17zM4 6l8 7 8-7',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
} as const;

export type IconName = keyof typeof paths;

export function Icon({
  name,
  size = 20,
  className,
  label,
  strokeWidth = 1.6,
}: {
  name: IconName;
  size?: number;
  className?: string;
  label?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <path d={paths[name]} />
    </svg>
  );
}
