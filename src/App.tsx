import React, { useEffect, useMemo, useState, useRef } from 'react'
import FileLoader from './components/FileLoader'
import MapView from './components/MapView'
import TrackPanel from './components/TrackPanel'
import { gpx as parseGpx } from '@mapbox/togeojson'
import { computeStats } from './utils/geo'
import { deleteGpxFile, getStoredGpxFiles, saveGpxFile } from './utils/gpxStore'

type Track = {
  id: string
  name: string
  content: string
  geojson: any
  visible: boolean
  color: string
  stats: ReturnType<typeof computeStats>
}

const COLORS = ['#d00', '#0066cc', '#009933', '#cc6600', '#800080', '#0099cc']

function pickColor(i: number) {
  return COLORS[i % COLORS.length]
}

export default function App() {
  const [tracks, setTracks] = useState<Track[]>([])
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

  const removeTrack = async (id: string) => {
    setTracks((t) => t.filter((x) => x.id !== id))
    await deleteGpxFile(id)
  }

  const visibleTracks = useMemo(() => tracks.filter((track) => track.visible), [tracks])

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>GPX Comparison Toolbox</h1>
          <p>Load multiple GPX files in the browser and compare them side by side.</p>
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
