const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Fix duplicated dark classes
content = content.replace(/dark:hover:bg-gray-800 dark:bg-gray-800/g, 'dark:hover:bg-gray-800');

fs.writeFileSync('src/App.tsx', content);
console.log('Done fixing duplicates');
