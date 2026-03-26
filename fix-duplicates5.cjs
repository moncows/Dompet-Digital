const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/dark:text-gray-400 dark:text-gray-500/g, 'dark:text-gray-400');

fs.writeFileSync('src/App.tsx', content);
console.log('Done fixing duplicates');
