import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

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

interface DownloadProgressProps {
  downloads: DownloadItem[];
  onClearCompleted: () => void;
  onRetryDownload: (id: string) => void;
  onCancelDownload: (id: string) => void;
}

export function DownloadProgress({
  downloads,
  onClearCompleted,
  onRetryDownload,
  onCancelDownload,
}: DownloadProgressProps) {
  const getStatusIcon = (status: DownloadItem["status"]) => {
    switch (status) {
      case "queued":
        return (
          <svg
            className="h-4 w-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case "preparing":
        return (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        );
      case "downloading":
        return (
          <div className="h-4 w-4 animate-pulse rounded-full bg-primary" />
        );
      case "completed":
        return (
          <svg
            className="h-4 w-4 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        );
      case "error":
        return (
          <svg
            className="h-4 w-4 text-destructive"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        );
      case "cancelled":
        return (
          <svg
            className="h-4 w-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        );
    }
  };

  const getStatusText = (status: DownloadItem["status"]) => {
    switch (status) {
      case "queued":
        return "In queue...";
      case "preparing":
        return "Getting ready...";
      case "downloading":
        return "Downloading...";
      case "completed":
        return "Done!";
      case "error":
        return "Failed";
      case "cancelled":
        return "Cancelled";
    }
  };

  const completedCount = downloads.filter(
    (d) => d.status === "completed"
  ).length;
  const errorCount = downloads.filter((d) => d.status === "error").length;

  if (downloads.length === 0) return null;

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold">Downloads</h3>
        <div className="flex items-center gap-2">
          {completedCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {completedCount} done
            </Badge>
          )}
          {errorCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {errorCount} failed
            </Badge>
          )}
          {completedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearCompleted}
              className="text-xs h-8"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {downloads.map((download) => (
          <div
            key={download.id}
            className="border border-border/50 rounded-xl p-4"
          >
            <div className="flex items-start justify-between mb-2 gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="mt-0.5 flex-shrink-0">
                  {getStatusIcon(download.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate mb-1">
                    {download.title}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate max-w-[150px]">
                      {download.channel}
                    </span>
                    <span>•</span>
                    <span>{download.format}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
                <span>{getStatusText(download.status)}</span>
                {(download.status === "queued" ||
                  download.status === "preparing" ||
                  download.status === "downloading") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCancelDownload(download.id)}
                    className="text-xs h-7 px-2"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>

            {download.status === "downloading" && (
              <Progress value={download.progress || 0} className="h-1.5" />
            )}

            {download.status === "error" && download.error && (
              <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-border/50">
                <p className="text-xs text-destructive flex-1">
                  {download.error}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRetryDownload(download.id)}
                  className="text-xs flex-shrink-0"
                >
                  Retry
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
