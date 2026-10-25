import fs from 'node:fs/promises';
import { areas, accept, generation } from '../results.js';
const path = new URL('../data/snapshot.json', import.meta.url);
const old = JSON.parse(await fs.readFile(path,'utf8'));
const results = {...old.results}, errors = {}, checkedAt = new Date().toISOString();
const receivedAt = {...old.receivedAt}, changedAt = {...old.changedAt};
const queue = [...areas];
let successful = 0;
async function runner() {
  while (queue.length) {
    const area = queue.shift();
    try {
      const url = `https://resultados.tse.jus.br/oficial/ele2026/6258/dados/${area}/${area}-c0001-e006258-u.json`;
      const response = await fetch(url,{headers:{Accept:'application/json','Cache-Control':'no-cache'},signal:AbortSignal.timeout(15000)});
      if (!response.ok) throw Error(`TSE HTTP ${response.status}`);
      const incoming = accept(results[area], await response.json(), area);
      if (!results[area] || incoming.idg !== results[area].idg || generation(incoming) !== generation(results[area])) changedAt[area] = checkedAt;
      changedAt[area] ??= checkedAt;
      results[area] = incoming;
      receivedAt[area] = checkedAt;
      successful++;
    } catch (error) { errors[area] = error.message; }
  }
}
await Promise.all(Array.from({length:4}, runner));
if (!successful) throw Error('All TSE requests failed; preserving the published snapshot');
await fs.writeFile(path,JSON.stringify({results,checkedAt,receivedAt,changedAt,errors},null,2)+'\n');
console.log(`Updated ${successful}/${areas.length} geographies at ${checkedAt}.`);
for (const [area,error] of Object.entries(errors)) console.warn(`${area}: ${error}`);
