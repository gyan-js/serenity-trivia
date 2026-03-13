import dotenv from "dotenv";
dotenv.config();

import dns from "node:dns/promises";
dns.setServers(["1.1.1.1"]);

import { Client, GatewayIntentBits, Partials, EmbedBuilder, SlashCommandBuilder, PermissionsBitField, ChannelType, REST, Routes } from "discord.js";
import mongoose, { mongo } from "mongoose";
import cron from "node-cron";
// =====================================================
// Discord Client
// =====================================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

// =====================================================
// MongoDB Schemas
// =====================================================
const guildConfigSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, unique: true },
    triviaChannelId: { type: String, required: true },
    leaderboardChannelId: { type: String, required: true },
    leaderboardMessageId: { type: String, default: null },
    isStarted: { type: Boolean, default: true },

    triviaInterval: {type: Number, default: 10}, 
    gtfInterval: {type: Number, default: 10},

    lastTriviaAt: { type: Date, default: null },
    lastFlagAt: { type: Date, default: null }
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
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "TriviaQuestion", required: true },
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

const GuildConfig = mongoose.model("GuildConfig", guildConfigSchema);
const UserScore = mongoose.model("UserScore", userScoreSchema);
const TriviaQuestion = mongoose.model("TriviaQuestion", triviaQuestionSchema);
//const questions = await import("./questions.json", { assert: { type: "json" } });
const ActiveRound = mongoose.model("ActiveRound", activeRoundSchema);
const FlagQuestion = mongoose.model("FlagQuestion", flagQuestionSchema)
const ActiveFlagRound = mongoose.model("ActiveFlagRound", activeFlagRoundSchema);

// =====================================================
// Helpers
// =====================================================
function normalizeAnswer(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

function ordinal(num) {
  const s = ["th", "st", "nd", "rd"];
  const v = num % 100;
  return `${num}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

function difficultyBadge(level) {
  if (level === "Easy") return "🟢 Easy";
  if (level === "Hard") return "🔴 Hard";
  return "🟠 Medium";
}

function buildQuestionEmbed(questionData) {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setAuthor({
      name: "✨ Live Trivia Round",
      iconURL: client.user?.displayAvatarURL() || undefined,
    })
    .setTitle("<:brain:1480948942282952735> Trivia Time!")
    .setDescription(
      [
        "╭────────────────────╮",
        `**${questionData.question}**`,
        "╰────────────────────╯",
      ].join("\n")
    )
    .addFields(
      {
        name: "📚 Category",
        value: `\`${questionData.category || "General"}\``,
        inline: true,
      },
      {
        name: "<:target2:1480956785715187872> Difficulty",
        value: `\`${difficultyBadge(questionData.difficulty || "Medium")}\``,
        inline: true,
      },
      {
        name: "<:giftcard:1480952956445659218> Reward",
        value: `\`${questionData.points || 10} pts\``,
        inline: true,
      }
    )
    .setFooter({
      text: "Type your answer in chat • First correct answer wins",
    })
    .setTimestamp();
}

function buildFlagQuestionEmbed(flagData) {
  return new EmbedBuilder()
    .setColor(0x3498db)
    .setAuthor({
      name: "🌍 Guess the Flag",
      iconURL: client.user?.displayAvatarURL() || undefined,
    })
    .setTitle("🚩Guess the flag ?")
    .setDescription(
      [
        "**First to guess the flag wins**",
        "",
        
      ].join("\n")
    )
    .setImage(flagData.imageUrl)
    .setFooter({
      text: "Professional Flag Challenge • Earn points for correct guess •",
    })
    .setTimestamp();
}

function buildFlagWinnerEmbed(user, points, answer, country) {
  
  return new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle("🎉 Correct Flag Guess!")
    .setDescription(
      [
        
        `<:info:1481610239102161096> ${user} won ${points} points <:gems_5:1480828695466741831>!`,
        //`<:lb_check:1481611597423186012> **Check the Rankings** \`<#${leaderboardChannelId}>\``,
        `<:lb_check:1481611597423186012> **Answer:** \`${answer}\``
      ].join("\n")
    )
    .setFooter({
      text: "Win games to climb higher in the weekly lb",
    })
    .setTimestamp();
}

function buildSetupEmbed(triviaChannel, leaderboardChannel, triviaInterval, gtfInterval) {
  return new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle("✅ Trivia System Activated")
    .setDescription(
      [
        "Your trivia bot has been set up successfully.",
        "",
        `**🧠 Trivia Channel:** ${triviaChannel}`,
        `**🏆 Leaderboard Channel:** ${leaderboardChannel}`,
        `**⏱️ Trivia Interval:** Every \`${triviaInterval}\` minutes`,
        `**🚩 Guess the Flag Interval:** Every \`${gtfInterval}\` minutes`,
      ].join("\n")
    )
    .setFooter({
      text: "Only admins can run setup and reset commands",
    })
    .setTimestamp();
}

function buildResetEmbed() {
  return new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("🗑️ Leaderboard Reset")
    .setDescription("All trivia scores for this server have been cleared.")
    .setTimestamp();
}

function buildCorrectAnswerEmbed(user, points, answer) {
  return new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle("🎉 Correct Trivia Answer!")
    .setDescription(
      [
        `<:info:1481610239102161096> ${user} won ${points} points. <:gems_5:1480828695466741831>!`,
        //`<:lb_check:1481611597423186012> **Check the Rankings** \`<#${leaderboardChannelId}>\``,
        `<:lb_check:1481611597423186012> **Answer:** \`${answer}\``
      ].join("\n")
    )
    .setFooter({
      text: "This round is now closed",
    })
    .setTimestamp();
}

function buildNoQuestionsEmbed() {
  return new EmbedBuilder()
    .setColor(0xfee75c)
    .setTitle("⚠️ No Trivia Questions Found")
    .setDescription(
      "There are no active questions in MongoDB yet. Add questions to the database first."
    )
    .setTimestamp();
}

function buildLeaderboardEmbed(guildName, topUsers) {
  //const rankIcons = ["👑", "🥈", "🥉", "✨", "✨", "✨", "⭐", "⭐", "⭐", "⭐"];

  let description = "";
  if (!topUsers.length) {
    description =
      "╭────────────────────────\n" +
      "✨ No champions yet.\n" +
      "Be the first to win a trivia round!\n" +
      "╰────────────────────────╯";
  } else {
   /** description = topUsers
      .map((user, index) => {
        const rank = index + 1;
        const icon = rankIcons[index] || "•";
        const lineTop = `${icon} **#${rank} — ${user.username}**`;
        const lineBottom = `> **Points:** \`${user.points}\` • **Wins:** \`${user.wins}\` • **Place:** \`${ordinal(rank)}\``;
        return `${lineTop}\n${lineBottom}`;
      })
      .join("\n\n");**/
      description = topUsers
  .map((user, index) => {
    const rank = index + 1;

    const rankIcons = [
      "<:firstprize:1480839203536240732>",
      "<:secondplace:1480839974201856090>",
      "<:3rdplace1:1480840249213976696>",
      "<:commonrank:1481620673087410230>",
      "<:commonrank:1481620673087410230>",
      "<:commonrank:1481620673087410230>",
      "<:commonrank:1481620673087410230>",
      "<:commonrank:1481620673087410230>",
      "<:commonrank:1481620673087410230>",
      "<:commonrank:1481620673087410230>",
      
    ];

    const icon = rankIcons[index] || "•";

    return `${icon} ${user.username} — **${user.points} points** <:gems_5:1480828695466741831>`;
  })
  .join("\n");
  }

  return new EmbedBuilder()
    .setColor(0xf1c40f)
    .setAuthor({
      name: `${guildName} Trivia Rankings`,
      iconURL: client.user?.displayAvatarURL() || undefined,
    })
    .setThumbnail(client.user?.displayAvatarURL() || undefined)
    .setTitle("__Trivia Ranking__")
    .setDescription(`\n${description}`)
    .addFields(
     
      {
        name: "🔄 Refresh",
        value: "`Every 5 minutes`",
        inline: true,
      },
      {
        name: "⚡ Status",
        value: "`Live ranking`",
        inline: true,
      }
    )
    .setFooter({
      text: "Answer first • Earn points • Climb the ranks",
    })
    .setTimestamp();
}

// =====================================================
// Slash Commands
// =====================================================
async function registerSlashCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName("trivia-setup")
      .setDescription("Admin only: set up trivia and leaderboard channels.")
      .addChannelOption((option) =>
        option
          .setName("trivia_channel")
          .setDescription("Channel where trivia questions will be posted")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
      .addChannelOption((option) =>
        option
          .setName("leaderboard_channel")
          .setDescription("Channel where the leaderboard will be posted")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
      .addIntegerOption((option) => 
        option
          .setName("trivia_interval")
          .setDescription("Time interval of your Trivia Questions")
          .setMinValue(1)
          .setRequired(true)
      )
      .addIntegerOption((option) => 
        option
          .setName("gtf_interval")
          .setDescription("Time interval of your GTF Questions")
          .setMinValue(1)
          .setRequired(true)
      )
      .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    new SlashCommandBuilder()
      .setName("trivia-reset")
      .setDescription("Admin only: reset this server's leaderboard.")
      .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    new SlashCommandBuilder()
      .setName("trivia-reset-setup")
      .setDescription("Admin only: completely reset the trivia setup for this server.")
      .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    new SlashCommandBuilder()
      .setName("send-trivia")
      .setDescription("Admin only: send a trivia question right now for testing.")
      .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    new SlashCommandBuilder()
      .setName("send-flag-trivia")
      .setDescription("Admin only: send a Guess the Flag question immediately for testing.")
      .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
  ].map((cmd) => cmd.toJSON());

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

  await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
    body: commands,
  });

  console.log("✅ Slash commands registered");
}

// =====================================================
// DB Logic
// =====================================================
async function getRandomQuestion() {
  const result = await TriviaQuestion.aggregate([
    { $match: { isActive: true } },
    { $sample: { size: 1 } },
  ]);

  return result[0] || null;
}

async function getRandomFlagQuestion() {
  let result = await FlagQuestion.aggregate([
    {
      $match: {
        isActive: true,
        used: false,
      },
    },
    { $sample: { size: 1 } },
  ]);

  if (result.length > 0) {
    return result[0];
  }

  await FlagQuestion.updateMany(
    { isActive: true },
    {
      $set: {
        used: false,
        usedAt: null,
      },
    }
  );

  result = await FlagQuestion.aggregate([
    {
      $match: {
        isActive: true,
        used: false,
      },
    },
    { $sample: { size: 1 } },
  ]);

  return result[0] || null;
}
/**function getRandomQuestion() {

  const activeQuestions = questions.filter(q => q.isActive !== false);

  if (!activeQuestions.length) return null;

  const randomIndex = Math.floor(Math.random() * activeQuestions.length);

  return activeQuestions[randomIndex];
}
**/
async function upsertUserScore({ guildId, userId, username, points }) {
  return UserScore.findOneAndUpdate(
    { guildId, userId },
    {
      $set: { username },
      $inc: { points, wins: 1 },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );
}

async function refreshLeaderboard(guildId) {
  try {
    const config = await GuildConfig.findOne({ guildId, isStarted: true }).lean();
    if (!config) return;

    const channel = await client.channels.fetch(config.leaderboardChannelId).catch(() => null);
    if (!channel) return;

    const topUsers = await UserScore.find({ guildId })
      .sort({ points: -1, wins: -1, updatedAt: 1 })
      .limit(10)
      .lean();

    const guild = await client.guilds.fetch(guildId).catch(() => null);
    const embed = buildLeaderboardEmbed(guild?.name || "Server", topUsers);

    let leaderboardMessage = null;
    if (config.leaderboardMessageId) {
      leaderboardMessage = await channel.messages
        .fetch(config.leaderboardMessageId)
        .catch(() => null);
    }

    if (leaderboardMessage) {
      await leaderboardMessage.edit({ embeds: [embed] });
    } else {
      const sent = await channel.send({ embeds: [embed] });
      await GuildConfig.updateOne(
        { guildId },
        { $set: { leaderboardMessageId: sent.id } }
      );
    }
  } catch (error) {
    console.error(`❌ Failed to refresh leaderboard for guild ${guildId}:`, error);
  }
}

async function askQuestionForGuild(guildId) {
  try {
    const config = await GuildConfig.findOne({ guildId, isStarted: true }).lean();
    if (!config) return false;

    const existingRound = await ActiveRound.findOne({ guildId, solved: false }).lean();
    if (existingRound) return false;

    const question = await getRandomQuestion();
    if (!question) return false;

    const triviaChannel = await client.channels.fetch(config.triviaChannelId).catch(() => null);
    if (!triviaChannel) return false;

    const embed = buildQuestionEmbed(question);
    const sent = await triviaChannel.send({ embeds: [embed] });

    await ActiveRound.findOneAndUpdate(
      { guildId },
      {
        $set: {
          guildId,
          channelId: triviaChannel.id,
          questionId: question._id,
          questionText: question.question,
          normalizedAnswers: question.normalizedAnswers,
          points: question.points || 10,
          messageId: sent.id,
          solved: false,
          winnerUserId: null,
          winnerUsername: null,
          winningAnswer: null,
          solvedAt: null,
          askedAt: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    return true;
  } catch (error) {
    console.error(`❌ Failed to ask question for guild ${guildId}:`, error);
    return false;
  }
}

async function askFlagQuestionForGuild(guildId) {
  try {
    const config = await GuildConfig.findOne({ guildId, isStarted: true }).lean();
    if (!config) return false;

    const existingFlagRound = await ActiveFlagRound.findOne({
      guildId,
      solved: false,
    }).lean();

    if (existingFlagRound) return false;

    const flagQuestion = await getRandomFlagQuestion();
    if (!flagQuestion) return false;

    const triviaChannel = await client.channels
      .fetch(config.triviaChannelId)
      .catch(() => null);

    if (!triviaChannel) return false;

    const embed = buildFlagQuestionEmbed(flagQuestion);
    await triviaChannel.send({ embeds: [embed] });

    await ActiveFlagRound.findOneAndUpdate(
      { guildId },
      {
        $set: {
          guildId,
          channelId: triviaChannel.id,
          flagQuestionId: flagQuestion._id,
          country: flagQuestion.country,
          normalizedAnswers: flagQuestion.normalizedAnswers,
          imageUrl: flagQuestion.imageUrl,
          points: flagQuestion.points || 15,
          solved: false,
          winnerUserId: null,
          winnerUsername: null,
          winningAnswer: null,
          solvedAt: null,
          askedAt: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    await FlagQuestion.updateOne(
      { _id: flagQuestion._id },
      {
        $set: {
          used: true,
          usedAt: new Date(),
        },
      }
    );

    return true;
  } catch (error) {
    console.error(`❌ Failed to ask flag question for guild ${guildId}:`, error);
    return false;
  }
}



async function refreshAllLeaderboards() {
  const configs = await GuildConfig.find({ isStarted: true }).lean();
  for (const config of configs) {
    await refreshLeaderboard(config.guildId);
  }
}

async function askQuestionsForAllGuilds() {
  const configs = await GuildConfig.find({ isStarted: true }).lean();
  for (const config of configs) {
    await askQuestionForGuild(config.guildId);
  }
}

async function askFlagQuestionsForAllGuilds() {
  const configs = await GuildConfig.find({ isStarted: true }).lean();
  for (const config of configs) {
    await askFlagQuestionForGuild(config.guildId);
  }
}


function hasIntervalPassed(lastTime, intervalMinutes) {
  if (!lastTime) return true;

  const now = Date.now();
  const diffMs = now - new Date(lastTime).getTime();
  const requiredMs = intervalMinutes * 60 * 1000;

  return diffMs >= requiredMs;
}

async function runDynaicGameScheduler() {
  const configs = await GuildConfig.find({ isStarted: true }).lean();

  for (const config of configs) {
    if (hasIntervalPassed(config.lastTriviaAt, config.triviaInterval || 60)) {
      const sentTrivia = await askQuestionForGuild(config.guildId);

      if (sentTrivia) {
        await GuildConfig.updateOne(
          { guildId: config.guildId },
          { $set: { lastTriviaAt: new Date() } }
        );
      }
    }

    if (hasIntervalPassed(config.lastFlagAt, config.gtfInterval || 120)) {
      const sentFlag = await askFlagQuestionForGuild(config.guildId);

      if (sentFlag) {
        await GuildConfig.updateOne(
          { guildId: config.guildId },
          { $set: { lastFlagAt: new Date() } }
        );
      }
    }
  }
}
// =====================================================
// Cron Jobs
// =====================================================
let schedulersStarted = false;

function startSchedulers() {

  if (schedulersStarted) return;
  schedulersStarted = true

  cron.schedule("* * * * *", async () =>{
    console.log("Rrunning Dynamic Interval Scheduler...")
    await runDynaicGameScheduler()
  })

  cron.schedule("*/5 * * * *", async () => {
    console.log("Running Leaderboard Refersh Scheduler")
    await refreshAllLeaderboards()
  })
  console.log("✅ Schedulers started");
}

// =====================================================
// Discord Events
// =====================================================
client.once("ready", async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);

  await registerSlashCommands();
  startSchedulers();
  await refreshAllLeaderboards();
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (!interaction.guildId) return;

  const isAdmin = interaction.memberPermissions?.has(
    PermissionsBitField.Flags.Administrator
  );

  if (!isAdmin) {
    return interaction.reply({
      content: "Only admins can use this command.",
      ephemeral: true,
    });
  }

  try {
    if (interaction.commandName === "trivia-setup") {
      const triviaChannel = interaction.options.getChannel("trivia_channel");
      const leaderboardChannel = interaction.options.getChannel("leaderboard_channel");
      const triviaInterval = interaction.options.getInteger("trivia_interval");
      const gtfInterval = interaction.options.getInteger("gtf_interval");
    
      await GuildConfig.findOneAndUpdate(
        { guildId: interaction.guildId },
        {
          $set: {
            guildId: interaction.guildId,
            triviaChannelId: triviaChannel.id,
            leaderboardChannelId: leaderboardChannel.id,
            isStarted: true,
            triviaInterval,
            gtfInterval,
            lastTriviaAt: null,
            lastFlagAt: null,
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );
    
      await refreshLeaderboard(interaction.guildId);
    
      return interaction.reply({
        embeds: [
          buildSetupEmbed(
            triviaChannel,
            leaderboardChannel,
            triviaInterval,
            gtfInterval
          ),
        ],
        ephemeral: true,
      });
    }

    if (interaction.commandName === "trivia-reset") {
      await UserScore.deleteMany({ guildId: interaction.guildId });
      await refreshLeaderboard(interaction.guildId);

      return interaction.reply({
        embeds: [buildResetEmbed()],
        ephemeral: true,
      });
    }
    if (interaction.commandName === "trivia-reset-setup") {

      await GuildConfig.deleteOne({ guildId: interaction.guildId });
    
      await ActiveRound.deleteOne({ guildId: interaction.guildId });
    
      await UserScore.deleteMany({ guildId: interaction.guildId });
      await ActiveFlagRound.deleteOne({ guildId: interaction.guildId });
    
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("⚠️ Trivia Setup Reset")
        .setDescription("The trivia bot setup has been completely removed from this server.\n\nRun `/trivia-setup` again to start it.")
        .setTimestamp();
    
      return interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    
    }
    if (interaction.commandName === "send-trivia") {
      const config = await GuildConfig.findOne({
        guildId: interaction.guildId,
        isStarted: true,
      });
    
      if (!config) {
        return interaction.reply({
          content: "Trivia is not set up yet. Run `/trivia-setup` first.",
          ephemeral: true,
        });
      }
    
      const existingRound = await ActiveRound.findOne({
        guildId: interaction.guildId,
        solved: false,
      });
    
      if (existingRound) {
        return interaction.reply({
          content: "There is already an active trivia round in this server.",
          ephemeral: true,
        });
      }
    
      await askQuestionForGuild(interaction.guildId);
    
      return interaction.reply({
        content: "✅ Test trivia question sent successfully.",
        ephemeral: true,
      });
    }
    if (interaction.commandName === "send-flag-trivia") {

      const config = await GuildConfig.findOne({
        guildId: interaction.guildId,
        isStarted: true
      });
    
      if (!config) {
        return interaction.reply({
          content: "Trivia is not set up yet. Run `/trivia-setup` first.",
          ephemeral: true
        });
      }
    
      const existingRound = await ActiveFlagRound.findOne({
        guildId: interaction.guildId,
        solved: false
      });
    
      if (existingRound) {
        return interaction.reply({
          content: "There is already an active Guess the Flag round.",
          ephemeral: true
        });
      }
    
      await askFlagQuestionForGuild(interaction.guildId);
    
      return interaction.reply({
        content: "🚩 Guess the Flag question sent.",
        ephemeral: true
      });
    
    }
  } catch (error) {
    console.error("❌ Interaction error:", error);

    if (interaction.replied || interaction.deferred) {
      return interaction.followUp({
        content: "Something went wrong while running that command.",
        ephemeral: true,
      });
    }

    return interaction.reply({
      content: "Something went wrong while running that command.",
      ephemeral: true,
    });
  }
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild || !message.content) return;

  try {
    const normalized = normalizeAnswer(message.content);
    if (!normalized) return;

    // =========================
    // Normal Trivia Check
    // =========================
    const claimedRound = await ActiveRound.findOneAndUpdate(
      {
        guildId: message.guild.id,
        channelId: message.channel.id,
        solved: false,
        normalizedAnswers: normalized,
      },
      {
        $set: {
          solved: true,
          winnerUserId: message.author.id,
          winnerUsername: message.author.username,
          winningAnswer: message.content,
          solvedAt: new Date(),
        },
      },
      {
        new: true,
      }
    );

    if (claimedRound) {
      await message.react("✅").catch(() => null);

      await upsertUserScore({
        guildId: message.guild.id,
        userId: message.author.id,
        username: message.author.username,
        points: claimedRound.points,
      });

      await message.channel.send({
        embeds: [
          buildCorrectAnswerEmbed(
            `<@${message.author.id}>`,
            claimedRound.points,
            message.content
          ),
        ],
      });

      await refreshLeaderboard(message.guild.id);
      return;
    }

    // =========================
    // Guess The Flag Check
    // =========================
    const claimedFlagRound = await ActiveFlagRound.findOneAndUpdate(
      {
        guildId: message.guild.id,
        channelId: message.channel.id,
        solved: false,
        normalizedAnswers: normalized,
      },
      {
        $set: {
          solved: true,
          winnerUserId: message.author.id,
          winnerUsername: message.author.username,
          winningAnswer: message.content,
          solvedAt: new Date(),
        },
      },
      {
        new: true,
      }
    );

    if (claimedFlagRound) {
      await message.react("✅").catch(() => null);

      await upsertUserScore({
        guildId: message.guild.id,
        userId: message.author.id,
        username: message.author.username,
        points: claimedFlagRound.points || 15,
      });

      await message.channel.send({
        embeds: [
          buildFlagWinnerEmbed(
            `<@${message.author.id}>`,
            claimedFlagRound.points || 15,
            message.content,
            claimedFlagRound.country
          ),
        ],
      });

      await refreshLeaderboard(message.guild.id);
      return;
    }
  } catch (error) {
    console.error("❌ Message handling error:", error);
  }
});

// =====================================================
// IIFE Startup
// =====================================================
(async () => {
  try {
    if (!process.env.DISCORD_TOKEN) {
      throw new Error("Missing DISCORD_TOKEN in .env");
    }

    if (!process.env.CLIENT_ID) {
      throw new Error("Missing CLIENT_ID in .env");
    }

    if (!process.env.MONGO_URL) {
      throw new Error("Missing MONGODB_URI in .env");
    }

    await mongoose.connect(process.env.MONGO_URL, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log("✅ Connected to MongoDBconsole.log");

    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    console.error("❌ Startup failed:", error);
  }
})();

console.log("Sattu is a latkhor piggy")