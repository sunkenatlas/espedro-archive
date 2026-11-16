const normalize = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase().trim();

export function filterEntities(entities, state = {}) {
  const terms = normalize(state.q).split(/\s+/).filter(Boolean);
  return entities.filter(entity => {
    if (state.family && entity.family !== state.family) return false;
    if (state.tag && !entity.tags.includes(state.tag)) return false;
    if (!terms.length) return true;
    const corpus = normalize([
      entity.id, entity.name, entity.english, entity.family, entity.kind,
      entity.disposition, entity.intelligence, entity.summary, entity.quote,
      ...(entity.tags || []), ...(entity.locations || []),
      ...(entity.appearance || []), ...(entity.behavior || []), ...(entity.response || []),
      ...(entity.rules || []).map(rule => `${rule.title} ${rule.ref} ${rule.text}`),
      ...(entity.notes || []).map(note => `${note.title} ${note.text}`),
    ].join(' '));
    return terms.every(term => corpus.includes(term));
  });
}

export function stateFromSearch(search) {
  const params = new URLSearchParams(search);
  return { q:params.get('q') || '', family:params.get('family') || '', tag:params.get('tag') || '', view:params.get('view') === 'index' ? 'index' : 'gallery' };
}

export function searchFromState(state) {
  const params = new URLSearchParams();
  for (const key of ['q','family','tag']) if (state[key]) params.set(key, state[key]);
  if (state.view === 'index') params.set('view','index');
  return params.size ? `?${params}` : '';
}
