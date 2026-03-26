const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/dark:hover:bg-gray-700 dark:bg-gray-800/g, 'dark:hover:bg-gray-700');

fs.writeFileSync('src/App.tsx', content);
console.log('Done fixing duplicates');
