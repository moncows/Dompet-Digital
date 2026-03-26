const text = 'className="bg-white text-gray-900"';
const key = 'bg-white';
const escapedKey = key.replace(/-/g, '\\\\-');
const regex = new RegExp('(?<![a-zA-Z0-9-])' + escapedKey + '(?![a-zA-Z0-9-])', 'g');
console.log(regex);
console.log(regex.test(text));
