import { EmbedBuilder } from "discord.js";
import { client } from "../config/client.js";

export function normalizeAnswer(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

export function ordinal(num) {
  const s = ["th", "st", "nd", "rd"];
  const v = num % 100;
  return `${num}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

export function difficultyBadge(level) {
  const normalized = String(level || "medium").toLowerCase();
  if (normalized === "easy") return "🟢 Easy";
  if (normalized === "hard") return "🔴 Hard";
  return "🟠 Medium";
}

export function buildQuestionEmbed(questionData) {
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

export function buildFlagQuestionEmbed(flagData) {
  return new EmbedBuilder()
    .setColor(0x3498db)
    .setAuthor({
      name: "🌍 Guess the Flag",
      iconURL: client.user?.displayAvatarURL() || undefined,
    })
    .setTitle("🚩Guess the flag ?")
    .setDescription(["**First to guess the flag wins**", ""].join("\n"))
    .setImage(flagData.imageUrl)
    .setFooter({
      text: "Professional Flag Challenge • Earn points for correct guess •",
    })
    .setTimestamp();
}

export function buildLanguageQuestionEmbed(languageData) {
  return new EmbedBuilder()
    .setColor(0x9b59b6)
    .setAuthor({
      name: "🗣️ Guess the Language",
      iconURL: client.user?.displayAvatarURL() || undefined,
    })
    .setTitle("🧠 Guess the language!")
    .setDescription(
      [
        "**Identify the language from this sample text:**",
        "",
        `>>> ${languageData.sampleText}`,
      ].join("\n")
    )
    .addFields(
      {
        name: "🌍 Region",
        value: `\`${languageData.region || "Unknown"}\``,
        inline: true,
      },
      {
        name: "<:target2:1480956785715187872> Difficulty",
        value: `\`${difficultyBadge(languageData.difficulty || "medium")}\``,
        inline: true,
      },
      {
        name: "<:giftcard:1480952956445659218> Reward",
        value: `\`${languageData.points || 12} pts\``,
        inline: true,
      }
    )
    .setFooter({
      text: "Guess the language • First correct answer wins",
    })
    .setTimestamp();
}

export function buildFlagWinnerEmbed(user, points, answer, country) {
  return new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle("🎉 Correct Flag Guess!")
    .setDescription(
      [
        `<:info:1481610239102161096> ${user} won ${points} points <:gems_5:1480828695466741831>!`,
        `<:lb_check:1481611597423186012> **Answer:** \`${answer}\``,
      ].join("\n")
    )
    .setFooter({
      text: "Win games to climb higher in the weekly lb",
    })
    .setTimestamp();
}

export function buildLanguageWinnerEmbed(user, points, answer) {
  return new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle("🎉 Correct Language Guess!")
    .setDescription(
      [
        `<:info:1481610239102161096> ${user} won ${points} points <:gems_5:1480828695466741831>!`,
        `<:lb_check:1481611597423186012> **Answer:** \`${answer}\``,
      ].join("\n")
    )
    .setFooter({
      text: "Win games to climb higher in the weekly lb",
    })
    .setTimestamp();
}

export function buildSetupEmbed(triviaChannel, leaderboardChannel, gameInterval) {
  return new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle("✅ Trivia System Activated")
    .setDescription(
      [
        "Your trivia bot has been set up successfully.",
        "",
        `**🧠 Trivia Channel:** ${triviaChannel}`,
        `**🏆 Leaderboard Channel:** ${leaderboardChannel}`,
        `**⏱️ Game Interval:** Every \`${gameInterval}\` minutes`,
        `**🔁 Rotation:** \`Trivia → Flag → Language\``,
      ].join("\n")
    )
    .setFooter({
      text: "Only admins can run setup and reset commands",
    })
    .setTimestamp();
}

export function buildResetEmbed() {
  return new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("🗑️ Leaderboard Reset")
    .setDescription("All trivia scores for this server have been cleared.")
    .setTimestamp();
}

export function buildCorrectAnswerEmbed(user, points, answer) {
  return new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle("🎉 Correct Trivia Answer!")
    .setDescription(
      [
        `<:info:1481610239102161096> ${user} won ${points} points. <:gems_5:1480828695466741831>!`,
        `<:lb_check:1481611597423186012> **Answer:** \`${answer}\``,
      ].join("\n")
    )
    .setFooter({
      text: "This round is now closed",
    })
    .setTimestamp();
}

export function buildTriviaTimeoutEmbed(correctAnswer) {
  return new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("⏰ Trivia - Time's Up!")
    .setDescription(
      [
        "No one guessed correctly!",
        `The answer was : \`${correctAnswer}\``,
      ].join("\n")
    )
    .setFooter({
      text: "This trivia round has ended",
    })
    .setTimestamp();
}

export function buildFlagTimeoutEmbed(correctAnswer) {
  return new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("🚩 Flag Guessing - Time's Up!")
    .setDescription(
      [
        "No one guessed correctly!",
        `The answer was : \`${correctAnswer}\``,
      ].join("\n")
    )
    .setFooter({
      text: "This flag round has ended",
    })
    .setTimestamp();
}

export function buildLanguageTimeoutEmbed(correctAnswer) {
  return new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("🗣️ Language Guessing - Time's Up!")
    .setDescription(
      [
        "No one guessed correctly!",
        `The answer was : \`${correctAnswer}\``,
      ].join("\n")
    )
    .setFooter({
      text: "This language round has ended",
    })
    .setTimestamp();
}

export function buildLeaderboardEmbed(guildName, topUsers) {
  let description = "";

  if (!topUsers.length) {
    description =
      "╭────────────────────────\n" +
      "✨ No champions yet.\n" +
      "Be the first to win a trivia round!\n" +
      "╰────────────────────────╯";
  } else {
    description = topUsers
      .map((user, index) => {
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