/**
 * Run local regression examples (purchase date, bike lifecycle, early settlement).
 * Usage: npx tsx scripts/run-regression-examples.ts
 */
import { verifyRegressionExamples } from '../src/lib/local-db/regressionExamples';

const results = verifyRegressionExamples();
const failed = results.filter((r) => !r.pass);

for (const row of results) {
  const mark = row.pass ? 'PASS' : 'FAIL';
  console.log(`${mark}  ${row.name}`);
  if (!row.pass) {
    console.log('      expected:', row.expected);
    console.log('      actual:  ', row.actual);
  }
}

console.log('');
console.log(`${results.length - failed.length}/${results.length} passed`);

if (failed.length > 0) {
  process.exit(1);
}
