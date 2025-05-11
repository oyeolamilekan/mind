import { VideoAnalyzer } from "@/components/video-analyzer"

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100">
      <h1 className="text-4xl font-bold mb-4 text-center text-gray-900">Welcome to the Video Analyzer</h1>
      <p className="text-lg mb-8 text-center text-gray-700">Analyze YouTube videos and get insights!</p>
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">Features</h2>
        <ul className="list-disc pl-5 space-y-2 mb-6 text-gray-700">
          <li>Analyze YouTube videos for key insights</li>
          <li>Extract quotes and timestamps</li>
          <li>View video transcripts</li>
          <li>Get AI-powered summaries</li>
        </ul>
        <VideoAnalyzer />
      </div>
    </div>
  )
}
