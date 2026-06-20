const fs = require('fs');
const code = fs.readFileSync('C:/MIs proyectos/TAviejito/js/SpriteSystem.js', 'utf8');
// Extract sprite data via regex
const spriteMatch = code.match(/sprites:\s*\{([\s\S]*?)\}\s*\},?\s*\n\s+init/);
if (!spriteMatch) { console.log('Could not find sprites'); process.exit(1); }

// Find all row strings
const rowRegex = /'([^']+)'/g;
let match;
let errors = [];

// Simple validation: find all string literals that are 12-char sprite rows
const lines = code.split('\n');
lines.forEach((line, i) => {
  const trimmed = line.trim();
  if (trimmed.startsWith("'") && trimmed.endsWith("',") || trimmed.endsWith("'")) {
    const content = trimmed.slice(1, trimmed.indexOf("'", 1));
    if (content.length > 0 && content.length <= 20 && content.includes('.')) {
      if (content.length !== 12) {
        errors.push(`L${i+1}: len=${content.length} "${content}"`);
      }
      if (content.includes(' ')) {
        errors.push(`L${i+1}: SPACE "${content}"`);
      }
    }
  }
});

if (errors.length === 0) {
  console.log('ALL ROWS VALID - length 12, no spaces');
} else {
  errors.forEach(e => console.log(e));
}
