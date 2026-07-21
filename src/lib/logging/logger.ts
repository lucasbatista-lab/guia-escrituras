import { redactLogFields } from "@/lib/logging/mask";

type LogLevel = "info" | "warn" | "error";

interface LogFields {
  requestId?: string;
  userId?: string;
  route?: string;
  [key: string]: unknown;
}

function write(level: LogLevel, message: string, fields: LogFields = {}) {
  const payload = {
    level,
    message,
    ts: new Date().toISOString(),
    ...redactLogFields(fields),
  };
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
}

export const logger = {
  info: (message: string, fields?: LogFields) =>
    write("info", message, fields),
  warn: (message: string, fields?: LogFields) =>
    write("warn", message, fields),
  error: (message: string, fields?: LogFields) =>
    write("error", message, fields),
};
