import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');
content = content.replace(/fetch\(/g, 'apiFetch(');
content = `import { apiFetch } from "./lib/api";\n` + content;
fs.writeFileSync('src/App.tsx', content);
console.log('done App.tsx');
