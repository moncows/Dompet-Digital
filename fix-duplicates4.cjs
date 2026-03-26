const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/dark:bg-blue-900\/30 dark:bg-blue-900\/30/g, 'dark:bg-blue-900/30');
content = content.replace(/dark:bg-rose-900\/30 dark:bg-rose-900\/30/g, 'dark:bg-rose-900/30');

fs.writeFileSync('src/App.tsx', content);
console.log('Done fixing duplicates');
