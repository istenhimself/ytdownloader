"use client";

import type { RefObject } from "react";
import type { VideoDetails as VideoDetailsType, VideoFormat } from "@/lib/api";
import { FormatSelector } from "@/components/format-selector";
import { DownloadProgress } from "@/components/download-progress";
import { Badge } from "@/components/ui/badge";

interface DownloadItem {
  id: string;
  title: string;
  channel: string;
  format: string;
  status:
    | "queued"
    | "preparing"
    | "downloading"
    | "completed"
    | "error"
    | "cancelled";
  progress?: number;
  error?: string;
}

interface VideoDetailsProps {
  video: VideoDetailsType;
  onDownload: (format: VideoFormat) => void;
  isDownloading?: boolean;
  downloadingFormatIds?: (string | undefined)[];
  downloads: DownloadItem[];
  onClearCompleted: () => void;
  onRetryDownload: (id: string) => void;
  onCancelDownload: (id: string) => void;
  downloadsRef?: RefObject<HTMLDivElement | null>;
}

export function VideoDetails({
  video,
  onDownload,
  isDownloading = false,
  downloadingFormatIds = [],
  downloads,
  onClearCompleted,
  onRetryDownload,
  onCancelDownload,
  downloadsRef,
}: VideoDetailsProps) {
  const formatDuration = (duration: string) => {
    const seconds = Number.parseInt(duration);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      {/* Video Preview Card */}
      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
        <div className="grid md:grid-cols-5 gap-0">
          {/* Thumbnail */}
          <div className="relative md:col-span-2 aspect-video md:aspect-auto">
            <img
              src={
                video.thumbnail ||
                "/placeholder.svg?height=360&width=640&query=YouTube video thumbnail"
              }
              alt={video.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-3 right-3 bg-black/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-md text-sm font-medium">
              {formatDuration(video.duration)}
            </div>
          </div>

          {/* Video Info */}
          <div className="md:col-span-3 p-6">
            <h3 className="text-xl font-bold mb-3 line-clamp-2 leading-tight">
              {video.title}
            </h3>

            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-4">
              <span className="font-medium text-foreground truncate max-w-[200px]">
                {video.channel}
              </span>
              <span>•</span>
              <span className="whitespace-nowrap">{video.viewCount} views</span>
              <span>•</span>
              <span className="whitespace-nowrap">{video.uploadDate}</span>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="secondary" className="font-normal">
                {formatDuration(video.duration)}
              </Badge>
              <Badge variant="secondary" className="font-normal">
                {video.formats.length} quality options
              </Badge>
            </div>

            {video.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {video.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Download Progress */}
      <div ref={downloadsRef}>
        <DownloadProgress
          downloads={downloads}
          onClearCompleted={onClearCompleted}
          onRetryDownload={onRetryDownload}
          onCancelDownload={onCancelDownload}
        />
      </div>

      {/* Format Selection */}
      <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
        <FormatSelector
          formats={video.formats}
          onDownload={onDownload}
          isDownloading={isDownloading}
          downloadingFormatIds={downloadingFormatIds}
        />
      </div>
    </div>
  );
}
