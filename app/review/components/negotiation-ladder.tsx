type NegotiationLadderItem = {
  label: string;
  title: string;
  script: string;
};

type NegotiationLadderProps = {
  title?: string;
  items: NegotiationLadderItem[];
  className?: string;
};

export function NegotiationLadder({ title = 'Negotiation ladder', items, className }: NegotiationLadderProps) {
  return (
    <div className={`rounded-xl border border-zinc-800 bg-black/30 p-4 ${className ?? ''}`.trim()}>
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
        {items.map((item) => (
          <div key={`${item.label}-${item.title}`} className="rounded-lg border border-zinc-800 bg-black/30 p-4">
            <span className="inline-block rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-300">{item.label}</span>
            <div className="mt-2 font-medium">{item.title}</div>
            <div className="mt-2 text-sm text-zinc-300">{item.script}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
