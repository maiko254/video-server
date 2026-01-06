### Simple Local-Network Video Server
Simple local-network video server built with Node.js, Express, and a minimal vanilla JS frontend.

It serves video files from the videos directory, lists them in a web UI, and streams them with HTTP range support so you can seek and play large files efficiently from any device on your LAN.

## Features
* Local-network video streaming (no accounts, no cloud, no database)
* Lists video files from the videos directory
* Supports mp4 formats
* HTTP range requests for efficient seeking and playback
* Simple web UI for selecting and playing videos
* Accessible from other devices on the same Wi-Fi/network


## Project structure
* [server.js](server.js) – Express server, API endpoints, and static file hosting
* [index.html](public/index.html) – Frontend HTML shell
* [app.js](public/app.js) – Frontend logic (fetch list, render UI, handle playback)
* [styles.css](public/styles.css) – Basic styling
* [videos](videos) – Folder where you put your video files (mp4, webm)


## Requirements
* Node.js (18+ recommended)
* npm (comes with Node)
* A folder of video files (mp4 or webm) that you want to stream


## Installation
From the project root:

  1. Install dependencies
     Run: npm install
  2. Start the server
     Run: npm start

By default the server listens on:

  * Host: 0.0.0.0 (all interfaces, so other devices on your LAN can connect)
  * Port: 3000

So the app will be available at:
[http://0.0.0.0:3000](localhost:3000)
or from other devices on your network using your machine’s IP, for example:
[http://192.168.1.42:3000](http://192.168.1.42:3000)

You can change the port by setting the environment variable PORT before starting the server.


## Usage
  1. Place videos into the videos directory.
      * Only files with .mp4 or .webm extensions are listed and playable.
  2. Start the server (npm start).
  3.Open the web UI in a browser:
     * On the same machine: http://localhost:3000
     * On another device on the same network: http://<your-machine-ip>:3000
  4. The page will:
      * Fetch the video list from the server
      * Show each video as a clickable item
      * Start playback in the built-in video player when you click an item

If there are no supported videos, the UI will show a message explaining that no videos were found in videos.


## API
The backend in [server.js](server.js) exposes a small HTTP API:

* GET /api/videos
  Returns a JSON array of available videos. Example response:
  [ { "name": "movie1.mp4" }, { "name": "clip.webm" } ]

* GET /api/stream/:name
  Streams the given video file with HTTP range support.
    * Accepts a Range header for partial content (seeking).
    * Validates the file name and only allows mp4/webm under the videos directory.

The frontend in [app.js](public/app.js) uses:

 * GET /api/videos to populate the list
 * GET /api/stream/:name as the src for the HTML video element


## Security and scope

This project is intended for:

 * Personal use
 * Trusted local networks only

It intentionally does not include:

  * Authentication or authorization
  * TLS/HTTPS termination
  * Quotas, rate limiting, or multi-user controls

If you expose this server outside your private network, you should put it behind a proper reverse proxy and add authentication and HTTPS.


## Development notes
 * Static files (HTML, JS, CSS) are served from public.
 * Video files are read as streams (not loaded fully into memory).
 * HTTP range support allows skipping around in long videos without re-downloading from the start.