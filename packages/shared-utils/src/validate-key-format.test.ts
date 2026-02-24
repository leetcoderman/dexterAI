// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { detectProviderFromKey, isKeyFormatValid } from './validate-key-format';

describe('Key Format Validator', () => {

    describe('detectProviderFromKey', () => {
        it('should return nvidia_nim for nvapi- prefixes', () => {
            expect(detectProviderFromKey('nvapi-12345')).toBe('nvidia_nim');
        });

        it('should return openai for sk- prefixes', () => {
            expect(detectProviderFromKey('sk-12345')).toBe('openai');
            expect(detectProviderFromKey('sk-proj-12345')).toBe('openai'); // Common expanded prefix
        });

        it('should return anthropic for sk-ant- prefixes', () => {
            expect(detectProviderFromKey('sk-ant-12345')).toBe('anthropic');
            expect(detectProviderFromKey('sk-ant-api03-12345')).toBe('anthropic');
        });

        it('should select anthropic over openai for sk-ant- keys', () => {
            // Because sk-ant- starts with sk-, the order of parsing matters or specific matches matter.
            // Our map has sk-ant- and then sk-. Since sk-ant- is checked first, it should catch it.
            expect(detectProviderFromKey('sk-ant-12345')).toBe('anthropic');
        });

        it('should return null for unknown prefixes', () => {
            expect(detectProviderFromKey('xyz-123')).toBeNull();
            expect(detectProviderFromKey('12345')).toBeNull();
        });
    });

    describe('isKeyFormatValid', () => {
        it('should return true if prefix matches the requested provider', () => {
            expect(isKeyFormatValid('nvapi-123', 'nvidia_nim')).toBe(true);
            expect(isKeyFormatValid('sk-123', 'openai')).toBe(true);
            expect(isKeyFormatValid('sk-ant-123', 'anthropic')).toBe(true);
        });

        it('should return false if prefix matches a DIFFERENT provider', () => {
            expect(isKeyFormatValid('nvapi-123', 'openai')).toBe(false);
            expect(isKeyFormatValid('sk-123', 'anthropic')).toBe(false);
        });

        it('should return true if prefix cannot be detected (fail open)', () => {
            expect(isKeyFormatValid('unknown-123', 'deepgram')).toBe(true);
            expect(isKeyFormatValid('gcp-key-123', 'google')).toBe(true);
        });
    });

});
