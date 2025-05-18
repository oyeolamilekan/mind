import { parse } from "node-html-parser";

// Add minimal interfaces for script and document
interface ScriptWithTextContent {
  textContent: string;
}
interface ScriptCollection {
  length: number;
  [index: number]: unknown;
}
interface DocumentWithGetElementsByTagName {
  getElementsByTagName: (tag: string) => ScriptCollection;
}

interface CaptionTrack {
  languageCode: string;
  baseUrl: string;
  name?: {
    simpleText?: string;
  };
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

class YoutubeTranscriptError extends Error {
  constructor(message: string) {
    super(`[YoutubeTranscript] ${message}`);
  }
}

type YtFetchConfig = {
  lang?: string; // Object with lang param (eg: en, es, hk, uk) format.
  maxRetries?: number; // Maximum number of retry attempts
  retryDelay?: number; // Delay between retries in milliseconds
  timeout?: number; // Request timeout in milliseconds
};

/**
 * Sleep utility function for implementing delays
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetches a URL with retry logic and rate limiting
 */
async function fetchWithRetry(url: string, options: RequestInit = {}, config: YtFetchConfig = {}): Promise<Response> {
  const maxRetries = config.maxRetries ?? 3;
  const initialRetryDelay = config.retryDelay ?? 1000;
  const timeout = config.timeout ?? 10000;
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Add timeout to fetch using AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const fetchOptions = {
        ...options,
        signal: controller.signal,
      };
      
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);
      
      // If we get a 429, implement exponential backoff
      if (response.status === 429) {
        // Get retry-after header if available, or use exponential backoff
        const retryAfter = response.headers.get('retry-after');
        const retryDelay = retryAfter ? parseInt(retryAfter, 10) * 1000 : initialRetryDelay * Math.pow(2, attempt);
        
        console.warn(`[youtube.ts] Rate limited (429). Retrying after ${retryDelay}ms. Attempt ${attempt + 1}/${maxRetries}`);
        await sleep(retryDelay);
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry if the request was aborted due to timeout
      if (lastError.name === 'AbortError') {
        throw new YoutubeTranscriptError(`Request timed out after ${timeout}ms: ${url}`);
      }
      
      // Implement exponential backoff for other errors
      const retryDelay = initialRetryDelay * Math.pow(2, attempt);
      console.warn(`[youtube.ts] Fetch error: ${lastError.message}. Retrying after ${retryDelay}ms. Attempt ${attempt + 1}/${maxRetries}`);
      await sleep(retryDelay);
    }
  }
  
  throw lastError || new YoutubeTranscriptError(`Failed after ${maxRetries} attempts to fetch: ${url}`);
}

async function fetchTranscript(videoId: string, config: YtFetchConfig = {}) {
  const identifier = extractYouTubeID(videoId);
  if (!identifier) {
    throw new YoutubeTranscriptError("Invalid YouTube video ID or URL");
  }
  
  const lang = config?.lang ?? "en";
  console.log(`[youtube.ts] Fetching transcript for video ID: ${identifier}, language: ${lang}`);
  
  try {
    const videoPageUrl = `https://www.youtube.com/watch?v=${identifier}`;
    console.log(`[youtube.ts] Attempting to fetch video page: ${videoPageUrl}`);
    
    // Add common headers that help avoid 429s
    const headers = {
      "User-Agent": USER_AGENT,
      "Accept-Language": "en-US,en;q=0.9",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Referer": "https://www.youtube.com/",
      "DNT": "1",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Dest": "document",
      "Cache-Control": "no-cache"
    };
    
    const pageResponse = await fetchWithRetry(
      videoPageUrl,
      { headers },
      config
    );

    console.log(`[youtube.ts] Page response: ${pageResponse.status} ${pageResponse.statusText}`);

    const htmlc = await pageResponse.text();
    console.log(`[youtube.ts] HTML: ${htmlc}`);


    
    if (!pageResponse.ok) {
      throw new YoutubeTranscriptError(`Failed to fetch video page: ${pageResponse.status} ${pageResponse.statusText}`);
    }
    
    const html = await pageResponse.text();
    const parsedHtml = parse(html);
    const transcriptUrl = parseTranscriptEndpoint(parsedHtml, lang);
    
    if (!transcriptUrl) {
      throw new YoutubeTranscriptError(`No transcript found for video ID ${identifier} with language ${lang}`);
    }
    
    console.log(`[youtube.ts] Fetching transcript XML from: ${transcriptUrl}`);
    
    // Add a small delay before fetching the transcript to avoid rate limiting
    await sleep(500);
    
    const transcriptResponse = await fetchWithRetry(
      transcriptUrl,
      { headers },
      config
    );
    
    if (!transcriptResponse.ok) {
      throw new YoutubeTranscriptError(`Failed to fetch transcript XML: ${transcriptResponse.status} ${transcriptResponse.statusText}`);
    }
    
    const xml = await transcriptResponse.text();
    const transcriptXML = parse(xml);
    
    const chunks = transcriptXML?.getElementsByTagName("text");
    if (!chunks || chunks.length === 0) {
      throw new YoutubeTranscriptError("Transcript XML contains no text elements");
    }
    
    const transcriptions = [];
    for (const chunk of chunks) {
      const attrs: Record<string, number> = {};
      chunk.rawAttrs.split(" ").forEach(attr => {
        const [key, value] = attr.split("=");
        if (key && value) {
          attrs[key] = parseFloat(value.replace(/"/g, ""));
        }
      });
      
      // Decode common HTML entities from chunk.text
      let cleanText = chunk.text;
      cleanText = cleanText.replace(/&#39;/g, "'")
                         .replace(/&apos;/g, "'")
                         .replace(/&amp;/g, "&")
                         .replace(/&quot;/g, "\"")
                         .replace(/&lt;/g, "<")
                         .replace(/&gt;/g, ">");
      
      transcriptions.push({
        text: cleanText,
        offset: Math.round((attrs["start"] ?? 0) * 1000),    // ms
        duration: Math.round((attrs["dur"] ?? 0) * 1000),    // ms
      });
    }
    
    return transcriptions;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    throw new YoutubeTranscriptError(message);
  }
}

function parseTranscriptEndpoint(document: unknown, langCode?: string) {
  try {
    // Get all script tags on document page
    if (
      !document ||
      typeof document !== "object" ||
      typeof (document as DocumentWithGetElementsByTagName).getElementsByTagName !== "function"
    ) {
      return null;
    }
    
    const scripts = (document as DocumentWithGetElementsByTagName).getElementsByTagName("script");
    
    // First try to find the player response in a more reliable way
    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i];
      if (
        typeof script === "object" &&
        script !== null &&
        "textContent" in script &&
        typeof (script as ScriptWithTextContent).textContent === "string"
      ) {
        const scriptContent = (script as ScriptWithTextContent).textContent;
        
        // Look for the player response data
        if (scriptContent.includes("var ytInitialPlayerResponse = {")) {
          try {
            const dataString = scriptContent
              .split("var ytInitialPlayerResponse = ")[1]
              .split(/}\s*;/)[0] + "}";
              
            const data = JSON.parse(dataString.trim());
            const availableCaptions = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
            
            // Debug log for available caption tracks
            if (availableCaptions.length > 0) {
              console.log(`[youtube.ts] Found ${availableCaptions.length} caption tracks`);
              availableCaptions.forEach((track: CaptionTrack, index: number) => {
                console.log(`[youtube.ts] Track ${index}: ${track.languageCode} - ${track.name?.simpleText || 'Unnamed'}`);
              });
            } else {
              console.log("[youtube.ts] No caption tracks found in player response");
            }
            
            let captionTrack = availableCaptions[0];
            
            if (langCode) {
              captionTrack = availableCaptions.find(
                (track: CaptionTrack) =>
                  typeof track.languageCode === "string" && 
                  track.languageCode.toLowerCase().includes(langCode.toLowerCase())
              ) ?? availableCaptions[0];
            }
            
            if (captionTrack?.baseUrl) {
              return captionTrack.baseUrl;
            }
          } catch (parseError) {
            console.error("[youtube.ts] Error parsing player response:", parseError);
          }
        }
      }
    }
    
    console.warn("[youtube.ts] Failed to find transcript URL in player response");
    return null;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[youtube.ts] parseTranscriptEndpoint Error: ${message}`);
    return null;
  }
}

export function extractYouTubeID(urlOrID: string): string | null {
  if (!urlOrID) {
    return null;
  }
  
  // Regular expression for YouTube ID format
  const regExpID = /^[a-zA-Z0-9_-]{11}$/;

  // Check if the input is a YouTube ID
  if (regExpID.test(urlOrID)) {
    return urlOrID;
  }

  // Regular expressions for various YouTube URL formats
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,  // Standard
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,   // Shorts
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,              // Shortened
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,    // Embedded
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/         // Old format
  ];

  for (const pattern of patterns) {
    const match = urlOrID.match(pattern);
    if (match) {
      return match[1];
    }
  }

  // Return null if no match is found
  return null;
}

export { fetchTranscript, YoutubeTranscriptError };