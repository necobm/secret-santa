"use server";

import { refresh } from "next/cache";
import { getDb } from "@/db/client";
import { DomainError } from "@/domain/errors";
import { markSeen, saveLikes } from "@/domain/queries";

// Participant actions: their Personal link (the token) is the only credential.

export interface LikesResult {
  error?: string;
  saved?: boolean;
}

const text = (fd: FormData, field: string) => {
  const v = fd.get(field);
  return typeof v === "string" ? v : "";
};

export async function saveLikesAction(token: string, _: LikesResult, fd: FormData): Promise<LikesResult> {
  try {
    await saveLikes(getDb(), token, text(fd, "likes"), text(fd, "dislikes"));
  } catch (e) {
    if (e instanceof DomainError) return { error: e.message };
    throw e;
  }
  refresh();
  return { saved: true };
}

export async function markSeenAction(token: string) {
  try {
    await markSeen(getDb(), token);
  } catch (e) {
    if (!(e instanceof DomainError)) throw e;
  }
}
