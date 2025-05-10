"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { analyzeVideo } from "@/lib/actions"
import { Loader2, AlertTriangle, Youtube } from "lucide-react"
import { TranscriptViewer } from "./transcript-viewer"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface AnalysisResult {
  title: string
  channelTitle?: string
  thumbnailUrl?: string
  summary: string
  keyInsights: Array<{ emoji: string; text: string }>
  quotes: Array<{ text: string; timestamp: string }>
  transcript: Array<{ text: string; timestamp: string }>
  videoId?: string
  transcriptWarning?: string
  error?: string | null
}

export function VideoAnalyzer() {
  const [url, setUrl] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!url) {
      setError("Please enter a YouTube URL")
      return
    }

    try {
      setIsLoading(true)
      setError("")

      const data = await analyzeVideo(url)

      if (data.error) {
        setError(data.error)
        setResult(null)
      } else if (data.title && Array.isArray(data.quotes) && data.quotes.every(quote => typeof quote === 'object' && quote !== null && 'text' in quote && 'timestamp' in quote)) {
        setResult(data as unknown as AnalysisResult)
      } else {
        setError("Invalid response: missing title or quotes")
        setResult(null)
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message || "An error occurred while analyzing the video.")
      } else {
        setError("An unknown error occurred while analyzing the video.")
      }
      setResult(null)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="text"
            placeholder="Paste YouTube URL here"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing
              </>
            ) : (
              "Analyze"
            )}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </form>

      {result && (
        <div className="space-y-4 border rounded-lg p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {result.thumbnailUrl && (
              <div className="flex-shrink-0">
                <div className="relative w-full md:w-48 aspect-video rounded-md overflow-hidden">
                  <img
                    src={result.thumbnailUrl || "/placeholder.svg"}
                    alt={result.title}
                    className="object-cover w-full h-full"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black bg-opacity-60 rounded-full p-2">
                      <Youtube className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </div>
                {result.channelTitle && (
                  <p className="text-xs text-muted-foreground mt-1 text-center md:text-left">{result.channelTitle}</p>
                )}
              </div>
            )}
            <div className="flex-grow">
              <h2 className="text-xl font-semibold">{result.title}</h2>
              {result.transcriptWarning && (
                <Alert className="mt-2 bg-amber-50 border-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-700">{result.transcriptWarning}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          <Tabs defaultValue="summary">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="keyPoints">Key Points</TabsTrigger>
              <TabsTrigger value="quotes">Quotes</TabsTrigger>
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="mt-4">
              <p className="text-sm leading-relaxed">{result.summary}</p>
            </TabsContent>

            <TabsContent value="keyPoints" className="mt-4">
              <ul className="list-disc pl-5 space-y-2">
                {result.keyInsights.map((insight, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-2xl">{insight.emoji}</span>
                    <p className="text-sm text-muted-foreground">{insight.text}</p>
                  </div>
                ))}
              </ul>
            </TabsContent>

            <TabsContent value="quotes" className="mt-4">
              <ul className="space-y-3">
                {result.quotes.map((quote, index) => (
                  <div key={index} className="flex flex-col gap-1">
                    <p className="text-sm">{quote.text}</p>
                    <p className="text-xs text-muted-foreground">{quote.timestamp}</p>
                  </div>
                ))}
              </ul>
            </TabsContent>

            <TabsContent value="transcript" className="mt-4">
              {result.transcript && result.transcript.length > 0 ? (
                <TranscriptViewer transcript={result.transcript.map(item => ({ text: item.text, offset: 0, duration: 0 }))} />
              ) : (
                <p className="text-center text-muted-foreground py-8">No transcript available for this video.</p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}
