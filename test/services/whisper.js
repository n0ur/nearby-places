import { describe, it } from "node:test";
import assert from "node:assert";
import { whisperService } from "../../src/services/whisper.js";
import path from "node:path";

const wavFile = path.resolve(import.meta.dirname, "../fixtures/transcribe.wav");

describe("WhisperService", () => {
  it("transcribes a wav file", async () => {
    const transcription = await whisperService.transcribe(wavFile);
    assert.match(transcription, /test test/i);
  });
});
