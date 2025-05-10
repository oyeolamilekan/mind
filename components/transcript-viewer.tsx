"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

type TranscriptItem = {
  text: string
  offset: number
  duration: number
}

interface TranscriptViewerProps {
  transcript: TranscriptItem[]
}

export function TranscriptViewer({ transcript }: TranscriptViewerProps) {
  const [searchTerm, setSearchTerm] = useState("")

  // Format seconds to HH:MM:SS.mmm
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const milliseconds = Math.floor((totalSeconds % 1) * 1000);

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;
  }

  // Filter transcript based on search term
  const filteredTranscript = transcript.filter((item) => item.text.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="space-y-4">
      <Input
        type="text"
        placeholder="Search transcript..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-2"
      />

      <ScrollArea className="h-[400px] rounded-md border p-4">
        {filteredTranscript.length > 0 ? (
          <div className="space-y-3">
            {filteredTranscript.map((item, index) => (
              <div key={index} className="flex leading-relaxed space-x-1.5">
                <div className="text-sm text-muted-foreground">{formatTime(item.offset)}</div>
                <p className="text-sm font-bold">{item.text}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            {searchTerm ? "No matching transcript segments found." : "No transcript available."}
          </p>
        )}
      </ScrollArea>
    </div>
  )
}
