import { spawn } from "node:child_process";

export function ffmpegTransformTo16Hz(oggFilePath) {
  const wavFilePath = oggFilePath.replace(".ogg", ".wav");
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-i",
      oggFilePath,
      "-ar",
      "16000",
      "-ac",
      "1",
      "-c:a",
      "pcm_s16le",
      wavFilePath,
    ]);
    ffmpeg.stdout.on("data", (data) => {
      console.log(data.toString());
    });
    ffmpeg.on("error", (err) => {
      reject(err);
    });
    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve(wavFilePath);
      } else {
        reject(new Error(`Exited with error code: ${code}`));
      }
    });
    ffmpeg.on("exit", (code) => {
      if (code === 0) {
        resolve(wavFilePath);
      } else {
        reject(new Error(`Exited with error code: ${code}`));
      }
    });
  });
}
