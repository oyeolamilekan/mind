import { generateText, generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// Schema for key insights: array of { emoji, text }
export const KeyInsightsObjectSchema = z.object({
  keyInsights: z
    .array(
      z.object({
        emoji: z
          .string()
          .min(1)
          .max(2)
          .describe("A relevant emoji that visually represents the theme or emotion of the insight."),
        text: z
          .string()
          .describe(
            "A insightful statement summarizing a key idea add more context and go slight deeper, lesson, or actionable takeaway from the transcript. Should be clear, specific, and valuable for someone seeking to understand or apply the main points."
          ),
      }).describe("A key insight, including an emoji and a descriptive text.")
    )
    .min(1)
    .max(20)
    .describe(
      "An array of key insights extracted from the video transcript. Each insight should include an emoji and a descriptive text summarizing a main idea, lesson, or actionable takeaway."
    ),
});
export type KeyInsight = z.infer<typeof KeyInsightsObjectSchema>["keyInsights"][number];
export type KeyInsightsArray = z.infer<typeof KeyInsightsObjectSchema>["keyInsights"];

export const QuotesObjectSchema = z.object({
  quotes: z
    .array(z.string().describe("A notable quote from the video transcript."))
    .min(1)
    .max(20)
    .describe("An array of notable quotes extracted from the video transcript."),
});
export type QuotesArray = z.infer<typeof QuotesObjectSchema>["quotes"];

export type TranscriptItem = {
  text: string;
  offset: number; // in seconds
  duration: number; // in seconds
};

export async function generateSummaryWithAI(captions: string, title: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OpenAI API key is missing. Cannot generate AI summary.");
    return "AI summary generation failed: API key missing.";
  }
  if (!captions || captions.trim() === "") {
    return "Summary not available: No transcript provided.";
  }
  try {
    const prompt = `Based on the following transcript from a video titled "${title}", provide a concise summary (max 550 words).\n\nTranscript:\n${captions}`;
    const { text } = await generateText({
      model: openai("gpt-3.5-turbo"),
      prompt,
    });
    return text.trim();
  } catch (error) {
    console.error("Error generating summary with AI:", error);
    return "AI summary generation failed.";
  }
}

export async function extractKeyInsightsWithAI(
  captions: string,
  title: string
): Promise<KeyInsightsArray> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OpenAI API key is missing. Cannot extract AI key insights.");
    return [
      {
        emoji: "❌",
        text: "AI key insight extraction failed: API key missing.",
      },
    ];
  }
  if (!captions || captions.trim() === "") {
    return [
      {
        emoji: "❓",
        text: "Key insights not available: No transcript provided.",
      },
    ];
  }
  try {
    const prompt = `
You are an expert at extracting actionable insights.
From the following video transcript titled "${title}", extract the most important key insights.
For each insight, provide a relevant emoji and a concise, insightful statement.

Transcript:
${captions}
`;
    const { object } = await generateObject({
      model: openai("gpt-3.5-turbo"),
      prompt,
      schema: KeyInsightsObjectSchema,
    });
    return object.keyInsights;
  } catch (error) {
    console.error("Error extracting key insights with AI (generateObject):", error);
    return [
      {
        emoji: "❌",
        text: "AI key insight extraction failed.",
      },
    ];
  }
}

export async function extractQuotesWithAI(
  captions: string,
  title: string
): Promise<QuotesArray> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OpenAI API key is missing. Cannot extract AI quotes.");
    return ["AI quote extraction failed: API key missing."];
  }
  if (!captions || captions.trim() === "") {
    return ["Quotes not available: No transcript provided."];
  }
  try {
    const prompt = `
You are an expert at identifying notable quotes.
Extract the most impactful and memorable quotes from the following video transcript titled "${title}".

Transcript:
${captions}
`;
    const { object } = await generateObject({
      model: openai("gpt-3.5-turbo"),
      prompt,
      schema: QuotesObjectSchema,
    });
    return object.quotes;
  } catch (error) {
    console.error("Error extracting quotes with AI (generateObject):", error);
    return ["AI quote extraction failed."];
  }
} 