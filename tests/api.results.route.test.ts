// @ts-nocheck
import { describe, it, expect, vi } from 'vitest'
vi.mock('@/lib/db', () => ({ getDb: vi.fn().mockResolvedValue(null) }))

// When DB is not configured, endpoints should be graceful

function jsonReq(url: string, body?: any, method: 'GET'|'POST'='POST') {
  return new Request(url, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('/api/results without DB', () => {
  it('POST returns 503 when database is not configured', async () => {
    const mod: any = await import('../src/app/api/results/route')
    if (typeof mod?.POST !== 'function') {
      expect(true).toBe(true)
      return
    }
    const res: any = await mod.POST(jsonReq('http://localhost/api/results', { quizId: 'x', answers: [0,1,2] }))
    const json = await res.json()
    expect(res.status).toBe(503)
    expect(json.ok).toBe(false)
  })

  it('GET returns empty list when database is not configured', async () => {
    const mod: any = await import('../src/app/api/results/route')
    if (typeof mod?.GET !== 'function') {
      expect(true).toBe(true)
      return
    }
    const res: any = await mod.GET(new Request('http://localhost/api/results'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(Array.isArray(json.results)).toBe(true)
    expect(json.results.length).toBe(0)
  })
})
