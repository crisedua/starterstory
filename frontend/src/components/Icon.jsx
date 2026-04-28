// Iconos inline (Lucide-like). Sin dependencias externas.
const PATHS = {
  home: <><path d="M3 9.5L12 2l9 7.5"/><path d="M5 9v12h14V9"/></>,
  database: <><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v6c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 11v6c0 1.7 4 3 9 3s9-1.3 9-3v-6"/></>,
  zap: <path d="M13 2L4 14h7l-1 8 9-12h-7z"/>,
  film: <><rect x="2" y="2" width="20" height="20" rx="2.5"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5"/></>,
  target: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
  bulb: <><path d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7c.7.7 1 1.5 1 2.3v1h6v-1c0-.8.3-1.6 1-2.3A7 7 0 0012 2z"/></>,
  sparkles: <><path d="M12 3l1.9 5.6L19.5 11l-5.6 2.4L12 19l-1.9-5.6L4.5 11l5.6-2.4z"/><path d="M19 3v4M21 5h-4M5 17v4M7 19H3"/></>,
  beaker: <><path d="M8 3h8M9 3v6L4 19a2 2 0 002 3h12a2 2 0 002-3l-5-10V3"/></>,
  cog: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></>,
  play: <path d="M5 3l14 9-14 9z"/>,
  refresh: <><path d="M21 12a9 9 0 11-3-6.7L21 8"/><path d="M21 3v5h-5"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  edit: <><path d="M11 4H4v16h16v-7"/><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4z"/></>,
  trash: <><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>,
  filter: <path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>,
  external: <><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><path d="M15 3h6v6M10 14L21 3"/></>,
  chevronRight: <path d="M9 6l6 6-6 6"/>,
  check: <path d="M20 6L9 17l-5-5"/>,
  x: <path d="M18 6L6 18M6 6l12 12"/>,
  alert: <><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></>,
  clock: <><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>,
  arrowRight: <><path d="M5 12h14M13 5l7 7-7 7"/></>,
  arrowLeft: <><path d="M19 12H5M11 19l-7-7 7-7"/></>,
  brain: <><path d="M9.5 2A2.5 2.5 0 0112 4.5v15a2.5 2.5 0 01-4.96.44A2.5 2.5 0 014 17.5a2.5 2.5 0 01-1.16-4.69A2.5 2.5 0 014 7.5a2.5 2.5 0 013-2.45A2.5 2.5 0 019.5 2z"/><path d="M14.5 2A2.5 2.5 0 0012 4.5v15a2.5 2.5 0 004.96.44A2.5 2.5 0 0020 17.5a2.5 2.5 0 001.16-4.69A2.5 2.5 0 0020 7.5a2.5 2.5 0 00-3-2.45A2.5 2.5 0 0014.5 2z"/></>,
  spinner: <><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></>,
};

export default function Icon({ name, size = 16, className = '', style = {}, ...props }) {
  const path = PATHS[name];
  if (!path) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flexShrink: 0, ...style }}
      {...props}
    >
      {path}
    </svg>
  );
}
