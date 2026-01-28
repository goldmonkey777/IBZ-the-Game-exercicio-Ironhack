// Jasmine tests for formatFullName
// Para rodar: inclua Jasmine no projeto ou use em ambiente Node com jasmine instalado

if (typeof require !== 'undefined') {
  var formatFullName = require('./formatFullName');
}

describe('formatFullName', function() {
  it('returns formatted full name when receiving both arguments', function() {
    expect(formatFullName('john', 'doe')).toBe('Doe, John');
    expect(formatFullName('John', 'doe')).toBe('Doe, John');
    expect(formatFullName('JOHN', 'DOE')).toBe('Doe, John');
  });

  it('removes whitespaces from names', function() {
    expect(formatFullName(' john ', 'doe')).toBe('Doe, John');
    expect(formatFullName('  john  ', ' DOE ')).toBe('Doe, John');
  });

  it('formats properly with only first or last name', function() {
    expect(formatFullName('john')).toBe('John');
    expect(formatFullName('', 'DOE')).toBe('Doe');
    expect(formatFullName(undefined, 'DOE')).toBe('Doe');
  });

  it('returns null if no names are given', function() {
    expect(formatFullName()).toBeNull();
    expect(formatFullName('', '')).toBeNull();
  });
});
