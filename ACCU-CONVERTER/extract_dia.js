const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ─── CONFIG ─────────────────────────────────────────────────
// config.json-ból olvas, a script mappájából
const scriptDir = __dirname;
const configPath = path.join(scriptDir, 'config.json');

let config;
try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
} catch (err) {
  console.error(`❌ config.json nem található vagy nem érvényes JSON: ${configPath}`);
  console.error('   Hozz létre egy config.json-t a script mappájában!');
  process.exit(1);
}

const window_min = config.window_minutes ?? 10;
const tolerance  = config.gl_tolerance   ?? 0.5;

// ─── AUTO FILE DISCOVERY ────────────────────────────────────
// A script mappájából automatikusan felolvas minden .dia fájlt
const files = fs.readdirSync(scriptDir)
  .filter(f => f.toLowerCase().endsWith('.dia'))
  .map(f => path.join(scriptDir, f));

if (files.length === 0) {
  console.error(`❌ Nincs .dia fájl a mappában: ${scriptDir}`);
  process.exit(1);
}

// ─── XML PARSING (regex alapú, nincs external dep) ──────────
function parseDiaFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const regex   = /<BG\s+Dt="([^"]+)"\s+Tm="([^"]+)"\s+Gl="([^"]+)"/g;
  const results = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    results.push({
      date: match[1],
      time: match[2],
      gl:   parseFloat(match[3]),
      source: path.basename(filePath)
    });
  }
  return results;
}

// ─── IDŐBÉLYEG → milliszekundumba ──────────────────────────
function toMs(dateStr, timeStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, min]  = timeStr.split(':').map(Number);
  return new Date(y, m - 1, d, h, min, 0).getTime();
}

// ─── IDŐKÜLÖNBSÉG PERCBEN ───────────────────────────────────
function diffMinutes(a, b) {
  return Math.abs(toMs(a.date, a.time) - toMs(b.date, b.time)) / 60000;
}

// ─── INTERAKTÍV KÉRDÉS ──────────────────────────────────────
function ask(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// ─── KOLLÍZIÓ DETEKTÁLÁS + INTERAKTÍV MEGOLDÁS ─────────────
async function resolveDuplicates(sorted, windowMin, tol) {
  const rl = readline.createInterface({
    input:  process.stdin,
    output: process.stdout
  });

  const result = [];
  let i = 0;

  while (i < sorted.length) {
    if (i + 1 < sorted.length && diffMinutes(sorted[i], sorted[i + 1]) < windowMin) {
      const a = sorted[i];
      const b = sorted[i + 1];
      const glDiff = Math.abs(a.gl - b.gl);

      if (glDiff <= tol) {
        // Tolerancia belül → mindkettő marad automatikusan
        console.log(`\n  ✓ Auto: mindkettőt megtartva (Gl diff=${glDiff.toFixed(1)}, tol=${tol})`);
        console.log(`    [1] ${a.date} ${a.time} Gl=${a.gl}  (${a.source})`);
        console.log(`    [2] ${b.date} ${b.time} Gl=${b.gl}  (${b.source})`);
        result.push(a);
        result.push(b);
        i += 2;
      } else {
        // Tolerancia kívül → kérdez
        console.log(`\n  ⚠ Kollízió (${diffMinutes(a, b).toFixed(1)} perc, Gl diff=${glDiff.toFixed(1)}):`);
        console.log(`    [1] ELSŐ    → ${a.date} ${a.time} Gl=${a.gl}  (${a.source})`);
        console.log(`    [2] MÁSODIK → ${b.date} ${b.time} Gl=${b.gl}  (${b.source})`);
        console.log(`    [3] MIND    → mindkettőt megtartja`);

        let choice = '';
        while (!['1', '2', '3'].includes(choice)) {
          choice = await ask(rl, '  Választás (1/2/3): ');
        }

        if (choice === '1')      { result.push(a); }
        else if (choice === '2') { result.push(b); }
        else                     { result.push(a); result.push(b); }
        i += 2;
      }
    } else {
      result.push(sorted[i]);
      i++;
    }
  }

  rl.close();
  return result;
}

// ─── KIMENET ÍRÁSA ──────────────────────────────────────────
function writeOutput(records) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp =
    `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}` +
    `_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  const outFile = path.join(scriptDir, `out_${timestamp}.txt`);

  const lines = ['Date|Time|Gl'];
  for (const r of records) {
    const date = r.date.replace(/-/g, '.');
    lines.push(`${date}|${r.time}|${r.gl % 1 === 0 ? r.gl.toFixed(1) : r.gl}`);
  }

  fs.writeFileSync(outFile, lines.join('\n') + '\n', 'utf-8');
  console.log(`\n✅ Kimenet: ${outFile} (${records.length} mérés)`);
}

// ─── MAIN ───────────────────────────────────────────────────
async function main() {
  console.log(`\n📋 Paraméterek: window=${window_min} perc, tolerance=${tolerance} Gl`);
  console.log(`📁 Fájlok: ${files.join(', ')}\n`);

  let all = [];
  for (const f of files) {
    const records = parseDiaFile(f);
    console.log(`  📄 ${path.basename(f)}: ${records.length} mérés`);
    all = all.concat(records);
  }

  // Időrendbe rendezés
  all.sort((a, b) => toMs(a.date, a.time) - toMs(b.date, b.time));
  console.log(`  📊 Összesen: ${all.length} mérés (rendezés után)`);

  // Kollízió-kezelés
  const resolved = await resolveDuplicates(all, window_min, tolerance);

  // Kimenet
  writeOutput(resolved);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
