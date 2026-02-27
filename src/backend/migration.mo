import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Time "mo:core/Time";

module {
  // Old types
  type OldDifficulty = {
    #easy;
    #medium;
    #hard;
  };

  type OldScoreEntry = {
    player : Principal.Principal;
    game : Text;
    score : Nat;
    difficulty : OldDifficulty;
    timestamp : Time.Time;
  };

  type OldPlayerProfile = {
    username : Text;
    avatar : Nat;
    totalPoints : Nat;
    gamesPlayed : Nat;
    registrationTime : Time.Time;
  };

  type OldUnlockedAchievement = {
    achievementId : Text;
    unlockTime : Time.Time;
  };

  type OldActor = {
    playerProfiles : Map.Map<Principal.Principal, OldPlayerProfile>;
    scores : List.List<OldScoreEntry>;
    playerAchievements : Map.Map<Principal.Principal, List.List<OldUnlockedAchievement>>;
  };

  // New types (same as old in this case)
  type NewDifficulty = {
    #easy;
    #medium;
    #hard;
  };

  type NewScoreEntry = {
    player : Principal.Principal;
    game : Text;
    score : Nat;
    difficulty : NewDifficulty;
    timestamp : Time.Time;
  };

  type NewPlayerProfile = {
    username : Text;
    avatar : Nat;
    totalPoints : Nat;
    gamesPlayed : Nat;
    registrationTime : Time.Time;
  };

  type NewUnlockedAchievement = {
    achievementId : Text;
    unlockTime : Time.Time;
  };

  type NewActor = {
    playerProfiles : Map.Map<Principal.Principal, NewPlayerProfile>;
    scores : List.List<NewScoreEntry>;
    playerAchievements : Map.Map<Principal.Principal, List.List<NewUnlockedAchievement>>;
  };

  public func run(old : OldActor) : NewActor {
    old;
  };
};
