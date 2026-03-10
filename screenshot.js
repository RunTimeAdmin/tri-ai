const http = require('http');
const fs = require('fs');

// Simple screenshot using the built-in fetch to save the HTML
// and render it as a static page for deploy preview
async function main() {
  const res = await fetch('http://localhost:3000/');
  const html = await res.text();
  fs.writeFileSync('/workspace/dissensus-engine-preview.html', html);
  console.log('Saved preview HTML');
}
main();