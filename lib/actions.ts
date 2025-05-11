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

// Helper function to format timestamp in MM:SS format
function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

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
    let analysisQuotes: { text: string; timestamp: string }[] = [];
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
      const rawQuotes = await extractQuotesWithAI(captionsText, analysisTitle);
      // Convert raw quotes to objects with text and timestamp
      analysisQuotes = rawQuotes.map(quote => ({
        text: quote,
        timestamp: "00:00" // Placeholder timestamp since we don't have actual timestamps from the AI
      }));
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

    // Find timestamps for quotes by matching them with transcript items
    const quotesWithTimestamps = analysisQuotes.map(quote => {
      // Clean and normalize the quote text for better matching
      const cleanQuote = quote.text.toLowerCase().trim().replace(/[.,!?]/g, '');
      
      // Find the transcript item that contains this quote
      const matchingTranscriptItem = analysisTranscriptForDisplay.find(item => {
        const cleanTranscript = item.text.toLowerCase().trim().replace(/[.,!?]/g, '');
        // Check if the quote is a significant part of the transcript item
        return cleanTranscript.includes(cleanQuote) && 
               (cleanQuote.length > 10 || cleanTranscript.length < 100); // Avoid matching very short quotes in long transcript items
      });
      
      // If no exact match found, try to find the closest match
      if (!matchingTranscriptItem) {
        // Find the transcript item with the most words in common with the quote
        const wordsInQuote = new Set(cleanQuote.split(/\s+/));
        let bestMatch = null;
        let maxCommonWords = 0;
        
        for (const item of analysisTranscriptForDisplay) {
          const wordsInTranscript = new Set(item.text.toLowerCase().trim().replace(/[.,!?]/g, '').split(/\s+/));
          const commonWords = [...wordsInQuote].filter(word => wordsInTranscript.has(word));
          
          if (commonWords.length > maxCommonWords) {
            maxCommonWords = commonWords.length;
            bestMatch = item;
          }
        }
        
        // Use the best match if it has enough common words
        if (bestMatch && maxCommonWords >= 3) {
          return {
            text: quote.text,
            timestamp: formatTimestamp(bestMatch.offset)
          };
        }
      }
      
      return {
        text: quote.text,
        timestamp: matchingTranscriptItem ? formatTimestamp(matchingTranscriptItem.offset) : "00:00"
      };
    });

    return {
      title: analysisTitle, // Placeholder or fetched title
      channelTitle: analysisChannelTitle, // Placeholder or fetched
      thumbnailUrl: analysisThumbnailUrl, // Placeholder or fetched
      transcript: analysisTranscriptForDisplay,
      videoId: videoId,
      summary: analysisSummary,
      keyInsights: analysisKeyInsights,
      quotes: quotesWithTimestamps,
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
