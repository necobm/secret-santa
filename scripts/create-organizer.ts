// Creates an Organizer account. The only way to create one (ADR-0003): the app has no sign-up.
//
//   npm run organizer:create -- ana@example.com
//
// The password is asked for without echoing it, so it never ends up in shell history.
// When stdin is not a terminal (e.g. `printf '%s\n' "$PASSWORD" | npm run …`), it reads one line.

import { createInterface } from "node:readline/promises";
import { createOrganizer, PASSWORD_MIN, type CreateOrganizerError } from "../src/accounts/accounts";
import { dbConfig, openDb } from "../src/db/client";

const MESSAGES: Record<CreateOrganizerError, string> = {
  "invalid-email": "That email does not look valid.",
  "password-too-short": `The password needs at least ${PASSWORD_MIN} characters.`,
  "password-too-long": "The password is too long.",
  "email-in-use": "An Organizer with that email already exists.",
};

async function askLine(question: string) {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: false });
  try {
    if (process.stdin.isTTY) process.stdout.write(question);
    for await (const line of rl) return line.trim();
    return "";
  } finally {
    rl.close();
  }
}

/** Reads a line from the terminal without echoing it. */
function askHidden(question: string): Promise<string> {
  const { stdin, stdout } = process;
  stdout.write(question);
  stdin.setRawMode(true);
  stdin.setEncoding("utf8");
  stdin.resume();
  return new Promise((resolve, reject) => {
    let value = "";
    const done = () => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
    };
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") return done(), resolve(value);
        if (ch === "\u0003") return done(), reject(new Error("Cancelled."));
        if (ch === "\u007f" || ch === "\b") value = value.slice(0, -1);
        else value += ch;
      }
    };
    stdin.on("data", onData);
  });
}

async function askPassword() {
  if (!process.stdin.isTTY) return askLine("");
  const password = await askHidden("Password: ");
  if (password !== (await askHidden("Repeat password: "))) throw new Error("The passwords do not match.");
  return password;
}

async function main() {
  const email = process.argv[2] ?? (process.stdin.isTTY ? await askLine("Email: ") : "");
  if (!email) throw new Error("Usage: npm run organizer:create -- <email>");
  const password = await askPassword();

  const { url } = dbConfig();
  let result;
  try {
    result = await createOrganizer(openDb(), email, password);
  } catch (e) {
    // Drizzle wraps the driver's error: the SQLite message is in `cause`.
    const cause = e instanceof Error && e.cause instanceof Error ? e.cause.message : "";
    if (/no such table/.test(cause)) {
      throw new Error(`The database at ${url} has no tables yet. Run \`npm run db:migrate\` first.`);
    }
    throw e;
  }
  if (!result.ok) throw new Error(MESSAGES[result.error]);
  console.log(`Organizer ${email.trim().toLowerCase()} created in ${url}.`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
