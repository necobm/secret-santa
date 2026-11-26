"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizer } from "@/accounts/session";
import { getDb } from "@/db/client";
import { redoDraw, runDraw } from "@/domain/draw";
import { DomainError } from "@/domain/errors";
import {
  addParticipant,
  createDraw,
  deleteDraw,
  editDraw,
  removeParticipant,
  renameParticipant,
} from "@/domain/management";
import { markOrganizerSeen, revealAssignments } from "@/domain/queries";

// Every action is a public endpoint: it checks the session and that the Draw belongs to the
// Organizer (the domain functions receive their id and check it).

export interface Result {
  error?: string;
  /** Value to keep in the form when there is an error. */
  value?: string;
  /** Several values to keep (forms with more than one field). */
  fields?: Record<string, string>;
}

const text = (fd: FormData, field: string) => {
  const v = fd.get(field);
  return typeof v === "string" ? v : "";
};

async function run(operation: (organizerId: number) => void, value?: string): Promise<Result> {
  const org = await requireOrganizer();
  try {
    operation(org.id);
  } catch (e) {
    if (e instanceof DomainError) return { error: e.message, value };
    throw e;
  }
  refresh();
  return {};
}

export async function createDrawAction(_: Result, fd: FormData): Promise<Result> {
  const org = await requireOrganizer();
  const fields = {
    name: text(fd, "name"),
    budget: text(fd, "budget"),
    budgetMax: text(fd, "budgetMax"),
    date: text(fd, "date"),
    yourName: text(fd, "yourName"),
  };
  let id: number;
  try {
    id = createDraw(getDb(), org.id, {
      name: fields.name,
      budget: fields.budget,
      budgetMax: fields.budgetMax,
      exchangeDate: fields.date,
      organizerName: fd.get("notParticipating") ? null : fields.yourName,
    });
  } catch (e) {
    if (e instanceof DomainError) return { error: e.message, fields };
    throw e;
  }
  redirect(`/draws/${id}`);
}

export async function editDrawAction(drawId: number, _: Result, fd: FormData) {
  return run((org) =>
    editDraw(getDb(), org, drawId, {
      name: text(fd, "name"),
      budget: text(fd, "budget"),
      budgetMax: text(fd, "budgetMax"),
      exchangeDate: text(fd, "date"),
    }),
  );
}

export async function deleteDrawAction(drawId: number) {
  const r = await run((org) => deleteDraw(getDb(), org, drawId));
  if (r.error) return r;
  redirect("/draws");
}

export async function addParticipantAction(drawId: number, _: Result, fd: FormData) {
  const name = text(fd, "name");
  return run((org) => addParticipant(getDb(), org, drawId, name), name);
}

export async function removeParticipantAction(drawId: number, participantId: number) {
  return run((org) => removeParticipant(getDb(), org, drawId, participantId));
}

export async function renameParticipantAction(drawId: number, participantId: number, _: Result, fd: FormData) {
  const name = text(fd, "name");
  return run((org) => renameParticipant(getDb(), org, drawId, participantId, name), name);
}

export async function runDrawAction(drawId: number) {
  return run((org) => runDraw(getDb(), drawId, { organizerId: org }));
}

export async function redoDrawAction(drawId: number) {
  return run((org) => redoDraw(getDb(), drawId, { organizerId: org }));
}

export async function revealAction(drawId: number) {
  const org = await requireOrganizer();
  return revealAssignments(getDb(), org.id, drawId);
}

export async function markMySeenAction(drawId: number) {
  const org = await requireOrganizer();
  markOrganizerSeen(getDb(), org.id, drawId);
}
