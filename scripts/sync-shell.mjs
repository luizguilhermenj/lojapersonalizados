import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const header=fs.readFileSync(path.join(root,'templates/store-header.html'),'utf8').trim();
const footer=fs.readFileSync(path.join(root,'templates/store-footer.html'),'utf8').trim();
for(const name of fs.readdirSync(path.join(root,'public/pages')).filter(name=>name.endsWith('.html'))){
 const file=path.join(root,'public/pages',name);let html=fs.readFileSync(file,'utf8');
 if(html.includes('<!-- artize:header -->')) html=html.replace(/<!-- artize:header -->[\s\S]*?<!-- \/artize:header -->/,`<!-- artize:header -->\n${header}\n<!-- /artize:header -->`);
 else {
  html=html.replace(/<header class="(?:site-header|sub-header)[\s\S]*?<\/header>/,'');
  html=html.replace(/<aside class="side-menu-backdrop"[\s\S]*?<\/aside>/,'').replace(/<aside class="side-menu"[\s\S]*?<\/aside>/,'');
  html=html.replace(/<body>/,`<body>\n<!-- artize:header -->\n${header}\n<!-- /artize:header -->`);
 }
 if(html.includes('<!-- artize:footer -->')) html=html.replace(/<!-- artize:footer -->[\s\S]*?<!-- \/artize:footer -->/,`<!-- artize:footer -->\n${footer}\n<!-- /artize:footer -->`);
 else html=html.replace('</body>',`<!-- artize:footer -->\n${footer}\n<!-- /artize:footer -->\n</body>`);
 if(name==='login.html'&&!html.includes('<main'))html=html.replace('<div class="auth-shell container">','<main class="auth-shell container">').replace('</div>\n<script type="module" src="/js/app.js">','</main>\n<script type="module" src="/js/app.js">');
 html=html.replace(/<main(?![^>]*id="main-content")/,'<main id="main-content" tabindex="-1"');
 if(!html.includes('/css/tokens.css'))html=html.replace(/(<link rel="stylesheet" href="\/css\/base.css"\s*\/?>)/,'<link rel="stylesheet" href="/css/tokens.css">\n$1\n<link rel="stylesheet" href="/css/components.css">');
 html=html.replace(/name="viewport" content="width=device-width, initial-scale=1(?:\.0)?"/,'name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"');
 fs.writeFileSync(file,html.split('\n').map(line=>line.trimEnd()).join('\n'));
}
