const dasha = require("@dasha.ai/sdk");
const fs = require("fs");

async function main() {
  const app = await dasha.deploy("./app");
  await app.start();

  const conv = app.createConversation({ phone: process.argv[2] ?? "" });
  const audioChannel = conv.input.phone !== "chat";
  if (audioChannel) {
    conv.sip.config = "default";
  } else {
    await dasha.chat.createConsoleChat(conv);
  }

  if (audioChannel) conv.on("transcription", console.log);

  const logFile = await fs.promises.open("./log.txt", "w");
  await logFile.appendFile("#".repeat(100) + "\n");

  conv.on("transcription", async (entry) => {
    await logFile.appendFile(`${entry.speaker}: ${entry.text}\n`);
  });

  conv.on("debugLog", async (event) => {
    if (event?.msg?.msgId === "RecognizedSpeechMessage") {
      const logEntry = event?.msg?.results[0]?.facts;
      await logFile.appendFile(JSON.stringify(logEntry, undefined, 2) + "\n");
    }
  });

  const result = await conv.execute({
    channel: audioChannel ? "audio" : "text",
  });

  console.log(result.output);
  if (result.startTime || result.endTime) {
    console.log(`Job start time: ${result.startTime}`);
    console.log(`Job end time: ${result.endTime}`);
  }

  await app.stop();
  app.dispose();

  await logFile.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
