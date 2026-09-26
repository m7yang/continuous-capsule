import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { appleCapsuleCommands } from '../src/native-capsule.js';

if (!process.argv[2]) throw new Error('Pass a capture output directory');
const directory = resolve(process.argv[2]);
const cases = JSON.parse(readFileSync(new URL('../tests/fixtures/capsule-fit-cases.json', import.meta.url), 'utf8'));
mkdirSync(directory, { recursive: true });
writeFileSync(resolve(directory, 'capsule-fit-cases.json'), JSON.stringify(cases.map(sample => ({
  ...sample, fitted: appleCapsuleCommands(sample.width, sample.height),
}))));
