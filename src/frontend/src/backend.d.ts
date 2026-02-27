import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Time = bigint;
export interface ScoreEntry {
    player: Principal;
    game: string;
    difficulty: Difficulty;
    score: bigint;
    timestamp: Time;
}
export interface PlayerSummary {
    username: string;
    gamesPlayed: bigint;
    achievementCount: bigint;
    totalPoints: bigint;
    avatar: bigint;
}
export interface UnlockedAchievement {
    achievementId: string;
    unlockTime: Time;
}
export interface UserProfile {
    username: string;
    avatar: bigint;
}
export enum Difficulty {
    easy = "easy",
    hard = "hard",
    medium = "medium"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createOrUpdateProfile(username: string, avatar: bigint): Promise<void>;
    getAchievements(): Promise<Array<UnlockedAchievement>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getLeaderboard(game: string): Promise<Array<ScoreEntry>>;
    getPersonalStats(): Promise<{
        scores: Array<ScoreEntry>;
        bestScores: Array<[string, bigint]>;
    }>;
    getPlayerSummary(): Promise<PlayerSummary>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    submitScore(game: string, score: bigint, difficulty: Difficulty): Promise<void>;
}
