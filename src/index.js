import dotenv from "dotenv";
dotenv.config();

import dns from "node:dns/promises";
import mongoose from "mongoose";

import { client } from "./config/client.js";
import { registerDiscordEvents } from "./events/discordEvents.js";

dns.setServers(["1.1.1.1"]);

(async () => {
  try {
    if (!process.env.DISCORD_TOKEN) {
      throw new Error("Missing DISCORD_TOKEN in .env");
    }

    if (!process.env.CLIENT_ID) {
      throw new Error("Missing CLIENT_ID in .env");
    }

    if (!process.env.MONGO_URL) {
      throw new Error("Missing MONGO_URL in .env");
    }

    registerDiscordEvents();
    console.log("🎭 Registered Discord Events")
    await mongoose.connect(process.env.MONGO_URL, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log("🎃 Connected to MongoDB")

    await client.login(process.env.DISCORD_TOKEN)

    console.log("🎯 Logging in...")
  } catch (error) {
    console.error("❌ Startup failed:", error);
  }
})();