import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../assets/dashboard.css',import.meta.url),'utf8');
test('mobile navigation wraps instead of overflowing',()=>assert.match(css,/header\.top nav\{flex-wrap:wrap;overflow-x:visible\}/));
test('wide tables scroll within constrained wrappers',()=>assert.match(css,/\.scroll,\.dashboard-table-wrap\{width:100%;max-width:100%;min-width:0;overflow-x:auto/));
test('mobile columns can shrink below their content width',()=>assert.match(css,/\.cards,\.compact-cards\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/));
test('mobile form controls remain inside their container',()=>assert.match(css,/\.filters select,\.filters input\{width:100%;max-width:100%;min-width:0\}/));
