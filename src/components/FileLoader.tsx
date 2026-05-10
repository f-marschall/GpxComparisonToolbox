import React from 'react'
import { gpx as parseGpx } from '@mapbox/togeojson'

type FileLoadResult = { id: string; name: string; content: string; geojson: any }

type Props = {
  onLoad: (items: FileLoadResult[]) => void
}

export default function FileLoader({ onLoad }: Props) {
  const [isDragging, setIsDragging] = React.useState(false)

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const results: FileLoadResult[] = []
    for (const file of files) {
      try {
        const content = await file.text()
        const doc = new DOMParser().parseFromString(content, 'application/xml')
        const gj = (parseGpx as any)(doc)
        results.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          name: file.name,
          content,
          geojson: gj
        })
      } catch (err) {
        console.error('Failed to parse', file.name, err)
        // continue with others
      }
    }
    if (results.length === 0) alert('No valid GPX files loaded')
    onLoad(results)
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files || [])
    if (files.length === 0) return
    const input = {
      target: { files }
    } as unknown as React.ChangeEvent<HTMLInputElement>
    await handleFiles(input)
  }

  return (
    <div
      className={`dropzone${isDragging ? ' dragging' : ''}`}
      onDragEnter={() => setIsDragging(true)}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <p className="dropzone-title">Load GPX file(s)</p>
      <p className="dropzone-hint">Drag & drop one or more GPX files here, or choose them from your device. Everything stays in your browser.</p>
      <div className="dropzone-actions">
        <input id="gpx-file-input" type="file" multiple accept=".gpx,application/gpx+xml" onChange={handleFiles} />
      </div>
    </div>
  )
}
