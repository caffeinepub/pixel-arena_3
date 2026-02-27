import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";
import { Difficulty, type PlayerSummary, type ScoreEntry, type UnlockedAchievement, type UserProfile } from "../backend.d";

// ─── Profile Queries ─────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useGetPlayerSummary() {
  const { actor, isFetching } = useActor();
  return useQuery<PlayerSummary>({
    queryKey: ["playerSummary"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getPlayerSummary();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSaveProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ username, avatar }: { username: string; avatar: bigint }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.createOrUpdateProfile(username, avatar);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playerSummary"] });
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export function useGetLeaderboard(game: string) {
  const { actor, isFetching } = useActor();
  return useQuery<ScoreEntry[]>({
    queryKey: ["leaderboard", game],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getLeaderboard(game);
    },
    enabled: !!actor && !isFetching && !!game,
  });
}

// ─── Achievements ─────────────────────────────────────────────────────────────

export function useGetAchievements() {
  const { actor, isFetching } = useActor();
  return useQuery<UnlockedAchievement[]>({
    queryKey: ["achievements"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getAchievements();
    },
    enabled: !!actor && !isFetching,
  });
}

// ─── Personal Stats ───────────────────────────────────────────────────────────

export function useGetPersonalStats() {
  const { actor, isFetching } = useActor();
  return useQuery<{ scores: ScoreEntry[]; bestScores: Array<[string, bigint]> }>({
    queryKey: ["personalStats"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getPersonalStats();
    },
    enabled: !!actor && !isFetching,
  });
}

// ─── Submit Score ─────────────────────────────────────────────────────────────

export function useSubmitScore() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      game,
      score,
      difficulty,
    }: {
      game: string;
      score: bigint;
      difficulty: Difficulty;
    }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.submitScore(game, score, difficulty);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["leaderboard", variables.game] });
      queryClient.invalidateQueries({ queryKey: ["personalStats"] });
      queryClient.invalidateQueries({ queryKey: ["playerSummary"] });
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
    },
  });
}

export { Difficulty };
