# GPX Toolbox

Simple SPA to load GPX files in the browser and display them on a map.

This project is published at https://github.com/f-marschall/GpxComparisonToolbox.

Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173 and load a `.gpx` file using the sidebar.

All processing happens in the browser; no GPX data is sent to another server.
Imported GPX files are stored locally in your browser via IndexedDB so they survive a page refresh.