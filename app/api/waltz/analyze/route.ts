import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_PROMPT_BODY, buildSystemPrompt } from "@/lib/waltz-prompt";
import type { AnalyzeRequestBody, ReconciliationResult } from "@/types/waltz";

export const runtime = "nodejs";
export const maxDuration = 120;

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const FILES_API_BETA_HEADER = "files-api-2025-04-14";
const MODEL = "claude-sonnet-5";

function extractJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("No JSON object found in model response.");
  }
  const jsonSlice = cleaned.slice(firstBrace, lastBrace + 1);
  return JSON.parse(jsonSlice);
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Server is missing ANTHROPIC_API_KEY." },
      { status: 500 }
    );
  }

  try {
    const body = (await request.json()) as AnalyzeRequestBody;
    const { orderFileId, shopDrawingFileId, systemPromptBody } = body;

    if (!orderFileId || !shopDrawingFileId) {
      return NextResponse.json(
        { error: "orderFileId and shopDrawingFileId are both required." },
        { status: 400 }
      );
    }

    const systemPrompt = buildSystemPrompt(systemPromptBody?.trim() || DEFAULT_PROMPT_BODY);

    const payload = {
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: "medium" },
      thinking: { type: "adaptive", display: "omitted" },
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "file", file_id: orderFileId },
              title: "Waltz Order (Source of Truth)",
            },
            {
              type: "document",
              source: { type: "file", file_id: shopDrawingFileId },
              title: "Shop Drawing",
            },
            {
              type: "text",
              text: "Cross-check these two documents per the instructions and return the JSON object.",
            },
          ],
        },
      ],
    };

    const res = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": FILES_API_BETA_HEADER,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Anthropic API error: ${res.status} ${errText}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const textBlock = (data.content ?? []).find(
      (block: { type: string }) => block.type === "text"
    );

    if (!textBlock) {
      return NextResponse.json(
        { error: "No text response returned by the model." },
        { status: 502 }
      );
    }

    const parsed = extractJson(textBlock.text) as ReconciliationResult;
    return NextResponse.json(parsed);
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Unknown analysis error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}