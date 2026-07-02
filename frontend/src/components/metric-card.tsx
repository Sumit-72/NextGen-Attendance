export function MetricCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-3xl border border-(--border) bg-white/85 p-6 shadow-[0_12px_40px_rgba(16,33,47,0.06)]">
      <p className="text-sm font-medium text-(--muted)">{title}</p>
      <div className="mt-4 text-3xl font-semibold">{value}</div>
      <p className="mt-2 text-sm leading-6 text-(--muted)">{detail}</p>
    </article>
  );
}
