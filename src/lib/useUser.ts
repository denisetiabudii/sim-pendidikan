import { useStore } from "./store";

// Pengguna aktif. Untuk pendidik, cakupan dipersempit ke kelas atau halaqoh yang dipilih saat masuk.
export function useUser() {
  const { data, currentUserId, session } = useStore();
  const u = data.users[currentUserId] ?? Object.values(data.users)[0];
  if (u.role === "pendidik" && session && session.groupIds.length > 0)
    return { ...u, groupIds: (u.groupIds ?? []).filter((g) => session.groupIds.includes(g)) };
  return u;
}