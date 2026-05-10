type GeoJSON = any

function haversine(a: [number, number], b: [number, number]) {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const lat1 = toRad(a[1])
  const lon1 = toRad(a[0])
  const lat2 = toRad(b[1])
  const lon2 = toRad(b[0])
  const dLat = lat2 - lat1
  const dLon = lon2 - lon1
  const R = 6371000 // meters
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
  return R * c
}

export function computeStats(gj: GeoJSON) {
  let total = 0
  let gain = 0
  let loss = 0

  const handleCoords = (coords: number[][]) => {
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1]
      const cur = coords[i]
      total += haversine([prev[0], prev[1]], [cur[0], cur[1]])
      const e1 = prev[2]
      const e2 = cur[2]
      if (typeof e1 === 'number' && typeof e2 === 'number') {
        const d = e2 - e1
        if (d > 0) gain += d
        else loss += -d
      }
    }
  }

  if (gj?.type === 'FeatureCollection') {
    for (const f of gj.features) {
      if (!f.geometry) continue
      const g = f.geometry
      if (g.type === 'LineString') {
        handleCoords(g.coordinates)
      } else if (g.type === 'MultiLineString') {
        for (const part of g.coordinates) handleCoords(part)
      }
    }
  }

  return {
    distance_m: total,
    distance_km: total / 1000,
    elevation_gain_m: gain,
    elevation_loss_m: loss
  }
}
