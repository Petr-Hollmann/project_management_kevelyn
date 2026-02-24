// normalize-phones.mjs
// Normalizuje telefonní čísla v tabulce worker na formát +420 XXX XXX XXX
// Spusť: node normalize-phones.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envFile = readFileSync('.env.local', 'utf8');
envFile.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * Normalizuje telefonní číslo:
 * "420604102624"  → "+420 604 102 624"
 * "776879971"     → "+420 776 879 971"
 * "+420 602 324 020" → "+420 602 324 020"  (beze změny)
 * "+34 622 07 14 97" → "+34 622 07 14 97" (jiná předvolba – beze změny)
 */
function normalizePhone(raw) {
  if (!raw || raw === '-') return raw;

  // Odstraň všechny mezery a pomlčky
  let digits = raw.replace(/[\s\-()]/g, '');

  // Začíná + → extrahuj jen čísla za +
  let countryPrefix = '';
  if (digits.startsWith('+')) {
    digits = digits.slice(1);
    // Czech (+420) nebo jiná předvolba
    if (digits.startsWith('420') && digits.length === 12) {
      countryPrefix = '+420';
      digits = digits.slice(3); // zbývá 9 číslic
    } else {
      // Jiná předvolba (Španělsko, atd.) – vrátit beze změny
      return raw.replace(/\s+/g, ' ').trim();
    }
  } else if (digits.startsWith('420') && digits.length === 12) {
    // 420XXXXXXXXX bez + → přidej +
    countryPrefix = '+420';
    digits = digits.slice(3);
  } else if (digits.length === 9 && /^\d{9}$/.test(digits)) {
    // 9 číslic bez předvolby → česká čísla
    countryPrefix = '+420';
  } else {
    // Neznámý formát – vrátit beze změny
    return raw;
  }

  // Formátuj jako XXX XXX XXX
  const fmt = digits.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
  return `${countryPrefix} ${fmt}`;
}

async function run() {
  const { data: workers, error } = await supabase
    .from('worker')
    .select('id, first_name, last_name, phone')
    .not('phone', 'is', null);

  if (error) {
    console.error('❌ Chyba při načítání:', error.message);
    return;
  }

  console.log(`📋 Načteno ${workers.length} montážníků s telefonem\n`);

  let updated = 0, unchanged = 0, skipped = 0;

  for (const w of workers) {
    const normalized = normalizePhone(w.phone);

    if (normalized === w.phone) {
      unchanged++;
      continue;
    }

    if (!normalized) {
      skipped++;
      continue;
    }

    console.log(`${w.first_name} ${w.last_name}: "${w.phone}" → "${normalized}"`);

    const { error: updateError } = await supabase
      .from('worker')
      .update({ phone: normalized })
      .eq('id', w.id);

    if (updateError) {
      console.error(`  ❌ Chyba: ${updateError.message}`);
      skipped++;
    } else {
      updated++;
    }
  }

  console.log('\n══════════════════════════════');
  console.log(`✅ Upraveno:    ${updated}`);
  console.log(`⏭️  Beze změny:  ${unchanged}`);
  console.log(`⚠️  Přeskočeno: ${skipped}`);
  console.log('══════════════════════════════');
}

run();
