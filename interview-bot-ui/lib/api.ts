"use client";

import { ChatRequest, ChatResponse } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5267";

export async function sendMessage(request: ChatRequest): Promise<ChatResponse> {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error("Failed to send message");
  return res.json();
}

export async function getUnanswered() {
  const res = await fetch(`${API_URL}/api/unanswered`);
  if (!res.ok) throw new Error("Failed to fetch unanswered");
  return res.json();
}

// Used by /sessions page list
export async function getSessions() {
  const res = await fetch(`${API_URL}/api/sessions`);
  if (!res.ok) throw new Error("Failed to fetch sessions");
  const data = await res.json();
  // Backend returns { sessions: { sessions: [...] } } — unwrap both levels
  const sessions = Array.isArray(data.sessions)
    ? data.sessions
    : Array.isArray(data.sessions?.sessions)
    ? data.sessions.sessions
    : [];
  return { sessions };
}
// Used by /sessions/[id] transcript page (numeric DB id)
export async function getSessionDetail(id: number) {
  const res = await fetch(`${API_URL}/api/sessions/${id}/detail`);
  if (!res.ok) throw new Error("Failed to fetch session detail");
  return res.json();
}

export async function saveAnswer(id: number, answer: string) {
  const res = await fetch(`${API_URL}/api/unanswered/${id}/answer`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answer }),
  });
  if (!res.ok) throw new Error("Failed to save answer");
  return res.json();
}

export async function promoteToKb(id: number) {
  const res = await fetch(`${API_URL}/api/unanswered/${id}/promote`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to promote to KB");
  return res.json();
}

export async function deleteUnanswered(id: number) {
  const res = await fetch(`${API_URL}/api/unanswered/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete");
  return res.json();
}

// ================================================================
// ADD THESE TO YOUR EXISTING lib/api.ts
// ================================================================

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5267";

// ── Skill Gap ────────────────────────────────────────────────────

export interface SkillGapRequest {
  keywords:      string;
  location:      string;
  includeRemote: boolean;
  maxJobs:       number;
}

export async function analyzeSkillGap(req: SkillGapRequest) {
  const res = await fetch(`${API}/api/skill-gap`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`skill-gap API error ${res.status}`);
  return res.json();
}

export async function saveJob(jobId: number, status = "saved", notes = "") {
  const res = await fetch(`${API}/api/skill-gap/save-job`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ jobId, status, notes }),
  });
  if (!res.ok) throw new Error("save-job failed");
  return res.json();
}

export async function getSavedJobs() {
  const res = await fetch(`${API}/api/skill-gap/saved-jobs`);
  if (!res.ok) throw new Error("getSavedJobs failed");
  return res.json();
}

export async function getSkillGapSettings() {
  const res = await fetch(`${API}/api/skill-gap/settings`);
  if (!res.ok) throw new Error("getSettings failed");
  return res.json();
}

export async function updateSkillGapSettings(settings: Record<string, string>) {
  const res = await fetch(`${API}/api/skill-gap/settings`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(settings),
  });
  if (!res.ok) throw new Error("updateSettings failed");
  return res.json();
}