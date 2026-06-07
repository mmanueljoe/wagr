import path from 'node:path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Pin Turbopack to the Wagr monorepo root so it doesn't latch onto a stray
  // lockfile elsewhere on the machine.
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
}

export default nextConfig
