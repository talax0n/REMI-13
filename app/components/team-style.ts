const teamColorClasses = [
  { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30" },
  { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" },
  { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/30" },
  { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" },
  { bg: "bg-cyan-500/15", text: "text-cyan-400", border: "border-cyan-500/30" },
  { bg: "bg-indigo-500/15", text: "text-indigo-400", border: "border-indigo-500/30" },
  { bg: "bg-teal-500/15", text: "text-teal-400", border: "border-teal-500/30" },
  { bg: "bg-violet-500/15", text: "text-violet-400", border: "border-violet-500/30" },
  { bg: "bg-pink-500/15", text: "text-pink-400", border: "border-pink-500/30" },
  { bg: "bg-lime-500/15", text: "text-lime-400", border: "border-lime-500/30" },
  { bg: "bg-sky-500/15", text: "text-sky-400", border: "border-sky-500/30" },
  { bg: "bg-fuchsia-500/15", text: "text-fuchsia-400", border: "border-fuchsia-500/30" },
  { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/30" },
  { bg: "bg-rose-500/15", text: "text-rose-400", border: "border-rose-500/30" },
];

export const defaultTeamColor = {
  bg: "bg-gray-500/15",
  text: "text-gray-400",
  border: "border-gray-500/30",
};

function hashTeamName(team: string): number {
  let hash = 0;
  for (let i = 0; i < team.length; i++) {
    hash = (hash * 31 + team.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getTeamColor(team: string) {
  if (!team) return defaultTeamColor;
  return teamColorClasses[hashTeamName(team) % teamColorClasses.length];
}
