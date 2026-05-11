import { haversine } from './geo'

type GeoJSON = any

function flattenLineCoords(gj: GeoJSON): number[][] {
  const out: number[][] = []
  if (!gj) return out
  if (gj.type === 'FeatureCollection') {
    for (const f of gj.features) {
      if (!f.geometry) continue
      const g = f.geometry
      if (g.type === 'LineString') {
        out.push(...g.coordinates)
      } else if (g.type === 'MultiLineString') {
        for (const part of g.coordinates) out.push(...part)
      }
    }
  }
  return out
}

function minDistanceToCoords(point: number[], coords: number[][]) {
  if (coords.length === 0) return Infinity
  let best = Infinity
  for (const c of coords) {
    const d = haversine([point[0], point[1]], [c[0], c[1]])
    if (d < best) best = d
  }
  return best
}

export function diffGpx(a: GeoJSON, b: GeoJSON, thresholdMeters = 10) {
  // Compare A against B: return a GeoJSON FeatureCollection of LineStrings
  // representing contiguous segments in A whose points are farther than threshold to any point in B.
  const coordsA = flattenLineCoords(a)
  const coordsB = flattenLineCoords(b)

  if (coordsA.length === 0) return { type: 'FeatureCollection', features: [] }

  const flags: boolean[] = coordsA.map((p) => {
    const d = minDistanceToCoords(p, coordsB)
    return d > thresholdMeters
  })

  const segments: number[][][] = []
  let cur: number[][] | null = null
  for (let i = 0; i < flags.length; i++) {
    if (flags[i]) {
      if (!cur) cur = []
      cur.push(coordsA[i])
    } else {
      if (cur && cur.length > 1) segments.push(cur)
      cur = null
    }
  }
  if (cur && cur.length > 1) segments.push(cur)

  const features = segments.map((s) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: s } }))
  return { type: 'FeatureCollection', features }
}
