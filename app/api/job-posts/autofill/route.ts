import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Category = { id: number; name: string };

type IntakeState = {
  jobTitle?: string;
  description?: string;
  category_id?: number;
  skills?: string[];
  budget?: number;
  duration?: "short" | "long";
  askedForBudget?: boolean;
};

type Draft = {
  jobTitle: string;
  category_id: number;
  description: string;
  skills: string[];
  duration: "short" | "long";
  price: number;
  currency: "EGP";
};

function cleanStr(x: unknown): string {
  return String(x ?? "").trim();
}

function tryParseJson(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractFirstJsonObject(text: string): any | null {
  const s = String(text ?? "").trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) return tryParseJson(s.slice(start, end + 1));
  return null;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeSkills(x: any): string[] {
  if (!Array.isArray(x)) return [];
  return x.map((s) => cleanStr(s)).filter(Boolean).slice(0, 12);
}

function normalizeCategoryId(x: any, categories: Category[]): number {
  const id = Number(x);
  if (Number.isFinite(id) && categories.some((c) => c.id === id)) return id;
  return categories[categories.length - 1]?.id ?? 1;
}

function categoryName(categories: Category[], id?: number) {
  return categories.find((c) => c.id === id)?.name || "Other";
}

function listCategories(categories: Category[]) {
  return categories.map((c) => `${c.id}: ${c.name}`).join(", ");
}

function estimateBudgetEGP(category_id: number, categories: Category[]) {
  const name = categoryName(categories, category_id).toLowerCase();
  if (name.includes("mobile")) return 50000;
  if (name.includes("web")) return 25000;
  if (name.includes("data")) return 30000;
  if (name.includes("devops")) return 25000;
  if (name.includes("design")) return 8000;
  if (name.includes("writing")) return 4000;
  if (name.includes("marketing")) return 9000;
  return 15000;
}

function parseDurationFromText(text: string): "short" | "long" | null {
  const t = text.toLowerCase();
  if (/(1|2)\s*(month|months)/.test(t)) return "short";
  if (/(3|4|5|6|7|8|9|10|11|12)\s*(month|months)/.test(t)) return "long";
  if (/(ongoing|long[-\s]?term|retainer|subscription)/.test(t)) return "long";
  if (/(week|weeks|short[-\s]?term)/.test(t)) return "short";
  return null;
}

function normalizeDuration(x: unknown): "short" | "long" | null {
  const t = cleanStr(x).toLowerCase();
  if (t === "short" || t.startsWith("short")) return "short";
  if (t === "long" || t.startsWith("long")) return "long";
  return null;
}

function parseBudgetNumber(text: string): number | null {
  const m = text.replace(/,/g, "").match(/(\d{4,})/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function looksLikeNoInfo(text: string) {
  const t = cleanStr(text).toLowerCase();
  return (
    t === "" ||
    /^(no|nope|nah|nothing|none|ok|okay|k|all good|fine|same|looks good|looks great|sure|not sure|no idea|up to you|you decide|dont know|i dont know|idk|لا|مفيش|تمام|كويس)$/i.test(
      t
    )
  );
}

const SYSTEM_PROMPT = `You are a friendly assistant helping a client craft a job post.
Have a natural, open-ended conversation and ask clarifying questions when helpful.

Return JSON only:
{
  "assistant_message": string,
  "jobTitle"?: string,
  "description"?: string,
  "category_id"?: number,
  "skills"?: string[],
  "budget"?: number,
  "duration"?: "short" | "long"
}
Only include fields you are confident about.`;

async function callHFChatWithRetry(opts: {
  token: string;
  model: string;
  system: string;
  user: string;
}) {
  const endpoint = "https://router.huggingface.co/v1/chat/completions";

  // Retry 429 twice with backoff
  const delays = [0, 600, 1600];

  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt] > 0) await sleep(delays[attempt]);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: opts.model,
        temperature: 0.2,
        max_tokens: 700,
        stream: false,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
      }),
    });

    const text = await res.text();
    const json = tryParseJson(text);

    if (res.ok) {
      const content =
        json?.choices?.[0]?.message?.content ??
        json?.choices?.[0]?.text ??
        "";
      return { ok: true as const, content: String(content) };
    }

    // If 429 and we have remaining attempts, retry.
    if (res.status === 429 && attempt < delays.length - 1) continue;

    return {
      ok: false as const,
      status: res.status,
      details: json?.error || text?.slice?.(0, 400) || "No details",
    };
  }

  return { ok: false as const, status: 429, details: "Rate limited" };
}

export async function POST(req: Request) {
  try {
    const HF_TOKEN =
      process.env.HF_TOKEN ||
      process.env.HUGGINGFACEHUB_API_TOKEN ||
      process.env.HUGGINGFACE_API_KEY;

    if (!HF_TOKEN) {
      return NextResponse.json(
        { error: { message: "Missing HF token. Set HF_TOKEN=hf_... in .env.local and restart." } },
        { status: 500 }
      );
    }

    const body = await req.json();

    const categories: Category[] = Array.isArray(body?.categories)
      ? body.categories
          .map((c: any) => ({ id: Number(c?.id), name: cleanStr(c?.name) }))
          .filter((c: Category) => Number.isFinite(c.id) && c.name.length > 0)
      : [];

    if (categories.length === 0) {
      return NextResponse.json({ error: { message: "categories[] is required." } }, { status: 400 });
    }

    const forceFinal = Boolean(body?.force_final);
    const message = cleanStr(body?.message);
    const prevState: IntakeState = body?.state && typeof body.state === "object" ? body.state : {};

    const model = process.env.HF_MODEL_JOB_AUTOFILL || "meta-llama/Llama-3.1-8B-Instruct:cerebras";

    if (!message && !forceFinal) {
      return NextResponse.json({ error: { message: "message is required." } }, { status: 400 });
    }

    let nextState: IntakeState = { ...prevState };
    let assistantMessage = "";

    if (message) {
      const budget = parseBudgetNumber(message);
      if (budget) nextState.budget = budget;

      const duration = parseDurationFromText(message);
      if (duration) nextState.duration = duration;
    }

    if (message) {
      const userPrompt = [
        `Client message: """${message}"""`,
        ``,
        `Current draft:`,
        `Title: ${prevState.jobTitle || ""}`,
        `Category: ${
          prevState.category_id ? `${prevState.category_id} (${categoryName(categories, prevState.category_id)})` : ""
        }`,
        `Description: ${prevState.description || ""}`,
        `Skills: ${(prevState.skills || []).join(", ")}`,
        `Budget: ${prevState.budget ?? ""}`,
        `Duration: ${prevState.duration ?? ""}`,
        ``,
        `Available categories: ${listCategories(categories)}`,
        ``,
        `Return ONLY JSON:`,
        `{
  "assistant_message": string,
  "jobTitle"?: string,
  "description"?: string,
  "category_id"?: number,
  "skills"?: string[],
  "budget"?: number,
  "duration"?: "short" | "long"
}`,
      ].join("\n");

      const hf = await callHFChatWithRetry({
        token: HF_TOKEN,
        model,
        system: SYSTEM_PROMPT,
        user: userPrompt,
      });

      if (!hf.ok) {
        console.error("[job-posts/autofill] HF error:", { status: hf.status, details: hf.details });
        const status = hf.status === 429 ? 429 : hf.status === 401 || hf.status === 403 ? hf.status : 500;
        return NextResponse.json(
          {
            error: {
              message:
                hf.status === 401 || hf.status === 403
                  ? "HF auth failed. Check HF_TOKEN and model access."
                  : `HF error (status ${hf.status})`,
              details: hf.details,
            },
          },
          { status }
        );
      }

      const parsed = tryParseJson(hf.content) ?? extractFirstJsonObject(hf.content);
      const parsedSkills = normalizeSkills(parsed?.skills);
      assistantMessage = cleanStr(parsed?.assistant_message);

      const parsedTitle = cleanStr(parsed?.jobTitle);
      if (parsedTitle) nextState.jobTitle = parsedTitle;

      const parsedDescription = cleanStr(parsed?.description);
      if (parsedDescription) nextState.description = parsedDescription;

      if (parsed?.category_id !== undefined && parsed?.category_id !== null && parsed?.category_id !== "") {
        nextState.category_id = normalizeCategoryId(parsed?.category_id, categories);
      }

      if (parsedSkills.length) nextState.skills = parsedSkills;

      if (parsed?.budget !== undefined && parsed?.budget !== null) {
        const parsedBudget =
          typeof parsed.budget === "number" ? parsed.budget : parseBudgetNumber(String(parsed.budget));
        if (parsedBudget) nextState.budget = parsedBudget;
      }

      if (parsed?.duration !== undefined && parsed?.duration !== null) {
        const parsedDuration =
          normalizeDuration(parsed.duration) || parseDurationFromText(String(parsed.duration));
        if (parsedDuration) nextState.duration = parsedDuration;
      }
    }

    if (!nextState.description && message) nextState.description = message;

    const catId = nextState.category_id ?? categories[0].id;
    const budgetReady = Number.isFinite(nextState.budget) && Number(nextState.budget) > 0;
    const durationReady = nextState.duration === "short" || nextState.duration === "long";

    const defaultMissing =
      nextState.askedForBudget && looksLikeNoInfo(message) && (!budgetReady || !durationReady);
    const shouldFinalize = forceFinal || (budgetReady && durationReady) || defaultMissing;

    if (shouldFinalize) {
      const finalBudget = budgetReady ? Number(nextState.budget) : estimateBudgetEGP(catId, categories);
      const finalDuration = durationReady ? nextState.duration! : "short";

      const draft: Draft = {
        jobTitle: nextState.jobTitle || "Project Request",
        category_id: catId,
        description: nextState.description || "Details to be confirmed.",
        skills:
          Array.isArray(nextState.skills) && nextState.skills.length ? nextState.skills : ["communication"],
        duration: finalDuration,
        price: finalBudget,
        currency: "EGP",
      };

      const finalizedState = {
        ...nextState,
        jobTitle: draft.jobTitle,
        description: draft.description,
        category_id: catId,
        skills: draft.skills,
        budget: finalBudget,
        duration: finalDuration,
      };

      return NextResponse.json(
        {
          ok: true,
          assistant_message:
            assistantMessage || "I've drafted the job post for you. Review and edit anything you'd like.",
          state: finalizedState,
          draft,
        },
        { status: 200 }
      );
    }

    const fallbackMessage =
      !budgetReady || !durationReady
        ? "Do you have a budget range and timeline in mind?"
        : "Tell me more about your project.";
    const finalMessage = assistantMessage || fallbackMessage;
    const askedForBudgetNow = /(budget|timeline|timeframe|duration)/i.test(finalMessage);

    return NextResponse.json(
      {
        ok: true,
        assistant_message: finalMessage,
        state: { ...nextState, askedForBudget: nextState.askedForBudget || askedForBudgetNow },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[job-posts/autofill] fatal:", err);
    return NextResponse.json(
      { error: { message: err?.message || "Server error in autofill route." } },
      { status: 500 }
    );
  }
}
