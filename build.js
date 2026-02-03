require('esbuild').buildSync({
  entryPoints: ['popup.js'],
  bundle: true,
  outfile: 'popup.bundle.js',
  minify: false, // Set to false for easier debugging
  sourcemap: true, // Add sourcemap for debugging
  format: 'iife', // Immediately Invoked Function Expression
})

console.log('✅ popup.bundle.js built successfully');