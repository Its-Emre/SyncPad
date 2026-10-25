// Every user gets a stable colour derived from their user id — the
// same colour follows them in cursors, name flags and the avatar stack.
const PALETTE = [
  "#8b5cf6", // violet
  "#f43f5e", // rose
  "#f59e0b", // amber
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
  "#f97316", // orange
];

export const colorForUser = (userId) => {
  if (!userId) return PALETTE[0];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
};

export const initialsOf = (name) =>
  (name || "?")
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
