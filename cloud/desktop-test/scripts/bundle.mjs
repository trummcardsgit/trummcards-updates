import {build} from 'esbuild';
await build({
  entryPoints: ['src/vendor-entry.js'],
  outfile: 'src/vendor.js',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome120'],
  sourcemap: false,
  minify: true,
  logLevel: 'warning',
});
