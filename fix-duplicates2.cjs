const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/dark:hover:bg-blue-900\/20 dark:bg-blue-900\/20/g, 'dark:hover:bg-blue-900/20');
content = content.replace(/dark:hover:bg-rose-900\/20 dark:bg-rose-900\/20/g, 'dark:hover:bg-rose-900/20');

fs.writeFileSync('src/App.tsx', content);
console.log('Done fixing duplicates');
