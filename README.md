# YTDown

A simple YouTube downloader. Paste a link, pick your quality, download. That's it.

## What it does

You know when you find a great video but you'll be offline later? Or you want to save a song for your playlist? This does that. Just paste the YouTube link, choose if you want video or just audio, and download.

Works with regular videos, Shorts, and music videos.

## Important

This is for educational purposes. Don't be a jerk - respect copyright and support creators.

## Features

- Multiple quality options (4K, 2K, 1080p, 720p, 480p, 360p, 240p, 144p)
- Audio-only downloads (M4A format, 128kbps)
- Real-time download progress tracking
- Download queue (downloads one at a time, others wait in line)
- Cancel downloads mid-way
- Retry failed downloads
- Auto-scroll to downloads
- Mobile friendly
- No ads, no sign-ups, no BS

## Quick start

**With Docker (recommended):**

```bash
docker compose up -d
```

Open http://localhost:3000

Everything you need (including yt-dlp and ffmpeg) is already in the Docker container.

## How to use

1. Copy a YouTube URL
2. Paste it in the box
3. Hit Continue
4. Pick your quality (video or audio only)
5. Click Download

Your browser will download the file automatically. Files are named: `[Video Title] - [Channel].ext`

You can queue multiple downloads - they'll process one at a time. Cancel anytime with the Cancel button.

### How to stop:

```bash
docker compose down
```

## Tech stack

Built with Next.js 16, React 19, TypeScript, Tailwind CSS, and Bun. Uses yt-dlp for downloading and XMLHttpRequest for progress tracking.

## Rate limits

Basic rate limits to prevent abuse:

- 30 video info requests per minute
- 10 downloads per minute
- Max file size: 2GB
- Download timeout: 15 minutes

## How downloads work

- Click download → Goes to queue with "queued" status
- When ready → Status changes to "preparing" then "downloading"
- Progress bar shows real-time download percentage
- When done → File downloads to your browser
- Failed downloads show error with retry button
- Cancelled downloads can be retried

Only one download runs at a time. Others wait in queue.
