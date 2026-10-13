import type { OutboundIdentity } from "../runtime-api.js";
import type { CardHeaderConfig } from "./send.js";

// Feishu identity header helpers keep card titles free of prose-only emoji config.

type IdentityHeaderInput = {
  emoji?: string;
  name?: string;
};

const emojiSegmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

const keycapEmojiPattern = /^[0-9#*]\uFE0F?\u20E3$/u;
const emojiLikeSegmentPattern =
  /[\p{Emoji_Presentation}\p{Extended_Pictographic}\p{Regional_Indicator}]/u;

function splitGraphemes(input: string): string[] {
  if (!emojiSegmenter) {
    return Array.from(input);
  }
  return Array.from(emojiSegmenter.segment(input), (segment) => segment.segment);
}

function isEmojiSegment(segment: string): boolean {
  return keycapEmojiPattern.test(segment) || emojiLikeSegmentPattern.test(segment);
}

export function resolveFeishuIdentityEmoji(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return undefined;
  }
  const emoji = splitGraphemes(trimmed).filter(isEmojiSegment).join("");
  return emoji || undefined;
}

export function resolveFeishuIdentityHeaderTitle(identity: IdentityHeaderInput | undefined) {
  if (!identity) {
    return "";
  }
  const name = identity.name?.trim() ?? "";
  const emoji = resolveFeishuIdentityEmoji(identity.emoji);
  return (emoji ? `${emoji} ${name}` : name).trim();
}

export function resolveCardHeader(
  agentId: string,
  identity: OutboundIdentity | undefined,
): CardHeaderConfig | undefined {
  const name = identity?.name?.trim() || (agentId === "main" ? "" : agentId);
  const emoji = resolveFeishuIdentityEmoji(identity?.emoji);
  const title = (emoji ? `${emoji} ${name}` : name).trim();
  if (!title) {
    return undefined;
  }
  return {
    title,
    template: identity?.theme ?? "blue",
  };
}

export function resolveCardNote(
  agentId: string,
  identity: OutboundIdentity | undefined,
  prefixCtx: { model?: string },
): string {
  const name = identity?.name?.trim() || agentId;
  const parts: string[] = [`Agent: ${name}`];
  if (prefixCtx.model) {
    parts.push(`Model: ${prefixCtx.model}`);
  }
  return parts.join(" | ");
}

export function normalizeEpochMs(timestamp: number | undefined): number | undefined {
  if (!Number.isFinite(timestamp) || timestamp === undefined || timestamp <= 0) {
    return undefined;
  }
  // Defensive normalization: some payloads use seconds, others milliseconds.
  // Values below 1e12 are treated as epoch-seconds.
  return timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp;
}
