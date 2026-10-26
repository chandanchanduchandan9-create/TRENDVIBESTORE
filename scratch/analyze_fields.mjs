import fs from 'fs';
const d = JSON.parse(fs.readFileSync('data/products.json', 'utf8'));
const cats = {};
d.forEach(p => {
  const c = p.category;
  if (!cats[c]) cats[c] = { count: 0, fields: new Set(), specFields: new Set(), sample: null };
  cats[c].count++;
  Object.keys(p).forEach(k => cats[c].fields.add(k));
  if (p.specs) Object.keys(p.specs).forEach(k => cats[c].specFields.add(k));
  if (!cats[c].sample) cats[c].sample = p.id;
});
Object.entries(cats).forEach(([c, v]) => {
  console.log(`=== ${c} (${v.count} products) ===`);
  console.log('Fields:', [...v.fields].join(', '));
  console.log('Specs:', [...v.specFields].join(', '));
  console.log('Sample:', v.sample);
  console.log();
});
