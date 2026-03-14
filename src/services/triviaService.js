import cron from "node-cron";
import {
  SlashCommandBuilder,
  ChannelType,
  REST,
  Routes,
  EmbedBuilder,
  PermissionsBitField,
} from "discord.js";

import { client } from "../config/client.js";
import {
  GuildConfig,
  UserScore,
  TriviaQuestion,
  ActiveRound,
  FlagQuestion,
  ActiveFlagRound,
} from "../models/index.js";
import {
  buildQuestionEmbed,
  buildFlagQuestionEmbed,
  buildSetupEmbed,
  buildResetEmbed,
  buildCorrectAnswerEmbed,
  buildFlagWinnerEmbed,
  buildTriviaTimeoutEmbed,
  buildFlagTimeoutEmbed,
  buildLeaderboardEmbed,
} from "../utils/helpers.js";

export async function registerSlashCommands() {
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
          .setName("game_interval")
          .setDescription("Time interval between each game rotation")
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

export async function getRandomQuestion() {
  const result = await TriviaQuestion.aggregate([
    { $match: { isActive: true } },
    { $sample: { size: 1 } },
  ]);

  return result[0] || null;
}

export async function getRandomFlagQuestion() {
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

export async function upsertUserScore({ guildId, userId, username, points }) {
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

export async function refreshLeaderboard(guildId) {
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

export async function askQuestionForGuild(guildId) {
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
          answers: question.answers,
          normalizedAnswers: question.normalizedAnswers,
          points: question.points || 10,
          messageId: sent.id,
          solved: false,
          winnerUserId: null,
          winnerUsername: null,
          winningAnswer: null,
          solvedAt: null,
          askedAt: new Date(),
          expiresAt: new Date(Date.now() + 60 * 1000),
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

export async function askFlagQuestionForGuild(guildId) {
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
          expiresAt: new Date(Date.now() + 60 * 1000),
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

export async function refreshAllLeaderboards() {
  const configs = await GuildConfig.find({ isStarted: true }).lean();
  for (const config of configs) {
    await refreshLeaderboard(config.guildId);
  }
}

export function hasIntervalPassed(lastTime, intervalMinutes) {
  if (!lastTime) return true;

  const now = Date.now();
  const diffMs = now - new Date(lastTime).getTime();
  const requiredMs = intervalMinutes * 60 * 1000;

  return diffMs >= requiredMs;
}

export async function runDynaicGameScheduler() {
  const configs = await GuildConfig.find({ isStarted: true }).lean();

  for (const config of configs) {
    const interval = config.gameInterval || config.triviaInterval || 10;
    const nextGameType = config.nextGameType || "trivia";

    if (!hasIntervalPassed(config.lastGameAt, interval)) {
      continue;
    }

    let sent = false;

    if (nextGameType === "trivia") {
      sent = await askQuestionForGuild(config.guildId);

      if (sent) {
        await GuildConfig.updateOne(
          { guildId: config.guildId },
          {
            $set: {
              lastGameAt: new Date(),
              nextGameType: "flag",
            },
          }
        );
      }
    } else {
      sent = await askFlagQuestionForGuild(config.guildId);

      if (sent) {
        await GuildConfig.updateOne(
          { guildId: config.guildId },
          {
            $set: {
              lastGameAt: new Date(),
              nextGameType: "trivia",
            },
          }
        );
      }
    }
  }
}

export async function closeExpiredTriviaRounds() {
  const expiredRounds = await ActiveRound.find({
    solved: false,
    expiresAt: { $lte: new Date() },
  });

  for (const round of expiredRounds) {
    const updated = await ActiveRound.findOneAndUpdate(
      {
        _id: round._id,
        solved: false,
      },
      {
        $set: {
          solved: true,
          solvedAt: new Date(),
        },
      },
      {
        new: true,
      }
    );

    if (!updated) continue;

    const channel = await client.channels.fetch(updated.channelId).catch(() => null);
    if (!channel) continue;

    const correctAnswer =
      Array.isArray(updated.answers) && updated.answers.length > 0
        ? updated.answers[0]
        : "Unknown";

    await channel
      .send({
        embeds: [buildTriviaTimeoutEmbed(correctAnswer)],
      })
      .catch(() => null);
  }
}

export async function closeExpiredFlagRounds() {
  const expiredRounds = await ActiveFlagRound.find({
    solved: false,
    expiresAt: { $lte: new Date() },
  });

  for (const round of expiredRounds) {
    const updated = await ActiveFlagRound.findOneAndUpdate(
      {
        _id: round._id,
        solved: false,
      },
      {
        $set: {
          solved: true,
          solvedAt: new Date(),
        },
      },
      {
        new: true,
      }
    );

    if (!updated) continue;

    const channel = await client.channels.fetch(updated.channelId).catch(() => null);
    if (!channel) continue;

    const correctAnswer = updated.country || "Unknown";

    await channel
      .send({
        embeds: [buildFlagTimeoutEmbed(correctAnswer)],
      })
      .catch(() => null);
  }
}

export async function processExpiredRounds() {
  await closeExpiredTriviaRounds();
  await closeExpiredFlagRounds();
}

let schedulersStarted = false;

export function startSchedulers() {
  if (schedulersStarted) return;
  schedulersStarted = true;

  cron.schedule("* * * * *", async () => {
    console.log("Rrunning Dynamic Interval Scheduler...");
    await runDynaicGameScheduler();
  });

  cron.schedule("*/5 * * * *", async () => {
    console.log("Running Leaderboard Refersh Scheduler");
    await refreshAllLeaderboards();
  });

  cron.schedule("*/35 * * * * *", async () => {
    await processExpiredRounds();
    console.log("Running ExpiredRound Timeout Scheduler");
  });

  console.log("✅ Schedulers started");
}

export async function handleTriviaSetup(interaction) {
  const triviaChannel = interaction.options.getChannel("trivia_channel");
  const leaderboardChannel = interaction.options.getChannel("leaderboard_channel");
  const gameInterval = interaction.options.getInteger("game_interval");

  await GuildConfig.findOneAndUpdate(
    { guildId: interaction.guildId },
    {
      $set: {
        guildId: interaction.guildId,
        triviaChannelId: triviaChannel.id,
        leaderboardChannelId: leaderboardChannel.id,
        isStarted: true,
        gameInterval,
        lastGameAt: null,
        nextGameType: "trivia",

        // old fields reset for backward safety
        triviaInterval: gameInterval,
        gtfInterval: gameInterval,
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
    embeds: [buildSetupEmbed(triviaChannel, leaderboardChannel, gameInterval)],
    ephemeral: true,
  });
}

export async function handleTriviaReset(interaction) {
  await UserScore.deleteMany({ guildId: interaction.guildId });
  await refreshLeaderboard(interaction.guildId);

  return interaction.reply({
    embeds: [buildResetEmbed()],
    ephemeral: true,
  });
}

export async function handleTriviaResetSetup(interaction) {
  const guildId = interaction.guildId;

  const config = await GuildConfig.findOne({ guildId });

  if (config?.leaderboardChannelId && config?.leaderboardMessageId) {
    try {
      const channel = await client.channels
        .fetch(config.leaderboardChannelId)
        .catch(() => null);

      if (channel) {
        const msg = await channel.messages
          .fetch(config.leaderboardMessageId)
          .catch(() => null);

        if (msg) {
          await msg.delete().catch(() => null);
        }
      }
    } catch (err) {
      console.error("Failed to delete leaderboard message:", err);
    }
  }

  await GuildConfig.deleteOne({ guildId });
  await ActiveRound.deleteOne({ guildId });
  await UserScore.deleteMany({ guildId });
  await ActiveFlagRound.deleteOne({ guildId });

  const embed = new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("⚠️ Trivia Setup Reset")
    .setDescription(
      "The trivia bot setup has been completely removed from this server.\n\nRun `/trivia-setup` again to start it."
    )
    .setTimestamp();

  return interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

export async function handleSendTrivia(interaction) {
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

export async function handleSendFlagTrivia(interaction) {
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

  const existingRound = await ActiveFlagRound.findOne({
    guildId: interaction.guildId,
    solved: false,
  });

  if (existingRound) {
    return interaction.reply({
      content: "There is already an active Guess the Flag round.",
      ephemeral: true,
    });
  }

  await askFlagQuestionForGuild(interaction.guildId);

  return interaction.reply({
    content: "🚩 Guess the Flag question sent.",
    ephemeral: true,
  });
}

export async function handleCorrectTriviaAnswer(message, claimedRound) {
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
}

export async function handleCorrectFlagAnswer(message, claimedFlagRound) {
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
}