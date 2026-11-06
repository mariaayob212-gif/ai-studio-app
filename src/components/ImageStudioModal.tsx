import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Image as ImageIcon,
  Loader2,
  Download,
  Check,
  Maximize2,
  Sliders,
} from 'lucide-react';

interface ImageStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetAsWallpaper: (url: string) => void;
  onSetAsCharacterAvatar: (url: string) => void;
}

export const ImageStudioModal: React.FC<ImageStudioModalProps> = ({
  isOpen,
  onClose,
  onSetAsWallpaper,
  onSetAsCharacterAvatar,
}) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<string>('16:9');
  const [imageSize, setImageSize] = useState<string>('1K');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const aspectRatios = [
    { value: '16:9', label: '16:9 (Cinematic Landscape)' },
    { value: '21:9', label: '21:9 (Ultra-wide Movie)' },
    { value: '9:16', label: '9:16 (Mobile Portrait / Story)' },
    { value: '1:1', label: '1:1 (Square Avatar)' },
    { value: '3:4', label: '3:4 (Visual Novel CG)' },
    { value: '4:3', label: '4:3 (Classic Academy)' },
    { value: '2:3', label: '2:3 (Book Cover / Poster)' },
    { value: '3:2', label: '3:2 (Classic 35mm)' },
  ];

  const imageSizes = [
    { value: '1K', label: '1K Standard (Fastest)' },
    { value: '2K', label: '2K High Definition' },
    { value: '4K', label: '4K Ultra High-Fidelity' },
  ];

  const quickPresets = [
    'Cassio in tailored charcoal suit, pouring wine in gothic library, lightning illuminating high arched windows',
    'Rain-lashed Victorian glass conservatory at midnight, overgrown black orchids, water dripping from iron frames',
    'Julian Vance with hazel predatory eyes and velvet lapels, leaning on silver cane in dimly lit study',
    'Lian in dark high-collared dress, bruised left wrist resting on mahogany desk, defiant graphite gaze',
    'Subterranean stone vault archive, chained ledgers, flickering candlelight, shadow of an imposing figure',
  ];

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          aspectRatio,
          imageSize,
        }),
      });

      const data = await res.json();
      if (res.ok && data.imageUrl) {
        setGeneratedImage(data.imageUrl);
      } else {
        setErrorMsg(data.error || 'Failed to generate visual illustration.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with visual generation model.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const a = document.createElement('a');
    a.href = generatedImage;
    a.download = `noir_scene_${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl max-h-[92vh] bg-[#121216] border border-[#27272a] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#27272a] bg-[#0c0c0e]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="font-heading font-semibold text-base text-zinc-100">
                AI VISUAL NOVEL SCENE & PORTRAIT STUDIO
              </h2>
              <p className="text-[11px] text-zinc-400">
                Powered by gemini-3-pro-image with 1K / 2K / 4K resolution and cinematic aspect ratios
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Prompt Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase">
              Scene Illustration Prompt:
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Cassio standing before high stained glass windows during midnight storm..."
              className="w-full p-2.5 bg-[#09090b] border border-zinc-700 rounded-lg text-xs text-white focus:outline-none focus:border-red-500 font-serif leading-relaxed"
            />
          </div>

          {/* Quick Presets */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono text-zinc-500">
              Quick Gothic Presets:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {quickPresets.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setPrompt(p)}
                  className="text-[10px] px-2 py-1 rounded bg-[#18181b] border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors truncate max-w-full"
                >
                  {p.slice(0, 48)}...
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio & Resolution Affordances */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-[#09090b] border border-[#27272a]">
            <div>
              <label className="text-[10px] font-semibold text-zinc-400 uppercase block mb-1">
                Aspect Ratio (1:1 to 21:9):
              </label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full p-2 bg-[#121216] border border-zinc-700 rounded text-xs text-zinc-200"
              >
                {aspectRatios.map((ar) => (
                  <option key={ar.value} value={ar.value}>
                    {ar.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-zinc-400 uppercase block mb-1">
                Image Resolution (1K, 2K, 4K):
              </label>
              <select
                value={imageSize}
                onChange={(e) => setImageSize(e.target.value)}
                className="w-full p-2 bg-[#121216] border border-zinc-700 rounded text-xs text-zinc-200"
              >
                {imageSizes.map((sz) => (
                  <option key={sz.value} value={sz.value}>
                    {sz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-800 to-red-600 hover:from-red-700 hover:to-red-500 disabled:opacity-40 text-white font-semibold text-xs tracking-wider shadow-xl transition-all flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Crafting Visual Novel Scene ({imageSize})...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate High-Quality Visual CG</span>
              </>
            )}
          </button>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-200">
              {errorMsg}
            </div>
          )}

          {/* Generated Result Preview */}
          {generatedImage && (
            <div className="space-y-3 pt-2 border-t border-[#27272a] animate-in fade-in">
              <div className="relative rounded-xl overflow-hidden border border-red-900/60 shadow-2xl bg-black">
                <img
                  src={generatedImage}
                  alt="Generated Scene"
                  className="w-full h-auto max-h-[340px] object-contain mx-auto"
                />
              </div>

              {/* Action Buttons for the Image */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <button
                  onClick={() => {
                    onSetAsWallpaper(generatedImage);
                    alert('Applied as current scene wallpaper!');
                  }}
                  className="px-3 py-2 rounded-lg bg-[#18181b] border border-zinc-700 hover:border-red-500 text-zinc-200 text-center font-medium transition-colors"
                >
                  Set as Chat Wallpaper
                </button>
                <button
                  onClick={() => {
                    onSetAsCharacterAvatar(generatedImage);
                    alert('Set as character primary avatar!');
                  }}
                  className="px-3 py-2 rounded-lg bg-[#18181b] border border-zinc-700 hover:border-red-500 text-zinc-200 text-center font-medium transition-colors"
                >
                  Set as Character Avatar
                </button>
                <button
                  onClick={handleDownload}
                  className="px-3 py-2 rounded-lg bg-red-800 hover:bg-red-700 text-white text-center font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Image</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
