export function GymBroLogo({ size = 28 }: { size?: number }) {
  // Minimal “ironic gym bro” bicep mark (simple stroke icon).
  // We keep it as inline SVG so it inherits CSS `color`.
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* bicep outline */}
      <path
        d="M40 17c-3 0-5 2-6 5l-2 7-6-4c-3-2-7-1-9 2-2 3-1 7 2 9l8 5-2 6c-2 5 1 10 6 12 9 4 19 1 25-6 4-5 4-12-1-16l-7-7"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* tiny "wink" cut to make it a bit ironic */}
      <path
        d="M44 24h6"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
