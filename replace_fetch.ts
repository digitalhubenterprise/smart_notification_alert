import fs from 'fs';
import path from 'path';

const files = [
  'src/components/admin/AdminSettingsTab.tsx',
  'src/components/admin/AdminSubscribersTab.tsx',
  'src/components/admin/AdminBackupsTab.tsx',
  'src/components/admin/SuperAdminDashboardTab.tsx',
  'src/components/admin/AdminLogsTab.tsx',
  'src/components/admin/AdminPlansTab.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  if (content.includes('fetch(')) {
    content = content.replace(/fetch\(/g, 'apiFetch(');
    content = `import { apiFetch } from "../../lib/api";\n` + content;
    fs.writeFileSync(file, content);
  }
}
console.log('done admin files');
