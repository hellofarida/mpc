"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LeaveLink } from "@/components/leave-link";
import { logEvent } from "@/lib/events";
import { MAX_QUESTION_CHARS, type ChatReply } from "@/lib/chat";

const COOLDOWN_MS = 8000; // per-device, client-side only: a courtesy, not a security control
const EXAMPLES = ["How many bee sightings are there?", "What are the most recorded species?", "What was seen most recently?"];

type Turn = { question: string; reply: ChatReply | { kind: "error" } };

export function Chatbot({ siteId }: { siteId: string }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [turn, setTurn] = useState<Turn | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const last = useRef(0);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    const wait = COOLDOWN_MS - (Date.now() - last.current);
    if (wait > 0) {
      setNote(`Please wait ${Math.ceil(wait / 1000)} seconds before asking again.`);
      return;
    }
    last.current = Date.now();
    setNote(null);
    setBusy(true);
    logEvent("question", { siteId });
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, question: q }),
      });
      setTurn({ question: q, reply: (await res.json()) as ChatReply });
      if (res.ok) setText("");
    } catch {
      setTurn({ question: q, reply: { kind: "error" } });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-slot="chatbot" className="space-y-3 text-sm">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(text);
        }}
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_QUESTION_CHARS}
          placeholder="e.g. What was seen most recently?"
          aria-label="Your question about this garden"
          autoComplete="off"
          enterKeyHint="send"
        />
        <Button type="submit" disabled={busy || text.trim().length === 0}>
          {busy ? "…" : "Ask"}
        </Button>
      </form>

      {!turn && (
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <Button key={ex} variant="outline" size="sm" disabled={busy} onClick={() => void ask(ex)}>
              {ex}
            </Button>
          ))}
        </div>
      )}
      {note && <p role="status" className="text-muted-foreground">{note}</p>}

      {turn && (
        <div role="status" aria-live="polite" className="space-y-2 rounded-lg border bg-muted p-3">
          <p className="font-medium">{turn.question}</p>
          {turn.reply.kind === "error" && <p>Sorry, something went wrong. Please try again in a moment.</p>}
          {turn.reply.kind === "invalid" && <p>{turn.reply.message}</p>}
          {turn.reply.kind === "declined" && (
            <>
              <p>{turn.reply.message}</p>
              {turn.reply.link && (
                <LeaveLink href={turn.reply.link.href} destination={turn.reply.link.destination}>
                  {turn.reply.link.label}
                </LeaveLink>
              )}
            </>
          )}
          {turn.reply.kind === "answer" && (
            <>
              <p>{turn.reply.text}</p>
              <p className="text-xs text-muted-foreground">
                {turn.reply.source === "ai" ? "Written by AI, checked by code. " : "Answered from the sightings data. "}
                {turn.reply.sourceLine}
              </p>
            </>
          )}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Your question is sent to an AI service to be answered. Don&apos;t include personal details.
      </p>
    </div>
  );
}
