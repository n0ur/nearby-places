import { Bot, GrammyError, HttpError } from "grammy";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { whisperService } from "./whisper.js";
import { ffmpegTransformTo16Hz } from "./ffmpeg.js";

export const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

await bot.api.setMyCommands([
  { command: "start", description: "Start the bot" },
  { command: "help", description: "Show help text" },
  { command: "settings", description: "Open settings" },
]);

bot.command("start", (ctx) => {
  ctx.reply("Welcome! Up and running.");
});

bot.on("message:voice", async (ctx) => {
  try {
    const voice = ctx.msg.voice;

    const duration = voice.duration;
    await ctx.reply(`Your voice message is ${duration} seconds long.`);

    const fileId = voice.file_id;
    await ctx.reply("The file identifier of your voice message is: " + fileId);

    const file = await ctx.getFile(); // valid for at least 1 hour
    const filePath = file.file_path ?? "";
    await ctx.reply("Download your own file again: " + filePath);

    const fileName = `temp_${Date.now()}`;
    const oggFilePath = path.resolve("./data/", `${fileName}.ogg`);

    // Download file on server
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${filePath}`;
    const response = await fetch(fileUrl);
    const arrayBuffer = await response.arrayBuffer();
    await writeFile(oggFilePath, Buffer.from(arrayBuffer));

    await ctx.reply("File saved as:" + oggFilePath);

    const wavFilePath = await ffmpegTransformTo16Hz(oggFilePath);
    await ctx.reply("File transformed to:" + wavFilePath);
    const transcription = await whisperService.transcribe(wavFilePath);

    await ctx.reply("File transcription:" + transcription);
  } catch (e) {
    console.error(e);
    await ctx.reply(e.toString(), {
      reply_parameters: { message_id: ctx.msg.message_id },
    });
  } finally {
    // cleanup files
  }
});

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error("Error in request:", e.description);
  } else if (e instanceof HttpError) {
    console.error("Could not contact Telegram:", e);
  } else {
    console.error("Unknown error:", e);
  }
});
