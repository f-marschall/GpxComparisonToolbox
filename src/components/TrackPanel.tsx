import React from 'react'

type TrackInfo = {
  id: string
  name: string
  color: string
  visible: boolean
  stats: {
    distance_km: number
    elevation_gain_m: number
    elevation_loss_m: number
  }
}

export default function TrackPanel({
  tracks,
  visibleTracks,
  onToggleVisibility,
  onRemove,
  onZoomTrack,
  onZoomAll,
  onRequestDiff
  ,isWorking
}: {
  tracks: TrackInfo[]
  visibleTracks: TrackInfo[]
  onToggleVisibility: (id: string) => void
  onRemove: (id: string) => void
  onZoomTrack: (id: string) => void
  onZoomAll: () => void
  onRequestDiff?: (thresholdMeters: number) => void
  isWorking?: boolean
}) {
  const [threshold, setThreshold] = React.useState(50)
  const totalDistance = visibleTracks.reduce((sum, track) => sum + track.stats.distance_km, 0)
  const longestTrack = visibleTracks.reduce<TrackInfo | null>((best, track) => {
    if (!best || track.stats.distance_km > best.stats.distance_km) return track
    return best
  }, null)

  return (
    <section className="panel" aria-labelledby="tracks-heading">
      <h2 id="tracks-heading" style={{ marginTop: 0 }}>Tracks ({tracks.length})</h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <button onClick={onZoomAll} disabled={visibleTracks.length === 0}>Zoom all</button>
      </div>
      {visibleTracks.length > 1 && (
        <div className="compare-card" aria-label="Visible track comparison summary">
          <strong>Comparison</strong>
          <div className="compare-grid">
            <div className="compare-metric">
              <span className="compare-label">Visible tracks</span>
              <span className="compare-value">{visibleTracks.length}</span>
            </div>
            <div className="compare-metric">
              <span className="compare-label">Total visible distance</span>
              <span className="compare-value">{totalDistance.toFixed(2)} km</span>
            </div>
            <div className="compare-metric">
              <span className="compare-label">Longest visible track</span>
              <span className="compare-value compare-value-inline" title={longestTrack?.name ?? ''}>
                {longestTrack ? (
                  <>
                    <span className="compare-track-name">{longestTrack.name}</span>
                    <span className="compare-track-stats">· {longestTrack.stats.distance_km.toFixed(2)} km</span>
                  </>
                ) : (
                  '—'
                )}
              </span>
            </div>
            <div className="compare-metric">
              <span className="compare-label">Comparison mode</span>
              <span className="compare-value">Side-by-side</span>
            </div>
            <div className="compare-metric compare-metric--wide">
              <span className="compare-label">Diff threshold (m)</span>
              <span className="compare-value">
                <input type="number" value={threshold} onChange={(e) => setThreshold(Number(e.target.value || 0))} style={{ width: 80 }} />
                <button style={{ marginLeft: 8 }} onClick={() => onRequestDiff?.(threshold)} disabled={!onRequestDiff || isWorking}>
                  {isWorking ? (
                    <>
                      <span className="spinner" aria-hidden style={{ marginRight: 8 }} />
                      Calculating…
                    </>
                  ) : (
                    'Show diffs'
                  )}
                </button>
              </span>
            </div>
          </div>
        </div>
      )}
      <div className="track-list">
        {tracks.length === 0 && (
          <div className="empty-state" role="status" aria-live="polite">
            <strong>No tracks loaded yet.</strong>
            <span>Add one or more GPX files to start comparing routes.</span>
          </div>
        )}
        {tracks.map((t) => (
          <article key={t.id} className="track-card">
            <div className="track-head">
              <div className="track-title">
                <div aria-hidden="true" style={{ width: 12, height: 12, borderRadius: 999, background: t.color, flex: '0 0 auto' }} />
                <strong>{t.name}</strong>
              </div>
              <div className="track-actions">
                <button onClick={() => onZoomTrack(t.id)} disabled={!t.visible}>Zoom</button>
                <button onClick={() => onToggleVisibility(t.id)}>{t.visible ? 'Hide' : 'Show'}</button>
                <button onClick={() => onRemove(t.id)}>Remove</button>
              </div>
            </div>
            <div className="track-meta">
              <span>{t.stats.distance_km.toFixed(2)} km</span>
              <span>+{Math.round(t.stats.elevation_gain_m)} m</span>
              <span>-{Math.round(t.stats.elevation_loss_m)} m</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
