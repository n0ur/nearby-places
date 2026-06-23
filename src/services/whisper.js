import { readFile } from "node:fs/promises";

class WhisperService {
  async transcribe(filePath) {
    const contents = await readFile(filePath);

    const form = new FormData();
    form.set("file", new Blob([contents]));
    form.set("temperature", "0.0");
    form.set("temperature_inc", "0.2");
    form.set("no_speech_thold", "0.6");
    form.set("response_format", "text");

    const url = new URL(process.env.WHISPERCPP_API_ENDPOINT);
    const response = await fetch(url, {
      method: "POST",
      body: form,
    });

    return response.text();
  }
}

export const whisperService = new WhisperService();
