import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dir = path.join(__dirname, 'pages');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx')).map(f => path.join(dir, f));

for (let f of files) {
  let c = fs.readFileSync(f, 'utf8');
  let o = c;
  c = c.replace(/style=\{\{[^{}]*border:\s*'1px solid #ccc'[^{}]*\}\}/g, 'className="form-control"');
  if (c !== o) {
    fs.writeFileSync(f, c);
    console.log('Fixed', f);
  }
}
