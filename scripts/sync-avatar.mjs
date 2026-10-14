/**
 * Copia a lib de avatar da web para o app.
 *
 *   npm run avatar:sync    copia
 *   npm run avatar:check   só compara; sai com erro se as duas divergirem
 *
 * O avatar é desenhado pelo mesmo código nos dois lados: `src/lib/avatar/` é
 * cópia fiel de `resources/js/lib/avatar/` do projeto web (memorize). Nada se
 * edita aqui — mexa lá e rode este script.
 *
 * A origem padrão é o projeto web ao lado deste, em `../code/memorize`. Noutra
 * máquina, aponte a variável AVATAR_LIB para a pasta `resources/js/lib/avatar`.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = process.env.AVATAR_LIB ?? join(root, '..', 'code', 'memorize', 'resources', 'js', 'lib', 'avatar');
const target = join(root, 'src', 'lib', 'avatar');
const checkOnly = process.argv.includes('--check');

if (!existsSync(join(source, 'index.ts'))) {
  console.error(`Lib de avatar não encontrada em ${source}.`);
  console.error('Aponte AVATAR_LIB para a pasta resources/js/lib/avatar do projeto web.');
  process.exit(1);
}

/** Caminhos relativos de todos os `.ts` de uma pasta, recursivamente. */
function list(dir) {
  if (!existsSync(dir)) return [];

  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);

    if (statSync(path).isDirectory()) return list(path).map((p) => join(name, p));
    return name.endsWith('.ts') ? [name] : [];
  });
}

/** Conteúdo sem diferença de fim de linha: o git pode trocar LF por CRLF no checkout. */
const read = (path) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

const wanted = list(source);
const present = new Set(list(target));
const missing = wanted.filter((file) => !present.has(file));
const different = wanted.filter((file) => present.has(file) && read(join(source, file)) !== read(join(target, file)));
const changed = [...missing, ...different];
const stale = [...present].filter((file) => !wanted.includes(file));

if (checkOnly) {
  if (!changed.length && !stale.length) {
    console.log(`src/lib/avatar está igual à lib da web (${wanted.length} arquivos).`);
    process.exit(0);
  }

  for (const file of missing) console.error(`faltando:  ${file}`);
  for (const file of different) console.error(`diferente: ${file}`);
  for (const file of stale) console.error(`sobrando:  ${file}`);
  console.error('Rode npm run avatar:sync.');
  process.exit(1);
}

for (const file of changed) {
  mkdirSync(dirname(join(target, file)), { recursive: true });
  writeFileSync(join(target, file), readFileSync(join(source, file)));
}

for (const file of stale) rmSync(join(target, file));

console.log(`Origem: ${relative(root, source) || source}`);
console.log(`${changed.length} copiado(s), ${stale.length} removido(s), ${wanted.length - changed.length} já iguais.`);
