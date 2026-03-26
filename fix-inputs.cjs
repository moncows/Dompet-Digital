const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /className="([^"]*border border-gray-300 dark:border-gray-700 rounded-xl[^"]*)"/g;
content = content.replace(regex, (match, p1) => {
  if (p1.includes('bg-white') || p1.includes('text-gray-900')) {
    return match;
  }
  return `className="${p1} bg-white dark:bg-gray-900 text-gray-900 dark:text-white"`;
});

fs.writeFileSync('src/App.tsx', content);
console.log('Done adding bg and text colors to inputs/selects');
