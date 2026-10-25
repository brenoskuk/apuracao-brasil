import fs from 'node:fs/promises';
const root = new URL('../',import.meta.url), out = new URL('_site/',root);
await fs.mkdir(new URL('data/',out),{recursive:true});
for (const name of ['index.html','app.js','results.js','.nojekyll']) await fs.copyFile(new URL(name,root),new URL(name,out));
for (const name of ['shapes.json','baseline.json','snapshot.json']) await fs.copyFile(new URL('data/'+name,root),new URL('data/'+name,out));
console.log('Built static site in _site/');
