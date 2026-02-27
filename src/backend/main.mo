import Runtime "mo:core/Runtime";
import Array "mo:core/Array";
import Map "mo:core/Map";
import List "mo:core/List";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Migration "migration";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

(with migration = Migration.run)
actor {
  // Types
  public type Difficulty = {
    #easy;
    #medium;
    #hard;
  };

  public type ScoreEntry = {
    player : Principal;
    game : Text;
    score : Nat;
    difficulty : Difficulty;
    timestamp : Time.Time;
  };

  public type PlayerProfile = {
    username : Text;
    avatar : Nat;
    totalPoints : Nat;
    gamesPlayed : Nat;
    registrationTime : Time.Time;
  };

  public type UserProfile = {
    username : Text;
    avatar : Nat;
  };

  public type Achievement = {
    id : Text;
    name : Text;
    description : Text;
  };

  public type UnlockedAchievement = {
    achievementId : Text;
    unlockTime : Time.Time;
  };

  public type PlayerSummary = {
    username : Text;
    avatar : Nat;
    totalPoints : Nat;
    gamesPlayed : Nat;
    achievementCount : Nat;
  };

  // Helper modules
  module ScoreEntry {
    public func compare(entry1 : ScoreEntry, entry2 : ScoreEntry) : Order.Order {
      if (entry1.score == entry2.score) {
        #less;
      } else if (entry1.score > entry2.score) {
        #greater;
      } else {
        #less;
      };
    };
  };

  // Extended achievement definitions
  let achievements = [
    {
      id = "first_game";
      name = "First Game";
      description = "Submit any score.";
    },
    {
      id = "high_scorer";
      name = "High Scorer";
      description = "Score over 1000 in any game.";
    },
    {
      id = "dedicated";
      name = "Dedicated";
      description = "Play 10 or more games.";
    },
    {
      id = "speed_demon";
      name = "Speed Demon";
      description = "Score over 500 in reaction game.";
    },
    {
      id = "memory_master";
      name = "Memory Master";
      description = "Score over 800 in memory game.";
    },
    {
      id = "snake_king";
      name = "Snake King";
      description = "Score over 1200 in snake game.";
    },
    {
      id = "tetris_master";
      name = "Tetris Master";
      description = "Score over 2000 in blocks game.";
    },
    {
      id = "pong_champ";
      name = "Pong Champion";
      description = "Score over 10 in pong game.";
    },
    {
      id = "breakout_king";
      name = "Breakout King";
      description = "Score over 500 in breakout game.";
    },
    {
      id = "math_genius";
      name = "Math Genius";
      description = "Score over 20 in mathquiz game.";
    },
    {
      id = "word_wizard";
      name = "Word Wizard";
      description = "Score over 10 in wordscramble game.";
    },
    {
      id = "space_ace";
      name = "Space Ace";
      description = "Score over 1000 in spaceshooter game.";
    },
    {
      id = "flappy_pro";
      name = "Flappy Pro";
      description = "Score over 20 in flappy game.";
    },
    {
      id = "combo_master";
      name = "Combo Master";
      description = "Play 5 different games.";
    },
    {
      id = "legend";
      name = "Legend";
      description = "Total points over 10000.";
    },
  ];

  // State variables
  let playerProfiles = Map.empty<Principal, PlayerProfile>();
  let scores = List.empty<ScoreEntry>();
  let playerAchievements = Map.empty<Principal, List.List<UnlockedAchievement>>();

  // Authorization
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User profile management functions
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    switch (playerProfiles.get(caller)) {
      case (null) { null };
      case (?profile) {
        ?{
          username = profile.username;
          avatar = profile.avatar;
        };
      };
    };
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    switch (playerProfiles.get(user)) {
      case (null) { null };
      case (?profile) {
        ?{
          username = profile.username;
          avatar = profile.avatar;
        };
      };
    };
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };

    let existingProfile = playerProfiles.get(caller);

    let newProfile : PlayerProfile = {
      username = profile.username;
      avatar = profile.avatar;
      totalPoints = switch (existingProfile) {
        case (null) { 0 };
        case (?p) { p.totalPoints };
      };
      gamesPlayed = switch (existingProfile) {
        case (null) { 0 };
        case (?p) { p.gamesPlayed };
      };
      registrationTime = switch (existingProfile) {
        case (null) { Time.now() };
        case (?p) { p.registrationTime };
      };
    };

    playerProfiles.add(caller, newProfile);
  };

  public shared ({ caller }) func createOrUpdateProfile(username : Text, avatar : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create or update profiles");
    };

    let existingProfile = playerProfiles.get(caller);

    let newProfile : PlayerProfile = {
      username;
      avatar;
      totalPoints = switch (existingProfile) {
        case (null) { 0 };
        case (?profile) { profile.totalPoints };
      };
      gamesPlayed = switch (existingProfile) {
        case (null) { 0 };
        case (?profile) { profile.gamesPlayed };
      };
      registrationTime = switch (existingProfile) {
        case (null) { Time.now() };
        case (?profile) { profile.registrationTime };
      };
    };

    playerProfiles.add(caller, newProfile);
  };

  // Score submission and achievements
  public shared ({ caller }) func submitScore(game : Text, score : Nat, difficulty : Difficulty) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can submit scores");
    };

    switch (playerProfiles.get(caller)) {
      case (null) { Runtime.trap("Must create profile first") };
      case (?profile) {
        let scoreEntry : ScoreEntry = {
          player = caller;
          game;
          score;
          difficulty;
          timestamp = Time.now();
        };
        scores.add(scoreEntry);

        let updatedProfile : PlayerProfile = {
          username = profile.username;
          avatar = profile.avatar;
          totalPoints = profile.totalPoints + score;
          gamesPlayed = profile.gamesPlayed + 1;
          registrationTime = profile.registrationTime;
        };
        playerProfiles.add(caller, updatedProfile);

        checkAchievements(caller, game, score, updatedProfile.totalPoints);
      };
    };
  };

  // Leaderboard (public)
  public query ({ caller }) func getLeaderboard(game : Text) : async [ScoreEntry] {
    let entries = scores.toArray().filter(func(entry) { entry.game == game });
    let sortedEntries = entries.sort();
    sortedEntries.sliceToArray(0, if (sortedEntries.size() > 10) { 10 } else {
      sortedEntries.size();
    });
  };

  // Personal stats (user only)
  public query ({ caller }) func getPersonalStats() : async {
    scores : [ScoreEntry];
    bestScores : [(Text, Nat)];
  } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view personal stats");
    };

    let personalScores = scores.toArray().filter(func(entry) { entry.player == caller });
    let bestScores = computeBestScores(personalScores);

    {
      scores = personalScores;
      bestScores;
    };
  };

  // Achievements (user only)
  public query ({ caller }) func getAchievements() : async [UnlockedAchievement] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view achievements");
    };

    switch (playerAchievements.get(caller)) {
      case (null) { [] };
      case (?achievements) { achievements.toArray() };
    };
  };

  // Player summary (user only)
  public query ({ caller }) func getPlayerSummary() : async PlayerSummary {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view player summary");
    };

    switch (playerProfiles.get(caller)) {
      case (null) { Runtime.trap("Profile not found") };
      case (?profile) {
        let achievementsList = switch (playerAchievements.get(caller)) {
          case (null) { [] };
          case (?achievements) { achievements.toArray() };
        };
        return {
          username = profile.username;
          avatar = profile.avatar;
          totalPoints = profile.totalPoints;
          gamesPlayed = profile.gamesPlayed;
          achievementCount = achievementsList.size();
        };
      };
    };
  };

  // Helper to compute best scores per game dynamically
  func computeBestScores(scores : [ScoreEntry]) : [(Text, Nat)] {
    let bestScores = Map.empty<Text, Nat>();

    for (score in scores.values()) {
      let currentBest = switch (bestScores.get(score.game)) {
        case (null) { 0 };
        case (?best) { best };
      };
      if (score.score > currentBest) {
        bestScores.add(score.game, score.score);
      };
    };

    bestScores.toArray();
  };

  // Achievement checking logic
  func checkAchievements(player : Principal, game : Text, score : Nat, totalPoints : Nat) {
    let existingAchievements = switch (playerAchievements.get(player)) {
      case (null) { List.empty<UnlockedAchievement>() };
      case (?achievements) { achievements };
    };

    func hasAchievement(id : Text) : Bool {
      existingAchievements.toArray().any(func(entry) { entry.achievementId == id });
    };

    let newAchievements = List.empty<UnlockedAchievement>();

    // Achievement checks
    if (not hasAchievement("first_game")) {
      newAchievements.add({
        achievementId = "first_game";
        unlockTime = Time.now();
      });
    };

    if (not hasAchievement("high_scorer") and score > 1000) {
      newAchievements.add({
        achievementId = "high_scorer";
        unlockTime = Time.now();
      });
    };

    if (game == "reaction" and not hasAchievement("speed_demon") and score > 500) {
      newAchievements.add({
        achievementId = "speed_demon";
        unlockTime = Time.now();
      });
    };

    if (game == "memory" and not hasAchievement("memory_master") and score > 800) {
      newAchievements.add({
        achievementId = "memory_master";
        unlockTime = Time.now();
      });
    };

    if (game == "snake" and not hasAchievement("snake_king") and score > 1200) {
      newAchievements.add({
        achievementId = "snake_king";
        unlockTime = Time.now();
      });
    };

    if (game == "blocks" and not hasAchievement("tetris_master") and score > 2000) {
      newAchievements.add({
        achievementId = "tetris_master";
        unlockTime = Time.now();
      });
    };

    if (game == "pong" and not hasAchievement("pong_champ") and score > 10) {
      newAchievements.add({
        achievementId = "pong_champ";
        unlockTime = Time.now();
      });
    };

    if (game == "breakout" and not hasAchievement("breakout_king") and score > 500) {
      newAchievements.add({
        achievementId = "breakout_king";
        unlockTime = Time.now();
      });
    };

    if (game == "mathquiz" and not hasAchievement("math_genius") and score > 20) {
      newAchievements.add({
        achievementId = "math_genius";
        unlockTime = Time.now();
      });
    };

    if (game == "wordscramble" and not hasAchievement("word_wizard") and score > 10) {
      newAchievements.add({
        achievementId = "word_wizard";
        unlockTime = Time.now();
      });
    };

    if (game == "spaceshooter" and not hasAchievement("space_ace") and score > 1000) {
      newAchievements.add({
        achievementId = "space_ace";
        unlockTime = Time.now();
      });
    };

    if (game == "flappy" and not hasAchievement("flappy_pro") and score > 20) {
      newAchievements.add({
        achievementId = "flappy_pro";
        unlockTime = Time.now();
      });
    };

    switch (playerProfiles.get(player)) {
      case (?profile) {
        if (not hasAchievement("dedicated") and profile.gamesPlayed >= 10) {
          newAchievements.add({
            achievementId = "dedicated";
            unlockTime = Time.now();
          });
        };
      };
      case (null) {};
    };

    if (getUniqueGameCount(player) >= 5 and not hasAchievement("combo_master")) {
      newAchievements.add({
        achievementId = "combo_master";
        unlockTime = Time.now();
      });
    };

    if (totalPoints > 10000 and not hasAchievement("legend")) {
      newAchievements.add({
        achievementId = "legend";
        unlockTime = Time.now();
      });
    };

    existingAchievements.addAll(newAchievements.values());
    playerAchievements.add(player, existingAchievements);
  };

  func getUniqueGameCount(player : Principal) : Nat {
    let playerScores = scores.toArray().filter(func(entry) { entry.player == player });
    let gamesMap = Map.empty<Text, Bool>();

    for (score in playerScores.values()) {
      gamesMap.add(score.game, true);
    };

    gamesMap.size();
  };
};
