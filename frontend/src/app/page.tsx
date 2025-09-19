import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Github, Heart, HelpCircle, Play, Scissors } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="flex items-center justify-between p-6">
        <div className="flex items-center space-x-2">
          <Scissors className="text-red-500" size={20} />
          <span className="text-white font-medium">VideoToShorts</span>
        </div>

        <nav className="flex items-center space-x-6 text-gray-300">
          <a href="#" className="flex items-center space-x-1 hover:text-white transition-colors">
            <HelpCircle size={16} />
            <span>Help</span>
          </a>
          <a href="#" className="flex items-center space-x-1 hover:text-white transition-colors">
            <Heart size={16} />
            <span>Support</span>
          </a>
          <a href="https://github.com/boopesh07/VideoToShorts" className="flex items-center space-x-1 hover:text-white transition-colors">
            <Github size={16} />
            <span>GitHub</span>
          </a>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center px-6 py-20">
        {/* Logo */}
        <div className="flex items-center space-x-3 mb-8">
          <Scissors className="text-red-500" size={32} />
          <h1 className="text-5xl font-bold">VideoToShorts</h1>
        </div>

        {/* Tagline */}
        <p className="text-xl text-gray-400 text-center mb-12 max-w-2xl">
          Transform long YouTube videos into engaging short clips automatically
        </p>

        {/* Input Section */}
        <div className="w-full max-w-2xl space-y-6">
          {/* URL Input */}
          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <Play className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
              <Input
                placeholder="Paste your YouTube URL here..."
                className="pl-12 h-14 bg-gray-900 border-gray-700 text-white placeholder-gray-500 text-lg"
              />
            </div>
            <Button className="h-14 px-8 bg-white text-black hover:bg-gray-200 font-medium">
              Create Shorts
            </Button>
          </div>

          {/* Helper Text */}
          <div className="flex items-center justify-center space-x-2 text-gray-500">
            <div className="flex items-center space-x-1">
              <span className="text-yellow-500">💡</span>
              <span>Upload your video and get multiple short clips optimized for social media</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-center text-gray-500 text-sm space-y-2">
        <p>Free to use • No account needed • Open-source</p>
        <p>
          Built with <Heart className="inline w-4 h-4 text-red-500" fill="currentColor" /> for the community
        </p>
      </footer>
    </div>
  );
}
