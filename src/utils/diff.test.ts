import { describe, it, expect } from 'vitest'
import { diffGpx } from './diff'

const makeLine = (coords: number[][]) => ({
  type: 'FeatureCollection',
  features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: coords } }]
})

describe('diffGpx', () => {
  it('detects differences when points are farther than threshold', () => {
    const a = makeLine([[0, 0], [0.001, 0]])
    const b = makeLine([[0, 0], [0.0005, 0]])
    const diff = diffGpx(a as any, b as any, 30)
    expect(diff.features.length).toBeGreaterThan(0)
  })

  it('no differences when threshold is large', () => {
    const a = makeLine([[0, 0], [0.001, 0]])
    const b = makeLine([[0, 0], [0.0005, 0]])
    const diff = diffGpx(a as any, b as any, 200)
    expect(diff.features.length).toBe(0)
  })

  it('returns empty feature collection when A has no coordinates', () => {
    const empty = { type: 'FeatureCollection', features: [] }
    const b = makeLine([[0, 0], [0.0005, 0]])
    const diff = diffGpx(empty as any, b as any, 10)
    expect(diff.features.length).toBe(0)
  })
})
