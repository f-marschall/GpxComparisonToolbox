import React, { useEffect, useMemo, useState, useRef } from 'react'
import FileLoader from './components/FileLoader'
import MapView from './components/MapView'
import TrackPanel from './components/TrackPanel'
import { gpx as parseGpx } from '@mapbox/togeojson'
import { computeStats } from './utils/geo'
import { diffGpx } from './utils/diff'
import { deleteGpxFile, getStoredGpxFiles, saveGpxFile } from './utils/gpxStore'

type Track = {
  id: string
  name: string
  content: string
  geojson: any
  visible: boolean
  color: string
  isDiff?: boolean
  stats: ReturnType<typeof computeStats>
}

const COLORS = ['#d00', '#0066cc', '#009933', '#cc6600', '#800080', '#0099cc']

function pickColor(i: number) {
  return COLORS[i % COLORS.length]
}

export default function App() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [isCalculatingDiff, setIsCalculatingDiff] = useState(false)
  const [isLoadingStoredFiles, setIsLoadingStoredFiles] = useState(true)
  const mapControlsRef = useRef<any>({})

  useEffect(() => {
    let cancelled = false

    const loadStored = async () => {
      try {
        const storedFiles = await getStoredGpxFiles()
        if (cancelled || storedFiles.length === 0) return

        const restoredTracks = storedFiles.map((file, index) => {
          const doc = new DOMParser().parseFromString(file.content, 'application/xml')
          const geojson = (parseGpx as any)(doc)

          return {
            id: file.id,
            name: file.name,
            content: file.content,
            geojson,
            visible: true,
            color: pickColor(index),
            stats: computeStats(geojson)
          } as Track
        })

        if (!cancelled) {
          setTracks(restoredTracks)
        }
      } catch (error) {
        console.error('Failed to load stored GPX files', error)
      } finally {
        if (!cancelled) setIsLoadingStoredFiles(false)
      }
    }

    void loadStored()

    return () => {
      cancelled = true
    }
  }, [])

  const handleMapReady = (controls: any) => {
    mapControlsRef.current = controls
  }

  const addFiles = async (items: { id: string; name: string; content: string; geojson: any }[]) => {
    const next = items.map((it, idx) => ({
      id: it.id,
      name: it.name,
      content: it.content,
      geojson: it.geojson,
      visible: true,
      color: pickColor(tracks.length + idx),
      stats: computeStats(it.geojson)
    }))
    setTracks((t) => [...t, ...next])

    await Promise.all(
      next.map((track) =>
        saveGpxFile({
          id: track.id,
          name: track.name,
          content: track.content,
          addedAt: Date.now()
        })
      )
    )
  }

  const toggleVisibility = (id: string) => {
    setTracks((t) => t.map(x => x.id === id ? { ...x, visible: !x.visible } : x))
  }

  const clearOldDiffs = (list: Track[]) => list.filter((t) => !(t.id.includes('-diff-to-')))

  const requestDiff = async (thresholdMeters: number) => {
    const base = tracks.filter((t) => !t.id.includes('-diff-to-') && t.geojson)
    if (base.length < 2) {
      alert('Please load and show at least two tracks to compare')
      return
    }

    // allow UI to update before heavy computation
    setIsCalculatingDiff(true)
    await new Promise((r) => setTimeout(r, 0))

    try {
      const a = base[0]
      const b = base[1]

      const diffAB = diffGpx(a.geojson, b.geojson, thresholdMeters)
      const diffBA = diffGpx(b.geojson, a.geojson, thresholdMeters)

      const diff1: Track = {
        id: `${a.id}-diff-to-${b.id}`,
        name: `${a.name} → ${b.name} differences`,
        content: '',
        geojson: diffAB,
        visible: true,
        color: '#d00055',
        isDiff: true,
        stats: computeStats(diffAB)
      }

      const diff2: Track = {
        id: `${b.id}-diff-to-${a.id}`,
        name: `${b.name} → ${a.name} differences`,
        content: '',
        geojson: diffBA,
        visible: true,
        color: '#ff6600',
        isDiff: true,
        stats: computeStats(diffBA)
      }

      setTracks((prev) => {
        const kept = clearOldDiffs(prev)
        const hiddenOriginals = kept.map((track) => ({ ...track, visible: false }))
        return [...hiddenOriginals, diff1, diff2]
      })
    } finally {
      setIsCalculatingDiff(false)
    }
  }

  const removeTrack = async (id: string) => {
    setTracks((t) => t.filter((x) => x.id !== id))
    await deleteGpxFile(id)
  }

  const removeAllTracks = async () => {
    const idsToDelete = tracks.filter(t => !t.isDiff).map(t => t.id)
    setTracks((t) => t.filter((x) => x.isDiff))
    await Promise.all(idsToDelete.map(id => deleteGpxFile(id)))
  }

  const visibleTracks = useMemo(() => tracks.filter((track) => track.visible), [tracks])

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>GPX Comparison Toolbox</h1>
          <p>Load multiple GPX files in the browser and compare them side by side. Everything runs locally in your browser, and no track data is shared.</p>
        </div>
        <div className="file-count" aria-live="polite">
          {tracks.length === 0 ? 'No tracks loaded yet' : `${tracks.length} track${tracks.length === 1 ? '' : 's'} loaded`}
        </div>
      </header>
      <main className="shell">
        <aside className="sidebar">
          <FileLoader onLoad={(items) => void addFiles(items)} />
          <TrackPanel
            tracks={tracks}
            visibleTracks={visibleTracks}
            onToggleVisibility={toggleVisibility}
            onRemove={(id: string) => void removeTrack(id)}
            onZoomTrack={(id: string) => mapControlsRef.current?.zoomToTrack?.(id)}
            onZoomAll={() => mapControlsRef.current?.zoomToAll?.()}
            onRemoveAll={() => void removeAllTracks()}
            onRequestDiff={(threshold) => void requestDiff(threshold)}
            isWorking={isCalculatingDiff}
          />
        </aside>
        <section className="map">
          <MapView tracks={tracks} onReady={handleMapReady} />
        </section>
      </main>
      {isLoadingStoredFiles && <div style={{ display: 'none' }} aria-hidden="true">Restoring saved GPX files...</div>}
    </div>
  )
}
