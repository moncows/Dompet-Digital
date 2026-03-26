const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const replacements = {
  'bg-blue-50': 'bg-blue-50 dark:bg-blue-900/20',
  'text-blue-700': 'text-blue-700 dark:text-blue-400',
  'text-blue-600': 'text-blue-600 dark:text-blue-400',
  'border-blue-200': 'border-blue-200 dark:border-blue-800',
  'ring-blue-200': 'ring-blue-200 dark:ring-blue-800',
  'hover:bg-blue-50': 'hover:bg-blue-50 dark:hover:bg-blue-900/20',
  'bg-rose-50': 'bg-rose-50 dark:bg-rose-900/20',
  'text-rose-600': 'text-rose-600 dark:text-rose-400',
  'hover:bg-rose-50': 'hover:bg-rose-50 dark:hover:bg-rose-900/20',
  'bg-emerald-50': 'bg-emerald-50 dark:bg-emerald-900/20',
  'text-emerald-600': 'text-emerald-600 dark:text-emerald-400',
  'bg-amber-50': 'bg-amber-50 dark:bg-amber-900/20',
  'text-amber-600': 'text-amber-600 dark:text-amber-400',
  'bg-purple-50': 'bg-purple-50 dark:bg-purple-900/20',
  'text-purple-600': 'text-purple-600 dark:text-purple-400',
  'bg-cyan-50': 'bg-cyan-50 dark:bg-cyan-900/20',
  'text-cyan-600': 'text-cyan-600 dark:text-cyan-400',
  'bg-orange-50': 'bg-orange-50 dark:bg-orange-900/20',
  'text-orange-600': 'text-orange-600 dark:text-orange-400',
  'bg-indigo-50': 'bg-indigo-50 dark:bg-indigo-900/20',
  'text-indigo-600': 'text-indigo-600 dark:text-indigo-400',
  'bg-pink-50': 'bg-pink-50 dark:bg-pink-900/20',
  'text-pink-600': 'text-pink-600 dark:text-pink-400',
  'bg-teal-50': 'bg-teal-50 dark:bg-teal-900/20',
  'text-teal-600': 'text-teal-600 dark:text-teal-400',
};

// First clean up any existing dark variants for these to avoid duplicates
for (const key of Object.keys(replacements)) {
  const darkClass = replacements[key].split(' ')[1];
  const regex = new RegExp(' ' + darkClass.replace(/\//g, '\\\\/'), 'g');
  content = content.replace(regex, '');
}

for (const [key, value] of Object.entries(replacements)) {
  const regex = new RegExp('(?<![a-zA-Z0-9-])' + key + '(?![a-zA-Z0-9-])', 'g');
  content = content.replace(regex, value);
}

fs.writeFileSync('src/App.tsx', content);
console.log('Done replacing color classes');
