// Stable codes only; never serialize arbitrary upstream exception messages.
const codes={
 'Expected two box-score teams':'team-count',
 'Invalid or duplicate box-score team':'team-identity',
 'Invalid or duplicate player':'player-identity',
 'Missing statistics array':'statistics-missing',
 'Duplicate statistic':'statistic-duplicate',
 'Missing or invalid raw counter':'counter-invalid',
 'Rebounds do not reconcile':'rebounds-mismatch',
 'Invalid shooting counters':'shooting-invalid',
 'Points do not reconcile':'points-mismatch',
 'Box-score points do not reconcile with final score':'final-score-mismatch'
};
export const SOURCE_ERROR_CODES=new Set([...Object.values(codes),'malformed-structure','official-reference-mismatch','official-reference-unverifiable','official-participation-conflict','official-participation-review']);
export const sourceErrorCode=message=>codes[message]||'malformed-structure';
