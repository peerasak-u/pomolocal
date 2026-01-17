import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const distPath = resolve(process.cwd(), 'dist/cli.js');
const fontsPath = resolve(process.cwd(), 'fonts/block.json');

const fontContent = readFileSync(fontsPath, 'utf-8');
const cliContent = readFileSync(distPath, 'utf-8');

// Helper to escape non-ASCII characters to prevent encoding issues
function escapeUnicode(str: string) {
    return str.replace(/[^\x00-\x7F]/g, c => {
        return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
    });
}

const escapedFontContent = escapeUnicode(fontContent);

// The replacement logic:
// We look for the GetFont function definition in the bundled file.
// It looks something like:
// var GetFont = (font) => { ... try { let FONTFACE = __require(path3.normalize(`../fonts/${font}.json`)); ... } ... }

const replacement = `
  var GetFont = (font) => {
    if (font === 'block') {
      return ${escapedFontContent};
    }
    Debugging.report(\`Running GetFont\`, 1);
    try {
      let FONTFACE = __require(path3.normalize(\`../fonts/\${font}.json\`));
`;

// We use a regex to find the start of GetFont function and inject our bypass
const newCliContent = cliContent.replace(
  /var GetFont = \(font\) => \{(\s*)Debugging\.report\(`Running GetFont`, 1\);(\s*)try \{(\s*)let FONTFACE = __require\(path3\.normalize\(`\.\.\/fonts\/\$\{font\}\.json`\)\);/g,
  replacement
);

if (newCliContent === cliContent) {
  console.error('Could not patch GetFont function. Pattern did not match.');
  // Fallback: try to find just the require line if the function signature slightly differs
  const fallbackMatch = 'let FONTFACE = __require(path3.normalize(`../fonts/${font}.json`));';
  if (cliContent.includes(fallbackMatch)) {
      const fallbackReplacement = `
      let FONTFACE;
      if (font === 'block') {
         FONTFACE = ${escapedFontContent};
      } else {
         FONTFACE = __require(path3.normalize(\`../fonts/\${font}.json\`));
      }
      `;
      const fallbackNewContent = cliContent.replace(fallbackMatch, fallbackReplacement);
      writeFileSync(distPath, fallbackNewContent);
      console.log('Successfully patched dist/cli.js with fallback method');
  } else {
      console.error('Failed to patch. Please inspect dist/cli.js');
      process.exit(1);
  }
} else {
  writeFileSync(distPath, newCliContent);
  console.log('Successfully patched dist/cli.js with primary method');
}
