const summarizer = require('./summarizer');

describe('SummarizerService.extractFields', () => {
  it('returns all fields when none are selected', () => {
    const data = { a: 1, b: 2 };
    expect(summarizer.extractFields(data)).toEqual(data);
  });

  it('returns only the selected fields that exist', () => {
    const data = { a: 1, b: 2, c: 3 };
    expect(summarizer.extractFields(data, ['a', 'c', 'missing'])).toEqual({ a: 1, c: 3 });
  });
});

describe('SummarizerService.buildPrompt', () => {
  it('uses the default prompt when no custom prompt is given', () => {
    const prompt = summarizer.buildPrompt({ name: 'Ada' });
    expect(prompt).toMatch(/concise and clear summary/);
    expect(prompt).toContain('name: Ada');
  });

  it('uses a custom prompt when provided', () => {
    const prompt = summarizer.buildPrompt({ name: 'Ada' }, 'Summarize in one word:');
    expect(prompt).toMatch(/^Summarize in one word:/);
  });
});
