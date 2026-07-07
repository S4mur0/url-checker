// Ícones inline (sem dependência de biblioteca externa) usados na navegação lateral.
const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function ShieldIcon(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...base} stroke="white" {...props}>
      <path d="M12 2 4 5v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V5l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function DomainsIcon(props) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.8 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.8-3.8-9S9.5 5.6 12 3Z" />
    </svg>
  );
}

export function ScanIcon(props) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" {...base} {...props}>
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="7" opacity="0.6" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}

export function ReportsIcon(props) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" {...base} {...props}>
      <path d="M7 2h8l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
      <path d="M9 13v4M12 10v7M15 15v2" />
    </svg>
  );
}

export function ProjectsIcon(props) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" {...base} {...props}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  );
}

export function SearchIcon(props) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" {...base} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
