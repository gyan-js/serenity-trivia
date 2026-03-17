import { PermissionsBitField } from "discord.js";
import { client } from "../config/client.js";
import {
  ActiveRound,
  ActiveFlagRound,
  ActiveLanguageRound,
  ActiveTypingRaceRound,
  ActiveAnimeCharacterRound,
  ActiveLogoRound,

} from "../models/index.js";
import { normalizeAnswer } from "../utils/helpers.js";
import {
  registerSlashCommands,
  startSchedulers,
  refreshAllLeaderboards,
  handleTriviaSetup,
  handleTriviaReset,
  handleTriviaResetSetup,
  handleSendTrivia,
  handleSendFlagTrivia,
  handleSendLanguageTrivia,
  handleCorrectTriviaAnswer,
  handleCorrectFlagAnswer,
  handleCorrectLanguageAnswer,
  handleSendTypingRace,
  handleCorrectTypingRaceAnswer,
  handleCorrectAnimeAnswer,
  handleSendAnime,
  handleCorrectLogoAnswer,
  handleSendLogo
  
} from "../services/triviaService.js";

export function registerDiscordEvents() {
  client.once("ready", async () => {
    console.log(`🤖 Logged in as ${client.user.tag}`);

    client.user.setPresence({
      status: "online",
      activities: [
        {
          name: "discord.gg/serenityontop",
          type: 0,
        },
      ],
    });

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
        return await handleTriviaSetup(interaction);
      }

      if (interaction.commandName === "trivia-reset") {
        return await handleTriviaReset(interaction);
      }

      if (interaction.commandName === "trivia-reset-setup") {
        return await handleTriviaResetSetup(interaction);
      }

      if (interaction.commandName === "send-trivia") {
        return await handleSendTrivia(interaction);
      }

      if (interaction.commandName === "send-flag-trivia") {
        return await handleSendFlagTrivia(interaction);
      }

      if (interaction.commandName === "send-language-trivia") {
        return await handleSendLanguageTrivia(interaction);
      }
      if (interaction.commandName === "send-typing-race") {
        return await handleSendTypingRace(interaction);
      }
      if (interaction.commandName === "send-anime") {
        return await handleSendAnime(interaction);
      }
      if (interaction.commandName === "send-logo") {
        return await handleSendLogo(interaction);
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
        await handleCorrectTriviaAnswer(message, claimedRound);
        return;
      }

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
        await handleCorrectFlagAnswer(message, claimedFlagRound);
        return;
      }

      const claimedLanguageRound = await ActiveLanguageRound.findOneAndUpdate(
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

      if (claimedLanguageRound) {
        await handleCorrectLanguageAnswer(message, claimedLanguageRound);
        return;
      }
      const claimedTypingRound = await ActiveTypingRaceRound.findOneAndUpdate(
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

      if (claimedTypingRound) {
        await handleCorrectTypingRaceAnswer(message, claimedTypingRound);
        return;
      }

      const claimedAnime = await ActiveAnimeCharacterRound.findOneAndUpdate(
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
        { new: true }
      );
      
      if (claimedAnime) {
        await handleCorrectAnimeAnswer(message, claimedAnime);
        return;
      }

      const claimedLogo = await ActiveLogoRound.findOneAndUpdate(
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
        { new: true }
      );
      
      if (claimedLogo) {
        await handleCorrectLogoAnswer(message, claimedLogo);
        return;
      }
    } catch (error) {
      console.error("❌ Message handling error:", error);
    }
  });
}