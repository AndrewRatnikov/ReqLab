/**
 * Tests for: pnpm monorepo migration (workspace structure + build verification)
 * Contract source: runs/run_20260716_133354/plan.md § Interface Contract
 * Covers criteria: #1, #2, #3, #4, #6, #7, #8, #9, #10 (from prd.md)
 *
 * Criterion #5 (.npmrc compatibility) is satisfied by the file being left
 * unchanged per plan.md's coverage table, not by an automated test here —
 * no CONTRACT_GAP, this is the Architect's explicit call.
 *
 * Retry 1/2: test-reviewer rejected the first pass because the
 * build-verification tests called `pnpm --filter web ...` directly instead
 * of going through the root package.json's own scripts, which meant a
 * broken root delegation (criterion #7) would never be caught. Fixed by
 * invoking `pnpm run build` / `pnpm run type-check` from root instead, and
 * added a dedicated CI workflow check for criterion #6.
 */

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve } from 'node:path'

const ROOT = resolve(__dirname, '..')

describe('pnpm workspace structure', () => {
  it('declares apps/* as a workspace member in pnpm-workspace.yaml', { timeout: 15000 }, () => {
    const contents = readFileSync(resolve(ROOT, 'pnpm-workspace.yaml'), 'utf-8')
    expect(contents).toMatch(/apps\/\*/)
  })

  it('has apps/web/package.json with name "web"', { timeout: 15000 }, () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'apps/web/package.json'), 'utf-8'))
    expect(pkg.name).toBe('web')
  })

  it('apps/web/package.json declares the expected scripts', { timeout: 15000 }, () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'apps/web/package.json'), 'utf-8'))
    expect(pkg.scripts).toMatchObject({
      dev: expect.any(String),
      build: expect.any(String),
      'type-check': expect.any(String),
      lint: expect.any(String),
    })
  })

  it('root package.json no longer lists app runtime dependencies', { timeout: 15000 }, () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf-8'))
    expect(pkg.dependencies ?? {}).not.toHaveProperty('vue')
  })

  it('package-lock.json has been removed', { timeout: 15000 }, () => {
    expect(existsSync(resolve(ROOT, 'package-lock.json'))).toBe(false)
  })
})

describe('build verification', () => {
  it('root "type-check" script delegates to the web app and succeeds', { timeout: 15000 }, () => {
    expect(() => execSync('pnpm run type-check', { cwd: ROOT, stdio: 'pipe' })).not.toThrow()
  })

  it('root "build" script delegates to the web app and succeeds', { timeout: 15000 }, () => {
    expect(() => execSync('pnpm run build', { cwd: ROOT, stdio: 'pipe' })).not.toThrow()
  })
})

describe('CI workflow', () => {
  it('deploy.yml installs and builds with pnpm, not npm', { timeout: 15000 }, () => {
    const workflow = readFileSync(resolve(ROOT, '.github/workflows/deploy.yml'), 'utf-8')
    expect(workflow).toMatch(/pnpm\/action-setup/)
    expect(workflow).not.toMatch(/npm ci|npm run build/)
  })
})
