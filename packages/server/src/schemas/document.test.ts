import { describe, expect, it } from 'vitest';

import { createDocumentSchema, updateDocumentSchema } from './document.js';

describe('createDocumentSchema', () => {
  it('accepts valid title', () => {
    const result = createDocumentSchema.safeParse({ title: 'My Document' });
    expect(result.success).toBe(true);
  });

  it('accepts empty object (title is optional)', () => {
    const result = createDocumentSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects empty string title', () => {
    const result = createDocumentSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects title exceeding 255 characters', () => {
    const result = createDocumentSchema.safeParse({
      title: 'a'.repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it('accepts title at exactly 255 characters', () => {
    const result = createDocumentSchema.safeParse({
      title: 'a'.repeat(255),
    });
    expect(result.success).toBe(true);
  });
});

describe('updateDocumentSchema', () => {
  it('accepts title update', () => {
    const result = updateDocumentSchema.safeParse({ title: 'New Title' });
    expect(result.success).toBe(true);
  });

  it('accepts content update', () => {
    const result = updateDocumentSchema.safeParse({
      content: 'Some content here',
    });
    expect(result.success).toBe(true);
  });

  it('accepts both title and content', () => {
    const result = updateDocumentSchema.safeParse({
      title: 'Title',
      content: 'Content',
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty object (all fields optional)', () => {
    const result = updateDocumentSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects empty string title', () => {
    const result = updateDocumentSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });
});
