/**
 * Tests for student-portal/js/utils/password-generator.js
 * Password generation and validation utility
 */

// Load the source file
const {
    generatePassword,
    getRandomWord,
    validatePassword,
    passwordsMatch,
    WORD_LIST
} = require('../../../student-portal/js/utils/password-generator.js');

describe('password-generator', () => {
    describe('generatePassword', () => {
        it('should generate password in WordWord1234 format', () => {
            const password = generatePassword();
            
            // Should match pattern: CapitalWord + CapitalWord + 4 digits
            expect(password).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+\d{4}$/);
        });

        it('should generate password with minimum length', () => {
            const password = generatePassword();
            
            // Two words (min 4 chars each) + 4 digits = at least 12 chars
            expect(password.length).toBeGreaterThanOrEqual(12);
        });

        it('should generate 4-digit number between 1000-9999', () => {
            const password = generatePassword();
            const numberPart = password.match(/\d{4}$/)[0];
            const number = parseInt(numberPart);
            
            expect(number).toBeGreaterThanOrEqual(1000);
            expect(number).toBeLessThanOrEqual(9999);
        });

        it('should generate different passwords on each call', () => {
            const passwords = new Set();
            
            // Generate 100 passwords - should mostly be unique
            for (let i = 0; i < 100; i++) {
                passwords.add(generatePassword());
            }
            
            // At least 95% should be unique
            expect(passwords.size).toBeGreaterThan(95);
        });

        it('should start with capital letter', () => {
            const password = generatePassword();
            expect(password[0]).toMatch(/[A-Z]/);
        });

        it('should contain at least two capital letters', () => {
            const password = generatePassword();
            const capitals = password.match(/[A-Z]/g);
            
            expect(capitals).not.toBeNull();
            expect(capitals.length).toBeGreaterThanOrEqual(2);
        });

        it('should contain lowercase letters', () => {
            const password = generatePassword();
            expect(password).toMatch(/[a-z]/);
        });

        it('should end with exactly 4 digits', () => {
            const password = generatePassword();
            const digits = password.match(/\d+$/)[0];
            
            expect(digits.length).toBe(4);
        });

        it('should not contain spaces or special characters', () => {
            const password = generatePassword();
            expect(password).not.toMatch(/[\s!@#$%^&*(),.?":{}|<>]/);
        });

        it('should generate valid passwords according to validatePassword', () => {
            for (let i = 0; i < 10; i++) {
                const password = generatePassword();
                const result = validatePassword(password);
                
                expect(result.isValid).toBe(true);
            }
        });
    });

    describe('getRandomWord', () => {
        it('should return a word from the word list', () => {
            const word = getRandomWord();
            expect(WORD_LIST).toContain(word);
        });

        it('should return capitalized word', () => {
            const word = getRandomWord();
            expect(word[0]).toMatch(/[A-Z]/);
        });

        it('should return different words over multiple calls', () => {
            const words = new Set();
            
            // Get 50 words
            for (let i = 0; i < 50; i++) {
                words.add(getRandomWord());
            }
            
            // Should have at least 10 different words (reasonable randomness)
            expect(words.size).toBeGreaterThan(10);
        });

        it('should only return strings', () => {
            for (let i = 0; i < 10; i++) {
                const word = getRandomWord();
                expect(typeof word).toBe('string');
            }
        });

        it('should return words with length > 0', () => {
            const word = getRandomWord();
            expect(word.length).toBeGreaterThan(0);
        });
    });

    describe('validatePassword', () => {
        describe('length validation', () => {
            it('should reject empty password', () => {
                const result = validatePassword('');
                
                expect(result.isValid).toBe(false);
                expect(result.message).toBe('Password must be at least 8 characters long');
            });

            it('should reject null password', () => {
                const result = validatePassword(null);
                
                expect(result.isValid).toBe(false);
                expect(result.message).toContain('8 characters');
            });

            it('should reject undefined password', () => {
                const result = validatePassword(undefined);
                
                expect(result.isValid).toBe(false);
                expect(result.message).toContain('8 characters');
            });

            it('should reject password with less than 8 characters', () => {
                const result = validatePassword('Pass1');
                
                expect(result.isValid).toBe(false);
                expect(result.message).toContain('8 characters');
            });

            it('should accept password with exactly 8 characters', () => {
                const result = validatePassword('PassWord');
                
                expect(result.isValid).toBe(true);
            });

            it('should accept password with more than 8 characters', () => {
                const result = validatePassword('LongPassword123');
                
                expect(result.isValid).toBe(true);
            });
        });

        describe('character requirements', () => {
            it('should reject password with only lowercase', () => {
                const result = validatePassword('alllowercase');
                
                expect(result.isValid).toBe(false);
                expect(result.message).toContain('uppercase and lowercase');
            });

            it('should reject password with only uppercase', () => {
                const result = validatePassword('ALLUPPERCASE');
                
                expect(result.isValid).toBe(false);
                expect(result.message).toContain('uppercase and lowercase');
            });

            it('should accept password with both upper and lowercase', () => {
                const result = validatePassword('PasswordGood');
                
                expect(result.isValid).toBe(true);
                expect(result.message).toBe('Password is valid');
            });

            it('should accept password with numbers', () => {
                const result = validatePassword('Password123');
                
                expect(result.isValid).toBe(true);
            });

            it('should accept password with special characters', () => {
                const result = validatePassword('Pass@Word!');
                
                expect(result.isValid).toBe(true);
            });

            it('should accept password with spaces', () => {
                const result = validatePassword('Pass Word');
                
                expect(result.isValid).toBe(true);
            });
        });

        describe('edge cases', () => {
            it('should accept very long password', () => {
                const longPassword = 'A' + 'a'.repeat(100);
                const result = validatePassword(longPassword);
                
                expect(result.isValid).toBe(true);
            });

            it('should accept password with unicode characters', () => {
                const result = validatePassword('Pässwörd');
                
                expect(result.isValid).toBe(true);
            });

            it('should accept password with mixed case at any position', () => {
                const result = validatePassword('aAaAaAaA');
                
                expect(result.isValid).toBe(true);
            });

            it('should handle whitespace-only password correctly', () => {
                const result = validatePassword('        ');
                
                expect(result.isValid).toBe(false);
            });
        });

        describe('generated passwords', () => {
            it('should validate all generated passwords as valid', () => {
                // Test multiple generated passwords
                for (let i = 0; i < 20; i++) {
                    const password = generatePassword();
                    const result = validatePassword(password);
                    
                    expect(result.isValid).toBe(true);
                    expect(result.message).toBe('Password is valid');
                }
            });
        });
    });

    describe('passwordsMatch', () => {
        it('should return true for identical passwords', () => {
            const result = passwordsMatch('Password123', 'Password123');
            expect(result).toBe(true);
        });

        it('should return false for different passwords', () => {
            const result = passwordsMatch('Password123', 'Password456');
            expect(result).toBe(false);
        });

        it('should be case-sensitive', () => {
            const result = passwordsMatch('Password', 'password');
            expect(result).toBe(false);
        });

        it('should return true for empty strings', () => {
            const result = passwordsMatch('', '');
            expect(result).toBe(true);
        });

        it('should return false for null vs string', () => {
            const result = passwordsMatch(null, 'Password');
            expect(result).toBe(false);
        });

        it('should return false for undefined vs string', () => {
            const result = passwordsMatch(undefined, 'Password');
            expect(result).toBe(false);
        });

        it('should return true for null vs null', () => {
            const result = passwordsMatch(null, null);
            expect(result).toBe(true);
        });

        it('should handle whitespace differences', () => {
            const result = passwordsMatch('Password ', 'Password');
            expect(result).toBe(false);
        });

        it('should handle special characters', () => {
            const result = passwordsMatch('P@ssw0rd!', 'P@ssw0rd!');
            expect(result).toBe(true);
        });

        it('should work with very long passwords', () => {
            const longPass = 'A'.repeat(1000);
            const result = passwordsMatch(longPass, longPass);
            expect(result).toBe(true);
        });

        it('should detect subtle differences', () => {
            const result = passwordsMatch('Password123', 'Password124');
            expect(result).toBe(false);
        });
    });

    describe('integration - full workflow', () => {
        it('should generate, validate, and confirm matching passwords', () => {
            // Generate password
            const password = generatePassword();
            
            // Validate it
            const validation = validatePassword(password);
            expect(validation.isValid).toBe(true);
            
            // Check it matches itself
            const matches = passwordsMatch(password, password);
            expect(matches).toBe(true);
        });

        it('should detect non-matching passwords', () => {
            const password1 = generatePassword();
            const password2 = generatePassword();
            
            // Both should be valid
            expect(validatePassword(password1).isValid).toBe(true);
            expect(validatePassword(password2).isValid).toBe(true);
            
            // But should not match (extremely unlikely)
            const matches = passwordsMatch(password1, password2);
            expect(matches).toBe(false);
        });

        it('should handle user entering custom password', () => {
            const customPassword = 'MyCustomPass123';
            
            // Validate
            const validation = validatePassword(customPassword);
            expect(validation.isValid).toBe(true);
            
            // Simulate confirm password
            const confirmPassword = 'MyCustomPass123';
            const matches = passwordsMatch(customPassword, confirmPassword);
            expect(matches).toBe(true);
        });

        it('should handle password confirmation mismatch', () => {
            const password = 'Password123';
            const confirmPassword = 'Password124';
            
            // Both valid individually
            expect(validatePassword(password).isValid).toBe(true);
            expect(validatePassword(confirmPassword).isValid).toBe(true);
            
            // But don't match
            const matches = passwordsMatch(password, confirmPassword);
            expect(matches).toBe(false);
        });
    });
});
