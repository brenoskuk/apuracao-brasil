export const areas = ['br','ac','al','ap','am','ba','ce','df','es','go','ma','mt','ms','mg','pa','pb','pr','pe','pi','rj','rn','rs','ro','rr','sc','sp','se','to','zz'];
export function generation(j) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(j?.dg ?? '') || !/^\d{2}:\d{2}:\d{2}$/.test(j?.hg ?? '')) throw Error('Invalid generation timestamp');
  const [d,m,y] = j.dg.split('/');
  return `${y}-${m}-${d}T${j.hg}`;
}
export function validate(j, area) {
  if (j?.ele !== '6258' || j.t !== '2' || j.f !== 'o' || j.cdabr?.toLowerCase() !== area) throw Error('Unexpected election, round, phase or geography');
  generation(j);
  const candidates = (j.carg ?? []).filter(c => c.cd === '1').flatMap(c => (c.agr ?? []).flatMap(a => (a.par ?? []).flatMap(p => p.cand ?? [])));
  const a = candidates.find(c => c.n === '13'), b = candidates.find(c => c.n === '22');
  if (!a || !b || a.dvt !== 'Válido' || b.dvt !== 'Válido') throw Error('Missing finalists or changed vote status; manual review required');
  const fields = [a.vap,b.vap,j.e?.est,j.e?.esnt,j.e?.te,j.v?.vv,j.s?.st,j.s?.ts];
  if (!fields.every(v => /^\d+$/.test(String(v)) && Number.isSafeInteger(Number(v)))) throw Error('Invalid numeric count');
  if (+a.vap + +b.vap !== +j.v.vv || +j.e.est + +j.e.esnt !== +j.e.te || +j.s.st > +j.s.ts || +j.v.vv > +j.e.est) throw Error('Inconsistent election totals');
  return j;
}
export function accept(current, incoming, area) {
  validate(incoming, area);
  if (current && generation(incoming) < generation(current)) throw Error('Older source generation rejected');
  if (current && generation(incoming) === generation(current) && incoming.idg === current.idg && JSON.stringify(incoming) !== JSON.stringify(current)) throw Error('Same source generation has conflicting content');
  return incoming;
}
