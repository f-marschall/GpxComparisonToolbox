import React, { useEffect, useRef } from 'react'
import L from 'leaflet'

type Track = { id: string; name: string; geojson: any; visible: boolean; color: string; isDiff?: boolean }

type Props = { tracks: Track[]; onReady?: (controls: any) => void }

export default function MapView({ tracks, onReady }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layersRef = useRef<Record<string, L.GeoJSON>>({})

  const fitToVisibleTracks = () => {
    if (!mapRef.current) return
    const visibleLayers = tracks
      .filter((track) => track.visible)
      .map((track) => layersRef.current[track.id])
      .filter((layer): layer is L.GeoJSON => Boolean(layer))

    if (visibleLayers.length === 0) return

    try {
      const group = L.featureGroup(visibleLayers)
      const bounds = group.getBounds()
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [24, 24], animate: true })
      }
    } catch {
      // ignore invalid bounds; a later update may provide a better fit
    }
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    mapRef.current = L.map(containerRef.current).setView([0, 0], 2)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapRef.current)

    if (onReady) {
      onReady({
        zoomToTrack: (id: string) => {
          const layer = layersRef.current[id]
          if (!mapRef.current || !layer) return
          try {
            const bounds = layer.getBounds()
            if (bounds.isValid()) {
              mapRef.current.fitBounds(bounds, { padding: [24, 24], animate: true })
            }
          } catch {
            // ignore invalid bounds
          }
        },
        zoomToAll: () => {
          fitToVisibleTracks()
        }
      })
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current) return

    // remove layers no longer present
    const existingIds = new Set(Object.keys(layersRef.current))
    for (const id of existingIds) {
      if (!tracks.find(t => t.id === id)) {
        mapRef.current.removeLayer(layersRef.current[id])
        delete layersRef.current[id]
      }
    }

    // add/update tracks
    for (const t of tracks) {
      const style = { color: t.color, weight: t.isDiff ? 4 : 3, dashArray: t.isDiff ? '6 6' : undefined }
      const layer = L.geoJSON(t.geojson as any, { style })
      if (layersRef.current[t.id]) {
        mapRef.current.removeLayer(layersRef.current[t.id])
      } else {
        layersRef.current[t.id] = layer
      }

      if (t.visible) {
        layer.addTo(mapRef.current)
      } else {
        mapRef.current.removeLayer(layer)
      }

      layersRef.current[t.id] = layer
    }

    requestAnimationFrame(() => {
      fitToVisibleTracks()
    })
  }, [tracks])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
