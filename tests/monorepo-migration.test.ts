/**
 * Tests for: pnpm monorepo migration (workspace structure + build verification)
 * Contract source: runs/run_20260716_133354/plan.md § Interface Contract
 * Covers criteria: #1, #2, #3, #4, #8, #9, #10 (from prd.md)
 *
 * Criteria #5 (.npmrc compatibility) and #6 (CI workflow update) are satisfied
 * by the file changes themselves per plan.md's coverage table, not by an
 * automated test here — no CONTRACT_GAP, this is the Architect's explicit call.
 */

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve } from 'node:path'

const ROOT = resolve(__dirname, '..')

describe('pnpm workspace structure', () => {
  it('declares apps/* as a workspace member in pnpm-workspace.yaml', () => {
    const contents = readFileSync(resolve(ROOT, 'pnpm-workspace.yaml'), 'utf-8')
    expect(contents).toMatch(/apps\/\*/)
  })

  it('has apps/web/package.json with name "web"', () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'apps/web/package.json'), 'utf-8'))
    expect(pkg.name).toBe('web')
  })

  it('apps/web/package.json declares the expected scripts', () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'apps/web/package.json'), 'utf-8'))
    expect(pkg.scripts).toMatchObject({
      dev: expect.any(String),
      build: expect.any(String),
      'type-check': expect.any(String),
      lint: expect.any(String),
    })
  })

  it('root package.json no longer lists app runtime dependencies', () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf-8'))
    expect(pkg.dependencies ?? {}).not.toHaveProperty('vue')
  })

  it('package-lock.json has been removed', () => {
    expect(existsSync(resolve(ROOT, 'package-lock.json'))).toBe(false)
  })
})

describe('build verification', () => {
  it('pnpm --filter web type-check succeeds', () => {
    expect(() =>
      execSync('pnpm --filter web type-check', { cwd: ROOT, stdio: 'pipe' })
    ).not.toThrow()
  })

  it('pnpm --filter web build succeeds', () => {
    expect(() =>
      execSync('pnpm --filter web build', { cwd: ROOT, stdio: 'pipe' })
    ).not.toThrow()
  })
})
