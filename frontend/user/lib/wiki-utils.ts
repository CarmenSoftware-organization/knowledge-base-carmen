export function formatCategoryName(slug: string) {
  return slug.toUpperCase();
}

export function getCategoryColor(slug: string) {
  const colors = [
    "bg-blue-500/10 text-blue-600 border-blue-500/20",
    "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    "bg-violet-500/10 text-violet-600 border-violet-500/20",
    "bg-amber-500/10 text-amber-600 border-amber-500/20",
    "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  ];
  return colors[slug.length % colors.length];
}
