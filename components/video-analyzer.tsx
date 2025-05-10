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
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

type AnalysisResult = {
  title: string
  channelTitle?: string
  thumbnailUrl?: string
  summary: string
  keyPoints: string[]
  quotes: string[]
  transcript: {
    text: string
    offset: number
    duration: number
  }[]
  videoId?: string
  transcriptWarning?: string
  error?: string | null
}

export function VideoAnalyzer() {
  const [url, setUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState("")
  const [manualTranscript, setManualTranscript] = useState("")
  const [useManualTranscript, setUseManualTranscript] = useState(false)
  const [showManualInput, setShowManualInput] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!url && !manualTranscript) {
      setError("Please enter a YouTube URL" + (showManualInput ? " or paste a transcript" : ""))
      return
    }

    try {
      setIsLoading(true)
      setError("")

      const data = await analyzeVideo(url, useManualTranscript ? manualTranscript : undefined)

      if (data.error) {
        if (data.suggestManualInput && !showManualInput) {
          setError(`${data.error} You can try entering the transcript manually.`)
          setShowManualInput(true)
        } else {
          setError(data.error)
        }
        setResult(null)
      } else {
        setResult(data)
      }
    } catch (err: any) {
      setError(`Failed to analyze video: ${err.message || "Unknown error"}. Please check the URL and try again.`)
      console.error(err)
      setResult(null)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleManualTranscript = () => {
    setUseManualTranscript(!useManualTranscript)
    setShowManualInput(!showManualInput)
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
          <Button type="submit" disabled={isLoading || (useManualTranscript && !manualTranscript)}>
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

        <div className="flex items-center space-x-2">
          <Switch id="manual-transcript" checked={useManualTranscript} onCheckedChange={toggleManualTranscript} />
          <Label htmlFor="manual-transcript">Enter transcript manually</Label>
        </div>

        {showManualInput && (
          <div className="space-y-2">
            <Textarea
              placeholder="Paste the video transcript here..."
              value={manualTranscript}
              onChange={(e) => setManualTranscript(e.target.value)}
              className="min-h-[200px]"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Paste the transcript text here. You can often find transcripts by clicking the "..." button under YouTube
              videos and selecting "Show transcript".
            </p>
          </div>
        )}

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
                  <li key={index} className="text-sm flex items-center gap-2">
                    <span>{insight.emoji}</span>
                    <span>{insight.text}</span>
                  </li>
                ))}
              </ul>
            </TabsContent>

            <TabsContent value="quotes" className="mt-4">
              <ul className="space-y-3">
                {result.quotes.map((quote, index) => (
                  <li key={index} className="text-sm border-l-2 pl-3 py-1">
                    {quote}
                  </li>
                ))}
              </ul>
            </TabsContent>

            <TabsContent value="transcript" className="mt-4">
              {result.transcript && result.transcript.length > 0 ? (
                <TranscriptViewer transcript={result.transcript} />
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
