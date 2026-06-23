import { describe, it, afterEach } from "node:test";
import assert from "node:assert";
import { ffmpegTransformTo16Hz } from "../../src/services/ffmpeg.js";
import path from "node:path";
import { existsSync, unlinkSync } from "node:fs";

const oggFile = path.resolve(
  import.meta.dirname,
  "../fixtures/temp_1780586658962.ogg",
);
const wavFile = path.resolve(
  import.meta.dirname,
  "../fixtures/temp_1780586658962.wav",
);
describe("ffmpeg", () => {
  afterEach(() => {
    if (existsSync(wavFile)) {
      unlinkSync(wavFile);
    }
  });

  it("transforms an ogg to 16Hz wav", async () => {
    const wavFilePath = await ffmpegTransformTo16Hz(oggFile);
    assert.strictEqual(wavFilePath, wavFile);
    assert.ok(existsSync(wavFilePath));
  });
});
