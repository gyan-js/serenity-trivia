import mongoose from "mongoose";

const guildConfigSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, unique: true },
    triviaChannelId: { type: String, required: true },
    leaderboardChannelId: { type: String, required: true },
    leaderboardMessageId: { type: String, default: null },
    isStarted: { type: Boolean, default: true },

    gameInterval: { type: Number, default: 10 },
    lastGameAt: { type: Date, default: null },
    nextGameType: {
      type: String,
      enum: ["trivia", "flag", "language", "typing"],
      default: "trivia",
    },

    // backward safety
    triviaInterval: { type: Number, default: 10 },
    gtfInterval: { type: Number, default: 10 },
    lastTriviaAt: { type: Date, default: null },
    lastFlagAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const userScoreSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    username: { type: String, required: true },
    points: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userScoreSchema.index({ guildId: 1, userId: 1 }, { unique: true });

const triviaQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answers: [{ type: String, required: true }],
    normalizedAnswers: [{ type: String, required: true, index: true }],
    points: { type: Number, default: 10 },
    category: { type: String, default: "General" },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const activeRoundSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TriviaQuestion",
      required: true,
    },
    questionText: { type: String, required: true },
    normalizedAnswers: [{ type: String, required: true }],
    points: { type: Number, default: 10 },
    messageId: { type: String, default: null },
    solved: { type: Boolean, default: false },
    winnerUserId: { type: String, default: null },
    winnerUsername: { type: String, default: null },
    winningAnswer: { type: String, default: null },
    solvedAt: { type: Date, default: null },
    askedAt: { type: Date, default: Date.now },
    answers: [{ type: String, required: true }],
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

const activeFlagRoundSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true },
    flagQuestionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FlagQuestion",
      required: true,
    },
    country: { type: String, required: true },
    normalizedAnswers: [{ type: String, required: true }],
    imageUrl: { type: String, required: true },
    points: { type: Number, default: 15 },
    solved: { type: Boolean, default: false },
    winnerUserId: { type: String, default: null },
    winnerUsername: { type: String, default: null },
    winningAnswer: { type: String, default: null },
    solvedAt: { type: Date, default: null },
    askedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

const flagQuestionSchema = new mongoose.Schema(
  {
    country: { type: String, required: true },
    normalizedAnswers: [{ type: String, required: true, index: true }],
    imageUrl: { type: String, required: true },
    points: { type: Number, default: 15 },
    region: { type: String, default: "Unknown" },
    isActive: { type: Boolean, default: true },
    used: { type: Boolean, default: false },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const languageQuestionSchema = new mongoose.Schema(
  {
    language: { type: String, required: true },
    normalizedAnswers: [{ type: String, required: true, index: true }],
    sampleText: { type: String, required: true },
    points: { type: Number, default: 12 },
    region: { type: String, default: "Unknown" },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
    },
    isActive: { type: Boolean, default: true },
    used: { type: Boolean, default: false },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const activeLanguageRoundSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true },
    languageQuestionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LanguageQuestion",
      required: true,
    },
    language: { type: String, required: true },
    sampleText: { type: String, required: true },
    normalizedAnswers: [{ type: String, required: true }],
    points: { type: Number, default: 12 },
    solved: { type: Boolean, default: false },
    winnerUserId: { type: String, default: null },
    winnerUsername: { type: String, default: null },
    winningAnswer: { type: String, default: null },
    solvedAt: { type: Date, default: null },
    askedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

const typingRaceQuestionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    normalizedAnswers: [{ type: String, required: true, index: true }],
    points: { type: Number, default: 20 },
    isActive: { type: Boolean, default: true },
    used: { type: Boolean, default: false },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const activeTypingRaceRoundSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true },
    typingRaceQuestionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TypingRaceQuestion",
      required: true,
    },
    text: { type: String, required: true },
    normalizedAnswers: [{ type: String, required: true }],
    points: { type: Number, default: 20 },
    solved: { type: Boolean, default: false },
    winnerUserId: { type: String, default: null },
    winnerUsername: { type: String, default: null },
    winningAnswer: { type: String, default: null },
    solvedAt: { type: Date, default: null },
    askedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export const GuildConfig = mongoose.model("GuildConfig", guildConfigSchema);
export const UserScore = mongoose.model("UserScore", userScoreSchema);
export const TriviaQuestion = mongoose.model("TriviaQuestion", triviaQuestionSchema);
export const ActiveRound = mongoose.model("ActiveRound", activeRoundSchema);
export const FlagQuestion = mongoose.model("FlagQuestion", flagQuestionSchema);
export const ActiveFlagRound = mongoose.model("ActiveFlagRound", activeFlagRoundSchema);
export const LanguageQuestion = mongoose.model("LanguageQuestion", languageQuestionSchema);
export const ActiveLanguageRound = mongoose.model("ActiveLanguageRound", activeLanguageRoundSchema);
export const TypingRaceQuestion = mongoose.model("TypingRaceQuestion", typingRaceQuestionSchema);
export const ActiveTypingRaceRound = mongoose.model("ActiveTypingRaceRound", activeTypingRaceRoundSchema);