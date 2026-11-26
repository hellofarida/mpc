/** Corridor of gardens ending in a flower. Decorative: the name next to it carries the meaning. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg className={className} width="44" height="34" viewBox="0 0 48 34" aria-hidden="true">
      <path d="M3 26 C10 26 10 12 17 14 S 24 24 29 17" fill="none" stroke="#3B6D11" strokeWidth="1.5" strokeDasharray="2 3" />
      <circle cx="3" cy="26" r="2.5" fill="#3B6D11" />
      <circle cx="17" cy="14" r="2.5" fill="#3B6D11" />
      <g fill="#EF9F27">
        <circle cx="38" cy="9" r="4" />
        <circle cx="38" cy="25" r="4" />
        <circle cx="30" cy="17" r="4" />
        <circle cx="46" cy="17" r="4" />
      </g>
      <circle cx="38" cy="17" r="4" fill="#854F0B" />
    </svg>
  );
}
