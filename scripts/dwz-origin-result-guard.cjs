'use strict';
/** Validate diagnostic evidence, not merely the absence of FAIL markers.
 *  The caller must collect rows from the real test DOM, not manufacture them.
 */
function validateDiagnosticRows(rows, required) {
  if (!Array.isArray(rows) || !Array.isArray(required) || required.length === 0)
    throw Error('Diagnostic evidence or required labels missing');
  const errors = [];
  for (const row of rows) {
    if (!row || typeof row.label !== 'string' || typeof row.status !== 'string') {
      errors.push('Malformed diagnostic result row');
      continue;
    }
    if (row.status === 'FAIL') errors.push('Unexpected FAIL: ' + row.label);
  }
  for (const label of required) {
    const matching = rows.filter(row => row && row.label === label);
    if (matching.length !== 1) {
      errors.push('Expected exactly one result for ' + label + ', found ' + matching.length);
    } else if (matching[0].status !== 'PASS') {
      errors.push(label + ' is ' + matching[0].status + ', expected PASS');
    }
  }
  if (errors.length) throw Error(errors.join('; '));
  return true;
}
module.exports = {validateDiagnosticRows};
