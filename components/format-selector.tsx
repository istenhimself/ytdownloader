"use client";

import { useState } from "react";
import type { VideoFormat } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FormatSelectorProps {
  formats: VideoFormat[];
  onDownload: (format: VideoFormat) => void;
  isDownloading?: boolean;
  downloadingFormatIds?: (string | undefined)[];
}

export function FormatSelector({
  formats,
  onDownload,
  isDownloading = false,
  downloadingFormatIds = [],
}: FormatSelectorProps) {
  const [sortBy, setSortBy] = useState<"quality" | "size" | "format">(
    "quality"
  );
  const [selectedFormat, setSelectedFormat] = useState<VideoFormat | null>(
    null
  );

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Size unknown";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  };

  const getDisplayQuality = (format: VideoFormat) => {
    // For video formats, show standard YouTube-like quality labels
    if (format.vcodec && format.vcodec !== "none") {
      const heightMatch = format.quality.match(/(\d+)p/);
      if (heightMatch) {
        const height = Number.parseInt(heightMatch[1]);

        // Map to standard YouTube quality labels
        if (height >= 2160) return "2160p (4K)";
        if (height >= 1440) return "1440p (2K)";
        if (height >= 1080) return "1080p (HD)";
        if (height >= 720) return "720p (HD)";
        if (height >= 480) return "480p";
        if (height >= 360) return "360p";
        if (height >= 240) return "240p";
        return "144p";
      }
    }

    // For audio formats, show bitrate with codec
    if (format.vcodec === "none" || !format.vcodec) {
      const bitrateMatch = format.quality.match(/(\d+)kbps/);
      const bitrate = bitrateMatch ? bitrateMatch[1] : "Unknown";

      // Get audio codec name
      let audioType = "";
      if (format.acodec) {
        if (format.acodec.includes("opus")) audioType = "Opus";
        else if (format.acodec.includes("mp4a")) audioType = "AAC";
        else if (format.acodec.includes("vorbis")) audioType = "Vorbis";
        else if (format.acodec === "none") audioType = "";
        else audioType = format.acodec.toUpperCase().substring(0, 4);
      }

      return audioType ? `${bitrate}kbps ${audioType}` : `${bitrate}kbps`;
    }

    return format.quality;
  };

  const getQualityScore = (quality: string) => {
    const qualityMap: { [key: string]: number } = {
      "2160p": 2160,
      "1440p": 1440,
      "1080p": 1080,
      "720p": 720,
      "480p": 480,
      "360p": 360,
      "240p": 240,
      "144p": 144,
    };

    for (const [key, value] of Object.entries(qualityMap)) {
      if (quality.includes(key)) return value;
    }

    // For audio formats, extract bitrate
    const bitrateMatch = quality.match(/(\d+)kbps/);
    if (bitrateMatch) return Number.parseInt(bitrateMatch[1]);

    return 0;
  };

  const sortFormats = (formats: VideoFormat[]) => {
    return [...formats].sort((a, b) => {
      switch (sortBy) {
        case "quality":
          return getQualityScore(b.quality) - getQualityScore(a.quality);
        case "size":
          return (b.filesize || 0) - (a.filesize || 0);
        case "format":
          return a.ext.localeCompare(b.ext);
        default:
          return 0;
      }
    });
  };

  const videoFormats = formats.filter((f) => f.vcodec && f.vcodec !== "none");
  // Only show MP4/M4A audio formats
  const audioFormats = formats.filter(
    (f) =>
      (f.vcodec === "none" || !f.vcodec) && (f.ext === "m4a" || f.ext === "mp4")
  );
  const combinedFormats = formats.filter(
    (f) => f.vcodec && f.vcodec !== "none" && f.acodec && f.acodec !== "none"
  );

  const handleDownload = (format: VideoFormat) => {
    setSelectedFormat(format);
    onDownload(format);
  };

  const getFormatIcon = (format: VideoFormat) => {
    if (format.vcodec === "none" || !format.vcodec) {
      // Audio only
      return (
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
          />
        </svg>
      );
    } else {
      // Video
      return (
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      );
    }
  };

  const FormatCard = ({ format }: { format: VideoFormat }) => (
    <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:border-primary/50 hover:bg-accent/5 transition-all">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="text-muted-foreground mt-0.5 flex-shrink-0">
          {getFormatIcon(format)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-semibold text-base">
              {getDisplayQuality(format)}
            </span>
            {format.format_note && (
              <Badge variant="secondary" className="text-xs">
                {format.format_note}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              {format.ext.toUpperCase()}
            </Badge>
            <span className="whitespace-nowrap">
              {formatFileSize(format.filesize)}
            </span>
            {format.vcodec && format.vcodec !== "none" && (
              <>
                <span>•</span>
                <span className="whitespace-nowrap">
                  {format.vcodec.includes("avc")
                    ? "H.264"
                    : format.vcodec.includes("vp9")
                    ? "VP9"
                    : format.vcodec.includes("av01")
                    ? "AV1"
                    : "Video"}
                </span>
              </>
            )}
            {format.acodec && format.acodec !== "none" && (
              <>
                <span>•</span>
                <span className="whitespace-nowrap">
                  {format.acodec.includes("opus")
                    ? "Opus"
                    : format.acodec.includes("mp4a")
                    ? "AAC"
                    : format.acodec.includes("vorbis")
                    ? "Vorbis"
                    : "Audio"}
                </span>
              </>
            )}
            {format.fps && (
              <>
                <span>•</span>
                <span className="whitespace-nowrap">{format.fps}fps</span>
              </>
            )}
            {format.tbr && (
              <>
                <span>•</span>
                <span className="whitespace-nowrap">
                  {Math.round(format.tbr)}kbps
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <Button
        onClick={() => handleDownload(format)}
        disabled={downloadingFormatIds.includes(format.format_id)}
        size="sm"
        className="ml-4 flex-shrink-0"
      >
        {downloadingFormatIds.includes(format.format_id) ? (
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            <span className="hidden sm:inline">
              {selectedFormat?.format_id === format.format_id
                ? "Downloading"
                : "Queued"}
            </span>
          </div>
        ) : (
          "Download"
        )}
      </Button>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold">Choose Quality</h3>
        <Select
          value={sortBy}
          onValueChange={(value: "quality" | "size" | "format") =>
            setSortBy(value)
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="quality">Best Quality</SelectItem>
            <SelectItem value="size">Largest First</SelectItem>
            <SelectItem value="format">By Type</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="video" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-11">
          <TabsTrigger value="video" className="text-sm">
            <span className="hidden sm:inline">Video</span>
            <span className="sm:hidden">Video</span>
            <span className="ml-1.5">({combinedFormats.length})</span>
          </TabsTrigger>
          <TabsTrigger value="audio" className="text-sm">
            <span className="hidden sm:inline">Audio Only</span>
            <span className="sm:hidden">Audio</span>
            <span className="ml-1.5">({audioFormats.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="video" className="space-y-3 mt-4">
          {sortFormats(combinedFormats).map((format) => (
            <FormatCard key={format.format_id} format={format} />
          ))}
          {combinedFormats.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No video formats available
            </div>
          )}
        </TabsContent>

        <TabsContent value="audio" className="space-y-3 mt-4">
          {sortFormats(audioFormats).map((format) => (
            <FormatCard key={format.format_id} format={format} />
          ))}
          {audioFormats.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No MP4 audio formats available
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="text-center pt-2">
        <p className="text-xs text-muted-foreground">
          Files are named: [Video Title] - [Channel].
          {selectedFormat?.ext || "ext"}
        </p>
      </div>
    </div>
  );
}
