/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lets a verification build run beside `next dev` without clobbering its cache.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Native module; must not be bundled by webpack.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
