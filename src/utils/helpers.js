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
    
    .setTitle("<:flagguess:1482692699156119664> Guess the flag ?")
    .setDescription(["**First to guess the flag wins**", ""].join("\n"))
    .setImage(flagData.imageUrl)
    .setFooter({
      text: "Guess the flag • First correct answer wins",
    })
    .setTimestamp();
} 

export function buildLanguageQuestionEmbed(languageData) {
  return new EmbedBuilder()
    .setColor(0x9b59b6)
    
    .setTitle("<:brain:1480948942282952735> Guess the language!")
    .setDescription(
      [
        "**In what language do we say: **",
        "",
        `*\"${languageData.sampleText}\"*`,
      ].join("\n")
    )
    .addFields(
      {
        name: "<:worldmap:1482686661207920709> Region",
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

export function buildTypingRaceQuestionEmbed(raceData) {
  return new EmbedBuilder()
    .setColor(0xe67e22)
    .setTitle("🏁 Typing Race!")
    .setDescription(
      [
        "**Type the following sentence first:**",
        "",
        `*${raceData.text}*`,
      ].join("\n")
    )
    .addFields({
      name: "<:giftcard:1480952956445659218> Reward",
      value: `\`${raceData.points || 20} pts\``,
      inline: true,
    })
    .setFooter({
      text: "Type the sentence • First one to type correctly wins!",
    })
    .setTimestamp();
}

export function buildAnimeCharacterEmbed(data) {
  return new EmbedBuilder()
    .setColor(0xff4757)
    .setTitle("🎌 Guess the anime character !")
    .setDescription("**Who is this anime character ?**")
    .setImage(data.imageUrl)
    .addFields({
      name: "<:giftcard:1480952956445659218> Reward",
      value: `\`${data.points || 20} pts\``,
      inline: true,
    })
    .setFooter({
      text: "Guess the Character • First one to type correctly wins!",
    })
    .setTimestamp();
}

export function buildLogoEmbed(data) {
  return new EmbedBuilder()
    .setColor(0x1abc9c)
    .setTitle("🧩 Guess the logo!")
    .setDescription("**Which brand is this?**")
    .setImage(data.imageUrl)
    .addFields(
      {
        name: "📚 Category",
        value: `\`${data.category || "General"}\``,
        inline: true,
      },
      {
        name: "<:giftcard:1480952956445659218> Reward",
        value: `\`${data.points} pts\``,
        inline: true,
    },
    
    {
      name: "<:target2:1480956785715187872> Difficulty",
      value: `\`${difficultyBadge(data.difficulty || "Medium")}\``,
      inline: true,
    },
    )
    .setFooter({
      text: "Guess the Logo • First one to type correctly wins!",
    })
    .setTimestamp();
}
export function buildFlagWinnerEmbed(user, points, rank, leaderboardChannelId) {
  return new EmbedBuilder()
    .setColor(0x2ecc71)
    .setAuthor({
      name: "🎉 Correct Flag Guess!",
      iconURL: client.user?.displayAvatarURL() || undefined,
    })
    .setDescription(
      [
        `🏅 **Rank:** \`#${rank}\``,
        `<:info:1481610239102161096> ${user} won ${points} points. <:gems_5:1480828695466741831>`,
        `<:lb_check:1481611597423186012> **Check the Rankings:** <#${leaderboardChannelId}>`,
      ].join("\n")
    )
    .setFooter({
      text: "This round is now closed",
    })
    .setTimestamp();
}

export function buildLanguageWinnerEmbed(user, points, rank, leaderboardChannelId) {
  return new EmbedBuilder()
    .setColor(0x2ecc71)
    .setAuthor({
      name: "🎉 Correct Language Guess!",
      iconURL: client.user?.displayAvatarURL() || undefined,
    })
    .setDescription(
      [
        `🏅 **Rank:** \`#${rank}\``,
        `<:info:1481610239102161096> ${user} won ${points} points. <:gems_5:1480828695466741831>`,
        `<:lb_check:1481611597423186012> **Check the Rankings:** <#${leaderboardChannelId}>`,
      ].join("\n")
    )
    .setFooter({
      text: "This round is now closed",
    })
    .setTimestamp();
}

export function buildTypingRaceWinnerEmbed(user, points, rank, leaderboardChannelId) {
  return new EmbedBuilder()
    .setColor(0x2ecc71)
    .setAuthor({
      name: "🎉 Typing Race Winner!",
      iconURL: client.user?.displayAvatarURL() || undefined,
    })
    .setDescription(
      [
        `🏅 **Rank:** \`#${rank}\``,
        `<:info:1481610239102161096> ${user} won ${points} points. <:gems_5:1480828695466741831>`,
        `<:lb_check:1481611597423186012> **Check the Rankings:** <#${leaderboardChannelId}>`,
      ].join("\n")
    )
    .setFooter({
      text: "This round is now closed",
    })
    .setTimestamp();
}

export function buildAnimeCharacterWinnerEmbed(user, points, rank, leaderboardChannelId) {
  return new EmbedBuilder()
    .setColor(0x2ecc71)
    .setAuthor({
      name: "🎉 Correct Anime Character Guess !",
      iconURL: client.user?.displayAvatarURL() || undefined,
    })
    .setDescription(
      [
        `🏅 **Rank:** \`#${rank}\``,
        `<:info:1481610239102161096> ${user} won ${points} points. <:gems_5:1480828695466741831>`,
        `<:lb_check:1481611597423186012> **Check the Rankings:** <#${leaderboardChannelId}>`,
      ].join("\n")
    )
    .setTimestamp();
}

export function buildLogoWinnerEmbed(user, points, rank, leaderboardChannelId) {
  return new EmbedBuilder()
    .setColor(0x2ecc71)
    .setAuthor({
      name: "🎉 Correct Logo Guess !",
      iconURL: client.user?.displayAvatarURL() || undefined,
    })
    .setDescription(
      [
        `🏅 **Rank:** \`#${rank}\``,
        `<:info:1481610239102161096> ${user} won ${points} points. <:gems_5:1480828695466741831>`,
        `<:lb_check:1481611597423186012> **Check the Rankings:** <#${leaderboardChannelId}>`,
      ].join("\n")
    )
    .setTimestamp();
}
export function buildSetupEmbed(
  triviaChannel,
  leaderboardChannel,
  gameInterval
) {
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
        `**📌 Boards in that channel:** \`Weekly + Permanent\``,
        `**🔁 Rotation:** \`Trivia → Flag → Language → Typing → Anime → Logo\``,
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
    .setTitle("🗑️ Weekly Leaderboard Reset")
    .setDescription("The weekly trivia leaderboard has been cleared.")
    .setTimestamp();
}

export function buildCorrectAnswerEmbed(user, points, answer, rank, leaderboardChannelId) {
  return new EmbedBuilder()
    .setColor(0x57f287)
    .setAuthor({
      name: "🎉 Correct Trivia Answer!",
      iconURL: client.user?.displayAvatarURL() || undefined,
    })
    .setDescription(
      [
        `🏅 **Rank:** \`#${rank}\``,
        `<:info:1481610239102161096> ${user} won ${points} points. <:gems_5:1480828695466741831>`,
        `<:lb_check:1481611597423186012> **Check the Rankings:** <#${leaderboardChannelId}>`,
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
    .setTitle("<:times_clock:1482649775403831369> Trivia - Time's Up!")
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
    .setTitle("<:times_clock:1482649775403831369> Flag Guessing - Time's Up!")
    .setDescription(
      [
        "No one guessed correctly!",
        `The flag was : \`${correctAnswer}\``,
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
    .setTitle("<:times_clock:1482649775403831369> Language Guessing - Time's Up!")
    .setDescription(
      [
        "No one guessed correctly!",
        `The language was : \`${correctAnswer}\``,
      ].join("\n")
    )
    .setFooter({
      text: "This language round has ended",
    })
    .setTimestamp();
}

export function buildTypingRaceTimeoutEmbed(correctAnswer) {
  return new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("<:times_clock:1482649775403831369> Typing Race - Time's Up!")
    .setDescription(
      [
        "No one typed it correctly or in time!",
        `The sentence was : \`${correctAnswer}\``,
      ].join("\n")
    )
    .setFooter({
      text: "This typing race has ended",
    })
    .setTimestamp();
}

export function buildAnimeCharacterTimeoutEmbed(answer) {
  return new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("<:times_clock:1482649775403831369> Character Guessing - Time's Up!")
    .setDescription(
      [
        "No one guessed the character!",
        `The character was: \`${answer}\``,
      ].join("\n")
    )
    .setTimestamp();
}

export function buildLogoTimeoutEmbed(answer) {
  return new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("<:times_clock:1482649775403831369> Logo Guessing - Time's Up!")
    .setDescription(
      [
        "No one guessed the logo!",
        `The logo was of : \`${answer}\``,
      ].join("\n")
    )
    .setTimestamp();
}

export function buildLeaderboardEmbed(guildName, topUsers, options = {}) {
  const {
    boardType = "Weekly",
    winnerOfWeekText = null,
  } = options;

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

  const winnerLine = winnerOfWeekText
    ? `**Winner of the week - ${winnerOfWeekText}**\n\n`
    : "";

  return new EmbedBuilder()
    .setColor(0xf1c40f)
    .setAuthor({
      name: `${guildName} Trivia Rankings`,
      iconURL: client.user?.displayAvatarURL() || undefined,
    })
    .setThumbnail(client.user?.displayAvatarURL() || undefined)
    .setTitle(`__${boardType} Trivia Ranking__`)
    .setDescription(`\n${winnerLine}${description}`)
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