const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// First, clean up any previous dark: classes we added to start fresh
content = content.replace(/ dark:[a-z0-9\-\/]+/g, '');

// Now apply the replacements globally
const replacements = {
  'bg-white': 'bg-white dark:bg-gray-900',
  'text-gray-900': 'text-gray-900 dark:text-white',
  'text-gray-800': 'text-gray-800 dark:text-gray-100',
  'text-gray-700': 'text-gray-700 dark:text-gray-200',
  'text-gray-600': 'text-gray-600 dark:text-gray-300',
  'text-gray-500': 'text-gray-500 dark:text-gray-400',
  'text-gray-400': 'text-gray-400 dark:text-gray-500',
  'bg-gray-50': 'bg-gray-50 dark:bg-gray-800',
  'bg-gray-100': 'bg-gray-100 dark:bg-gray-800',
  'border-gray-100': 'border-gray-100 dark:border-gray-800',
  'border-gray-200': 'border-gray-200 dark:border-gray-700',
  'border-gray-300': 'border-gray-300 dark:border-gray-700',
  'divide-gray-50': 'divide-gray-50 dark:divide-gray-800',
  'divide-gray-100': 'divide-gray-100 dark:divide-gray-800',
  'divide-gray-200': 'divide-gray-200 dark:divide-gray-700',
  'hover:bg-gray-50': 'hover:bg-gray-50 dark:hover:bg-gray-800',
  'hover:bg-gray-100': 'hover:bg-gray-100 dark:hover:bg-gray-700',
  'ring-gray-200': 'ring-gray-200 dark:ring-gray-700',
  'placeholder-gray-400': 'placeholder-gray-400 dark:placeholder-gray-500'
};

for (const [key, value] of Object.entries(replacements)) {
  // Use regex to match the exact class name (word boundary)
  // We don't need to escape hyphen for RegExp constructor unless it's in a character class
  const regex = new RegExp('(?<![a-zA-Z0-9-])' + key + '(?![a-zA-Z0-9-])', 'g');
  content = content.replace(regex, value);
}

fs.writeFileSync('src/App.tsx', content);
console.log('Done replacing classes');
