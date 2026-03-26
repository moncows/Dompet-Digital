const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const colors = ['emerald', 'teal', 'orange', 'purple', 'blue', 'rose', 'amber'];

for (const color of colors) {
  const regex = new RegExp(`bg-${color}-100(?! dark:bg-${color}-900\\\\/30)`, 'g');
  content = content.replace(regex, `bg-${color}-100 dark:bg-${color}-900/30`);
}

fs.writeFileSync('src/App.tsx', content);
console.log('Done replacing category colors');
