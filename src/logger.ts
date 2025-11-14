import fs from "node:fs";
import path from "node:path";

const logDir = path.resolve("logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

function getLogFilePath(type: "info" | "error") {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const name = type === "info" ? `${date}.log` : `${date}-error.log`;
  return path.join(logDir, name);
}

export function logToFile(message: string) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFile(getLogFilePath("info"), line, () => {});
}

export function logError(message: string, error?: unknown) {
  const errText =
    error instanceof Error
      ? `${error.name}: ${error.message}\n${error.stack}`
      : JSON.stringify(error);

  const line = `[${new Date().toISOString()}] ${message}\n${errText}\n\n`;

  fs.appendFile(getLogFilePath("error"), line, () => {});
}
