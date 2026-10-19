// Validates every UIKitML panel against the Horizon kit parser that IWSDK
// bundles, so markup errors fail in CI instead of silently in the headset.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse, resolveKitComponentSets } from '@drawcall/uikitml';

const directory = path.resolve('public/ui');
const componentSets = resolveKitComponentSets('horizon');
let failures = 0;
for (const file of (await readdir(directory)).filter((name) => name.endsWith('.uikitml')).sort()) {
  const source = await readFile(path.join(directory, file), 'utf8');
  const result = parse(source, { componentSets });
  if (result.success) {
    console.log(`ok   ${file}`);
    continue;
  }
  failures++;
  console.log(`FAIL ${file}`);
  for (const error of result.errors) {
    const where = error.range ? ` (line ${error.range.start.line}, column ${error.range.start.column})` : '';
    console.log(`  ${error.code}: ${error.message}${where}`);
  }
}
process.exit(failures === 0 ? 0 : 1);
