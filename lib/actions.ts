"use server"

// Removed direct AI SDK imports, will use aiProcessor.ts
// import { generateText } from "ai"
// import { openai } from "@ai-sdk/openai"

// Import from the new lib/youtube.ts and lib/aiProcessor.ts
import { extractYouTubeID, fetchTranscript } from "../lib/youtube" 
import { 
    generateSummaryWithAI, 
    extractKeyInsightsWithAI, 
    extractQuotesWithAI,
    TranscriptItem // Import TranscriptItem type
} from "../lib/aiProcessor";

// Local TranscriptItem type definition removed, will use imported one.
// export type TranscriptItem = {
//   text: string
//   offset: number
//   duration: number
// }

export async function analyzeVideo(url: string) {
  try {
    const videoId = await extractYouTubeID(url)

    if (!videoId) {
      return { error: "Invalid YouTube URL provided.", suggestManualInput: false }
    }

    // Initialize variables for the return structure
    let analysisTitle = "Video Analysis";
    const analysisChannelTitle = ""; // Changed to const
    const analysisThumbnailUrl = ""; // Changed to const
    let analysisTranscriptForDisplay: TranscriptItem[] = [];
    let analysisSummary = "";
    let analysisKeyInsights: { emoji: string; text: string }[] = [];
    let analysisQuotes: string[] = [];
    const transcriptWarning = null; // Placeholder, adjust if warnings are generated

    console.log("Processing video with ID:", videoId);
    
    // 1. Fetch raw transcript items (offset/duration in ms)
    const rawTranscriptItems = await fetchTranscript(videoId);

    if (!rawTranscriptItems || rawTranscriptItems.length === 0) {
      return {
        error: "The transcript is too short or unavailable for meaningful analysis. Please provide more content or try manual input.",
        suggestManualInput: true,
      };
    }
    
    // TODO: Implement actual video info fetching (title, channel, thumbnail)
    // For now, using placeholder title. Real title is needed for best AI results.
    analysisTitle = `Video ID: ${videoId}`; // Placeholder title
    // analysisChannelTitle = fetchedVideoInfo.channelTitle;
    // analysisThumbnailUrl = fetchedVideoInfo.thumbnailUrl;

    // 2. Prepare captions string for AI
    const captionsText = rawTranscriptItems.map(item => item.text).join(' ').trim();

    // 3. Call AI functions from aiProcessor
    if (captionsText) {
      analysisSummary = await generateSummaryWithAI(captionsText, analysisTitle);
      analysisKeyInsights = await extractKeyInsightsWithAI(captionsText, analysisTitle);
      analysisQuotes = await extractQuotesWithAI(captionsText, analysisTitle);
    } else {
      console.warn("Transcript text is empty after fetching for videoId:", videoId);
      analysisSummary = "Summary not available: Transcript content is empty.";
    }

    // 4. Convert raw transcript to TranscriptItem[] (seconds) for display/final structure
    analysisTranscriptForDisplay = rawTranscriptItems.map(item => ({
      text: item.text,
      offset: item.offset / 1000, // ms to s
      duration: item.duration / 1000, // ms to s
    }));

    return {
      title: analysisTitle, // Placeholder or fetched title
      channelTitle: analysisChannelTitle, // Placeholder or fetched
      thumbnailUrl: analysisThumbnailUrl, // Placeholder or fetched
      transcript: analysisTranscriptForDisplay,
      videoId: videoId,
      summary: analysisSummary,
      keyInsights: analysisKeyInsights,
      quotes: analysisQuotes,
      transcriptWarning,
      error: null,
    };

  } catch (error) {
    console.error("Error analyzing video in actions.ts:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to analyze video";
    const suggestManual = errorMessage.includes("caption") || errorMessage.includes("transcript") || errorMessage.includes("Invalid video ID");
    return {
      error: errorMessage,
      suggestManualInput: suggestManual,
    };
  }
}

// Local generateAnalysis function is now replaced by calls to aiProcessor.ts functions
// Remove the old generateAnalysis function.
/*
async function generateAnalysis(transcript: string, title: string) {
  // ... (old implementation) ...
}
*/

// The old local extractVideoId was already removed by user.
