// Launch eyebrow above the headline. A soft green chip in the headline's
// own green, with a live pulse dot — not a dark box sitting on the white
// page, which read as pasted-on.
export default function Badge({ tag, children }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-green/25 bg-green/[0.08] py-1.5 pr-3.5 pl-3 text-[13.5px] leading-none text-green-deep">
      <span className="relative flex size-2" aria-hidden="true">
        <span className="absolute inset-0 rounded-full bg-green opacity-60 motion-safe:animate-ping" />
        <span className="relative size-2 rounded-full bg-green" />
      </span>
      <span className="font-semibold">{tag}</span>
      <span className="h-3.5 w-px bg-green/30" aria-hidden="true" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/arbitrum-logo.svg" alt="" width={12} height={14} className="block h-3.5 w-auto" />
      <span className="whitespace-nowrap font-medium">{children}</span>
    </span>
  );
}
