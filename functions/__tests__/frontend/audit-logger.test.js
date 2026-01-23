/**
 * Tests for student-portal/js/audit-logger.js
 * Audit logging for student profile changes
 */

// Load the source file
const { getNZDate, generateAuditLog, appendAuditLog } = require('../../../student-portal/js/audit-logger.js');

describe('audit-logger', () => {
    describe('getNZDate', () => {
        it('should return date in DD/MM/YYYY format', () => {
            const result = getNZDate();
            // Should match DD/MM/YYYY pattern
            expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
        });

        it('should pad single digit days and months with zero', () => {
            // Mock a date to test padding
            jest.useFakeTimers();
            // March 5, 2025 (single digit month and day)
            jest.setSystemTime(new Date('2025-03-05T12:00:00'));

            const result = getNZDate();
            // Should have leading zeros
            expect(result).toMatch(/^0\d\/0\d\/\d{4}$/);

            jest.useRealTimers();
        });

        it('should return current date', () => {
            jest.useFakeTimers();
            // January 24, 2026
            jest.setSystemTime(new Date('2026-01-24T12:00:00'));

            const result = getNZDate();
            expect(result).toBe('24/01/2026');

            jest.useRealTimers();
        });

        it('should handle timezone conversion for NZ', () => {
            // Even if system is in different timezone, should return NZ date
            const result = getNZDate();
            // Should be a valid date string
            expect(result).toBeTruthy();
            expect(result.split('/').length).toBe(3);
        });
    });

    describe('generateAuditLog', () => {
        let mockDate;

        beforeEach(() => {
            jest.useFakeTimers();
            mockDate = new Date('2026-01-24T12:00:00');
            jest.setSystemTime(mockDate);
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        describe('string field changes', () => {
            it('should log first name change', () => {
                const oldData = { firstName: 'John' };
                const newData = { firstName: 'Jane' };

                const result = generateAuditLog(oldData, newData);

                expect(result).toHaveLength(1);
                expect(result[0]).toBe('[24/01/2026]: Student updated first name from "John" to "Jane"');
            });

            it('should log last name change', () => {
                const oldData = { lastName: 'Smith' };
                const newData = { lastName: 'Jones' };

                const result = generateAuditLog(oldData, newData);

                expect(result).toHaveLength(1);
                expect(result[0]).toBe('[24/01/2026]: Student updated last name from "Smith" to "Jones"');
            });

            it('should log email change', () => {
                const oldData = { email: 'old@example.com' };
                const newData = { email: 'new@example.com' };

                const result = generateAuditLog(oldData, newData);

                expect(result[0]).toContain('email');
                expect(result[0]).toContain('old@example.com');
                expect(result[0]).toContain('new@example.com');
            });

            it('should log phone number change', () => {
                const oldData = { phoneNumber: '021234567' };
                const newData = { phoneNumber: '027654321' };

                const result = generateAuditLog(oldData, newData);

                expect(result[0]).toContain('phone number');
                expect(result[0]).toContain('021234567');
                expect(result[0]).toContain('027654321');
            });

            it('should log pronouns change', () => {
                const oldData = { pronouns: 'he/him' };
                const newData = { pronouns: 'they/them' };

                const result = generateAuditLog(oldData, newData);

                expect(result[0]).toContain('pronouns');
                expect(result[0]).toContain('he/him');
                expect(result[0]).toContain('they/them');
            });

            it('should display "(empty)" for empty old value', () => {
                const oldData = { firstName: '' };
                const newData = { firstName: 'John' };

                const result = generateAuditLog(oldData, newData);

                expect(result[0]).toContain('(empty)');
                expect(result[0]).toContain('"John"');
            });

            it('should display "(empty)" for missing old value', () => {
                const oldData = {};
                const newData = { firstName: 'John' };

                const result = generateAuditLog(oldData, newData);

                expect(result[0]).toContain('(empty)');
                expect(result[0]).toContain('"John"');
            });

            it('should display "(empty)" for empty new value', () => {
                const oldData = { firstName: 'John' };
                const newData = { firstName: '' };

                const result = generateAuditLog(oldData, newData);

                expect(result[0]).toContain('"John"');
                expect(result[0]).toContain('(empty)');
            });

            it('should display "(empty)" for null values', () => {
                const oldData = { firstName: null };
                const newData = { firstName: 'John' };

                const result = generateAuditLog(oldData, newData);

                expect(result[0]).toContain('(empty)');
            });
        });

        describe('boolean field changes', () => {
            it('should log email consent change from false to true', () => {
                const oldData = { emailConsent: false };
                const newData = { emailConsent: true };

                const result = generateAuditLog(oldData, newData);

                expect(result).toHaveLength(1);
                expect(result[0]).toBe('[24/01/2026]: Student updated email consent from No to Yes');
            });

            it('should log email consent change from true to false', () => {
                const oldData = { emailConsent: true };
                const newData = { emailConsent: false };

                const result = generateAuditLog(oldData, newData);

                expect(result[0]).toBe('[24/01/2026]: Student updated email consent from Yes to No');
            });

            it('should not log if boolean value unchanged', () => {
                const oldData = { emailConsent: true };
                const newData = { emailConsent: true };

                const result = generateAuditLog(oldData, newData);

                expect(result).toHaveLength(0);
            });

            it('should handle boolean false to false correctly', () => {
                const oldData = { emailConsent: false };
                const newData = { emailConsent: false };

                const result = generateAuditLog(oldData, newData);

                expect(result).toHaveLength(0);
            });
        });

        describe('multiple field changes', () => {
            it('should log multiple changes', () => {
                const oldData = {
                    firstName: 'John',
                    lastName: 'Smith',
                    email: 'john@example.com'
                };
                const newData = {
                    firstName: 'Jane',
                    lastName: 'Jones',
                    email: 'jane@example.com'
                };

                const result = generateAuditLog(oldData, newData);

                expect(result).toHaveLength(3);
                expect(result[0]).toContain('first name');
                expect(result[1]).toContain('last name');
                expect(result[2]).toContain('email');
            });

            it('should only log changed fields', () => {
                const oldData = {
                    firstName: 'John',
                    lastName: 'Smith',
                    email: 'john@example.com'
                };
                const newData = {
                    firstName: 'Jane',
                    lastName: 'Smith', // Unchanged
                    email: 'john@example.com' // Unchanged
                };

                const result = generateAuditLog(oldData, newData);

                expect(result).toHaveLength(1);
                expect(result[0]).toContain('first name');
            });

            it('should log all tracked fields when all change', () => {
                const oldData = {
                    firstName: 'John',
                    lastName: 'Smith',
                    email: 'john@example.com',
                    phoneNumber: '021234567',
                    pronouns: 'he/him',
                    emailConsent: false
                };
                const newData = {
                    firstName: 'Jane',
                    lastName: 'Jones',
                    email: 'jane@example.com',
                    phoneNumber: '027654321',
                    pronouns: 'she/her',
                    emailConsent: true
                };

                const result = generateAuditLog(oldData, newData);

                expect(result).toHaveLength(6);
            });

            it('should handle mix of string and boolean changes', () => {
                const oldData = {
                    firstName: 'John',
                    emailConsent: false
                };
                const newData = {
                    firstName: 'Jane',
                    emailConsent: true
                };

                const result = generateAuditLog(oldData, newData);

                expect(result).toHaveLength(2);
                expect(result[0]).toContain('"John"');
                expect(result[1]).toContain('No to Yes');
            });
        });

        describe('admin flag', () => {
            it('should use "Admin" when isAdmin is true', () => {
                const oldData = { firstName: 'John' };
                const newData = { firstName: 'Jane' };

                const result = generateAuditLog(oldData, newData, true);

                expect(result[0]).toContain('Admin updated');
            });

            it('should use "Student" when isAdmin is false', () => {
                const oldData = { firstName: 'John' };
                const newData = { firstName: 'Jane' };

                const result = generateAuditLog(oldData, newData, false);

                expect(result[0]).toContain('Student updated');
            });

            it('should default to "Student" when isAdmin not provided', () => {
                const oldData = { firstName: 'John' };
                const newData = { firstName: 'Jane' };

                const result = generateAuditLog(oldData, newData);

                expect(result[0]).toContain('Student updated');
            });
        });

        describe('edge cases', () => {
            it('should return empty array when no changes', () => {
                const oldData = {
                    firstName: 'John',
                    lastName: 'Smith',
                    email: 'john@example.com'
                };
                const newData = {
                    firstName: 'John',
                    lastName: 'Smith',
                    email: 'john@example.com'
                };

                const result = generateAuditLog(oldData, newData);

                expect(result).toEqual([]);
            });

            it('should return empty array when both objects empty', () => {
                const result = generateAuditLog({}, {});
                expect(result).toEqual([]);
            });

            it('should ignore untracked fields', () => {
                const oldData = {
                    firstName: 'John',
                    untrackedField: 'old value'
                };
                const newData = {
                    firstName: 'John',
                    untrackedField: 'new value'
                };

                const result = generateAuditLog(oldData, newData);

                expect(result).toEqual([]);
            });

            it('should handle whitespace-only values', () => {
                const oldData = { firstName: '   ' };
                const newData = { firstName: 'John' };

                const result = generateAuditLog(oldData, newData);

                expect(result).toHaveLength(1);
                expect(result[0]).toContain('   ');
            });

            it('should handle special characters in values', () => {
                const oldData = { firstName: 'O\'Brien' };
                const newData = { firstName: 'O\'Malley' };

                const result = generateAuditLog(oldData, newData);

                expect(result[0]).toContain('O\'Brien');
                expect(result[0]).toContain('O\'Malley');
            });

            it('should handle empty string to empty string (no change)', () => {
                const oldData = { firstName: '' };
                const newData = { firstName: '' };

                const result = generateAuditLog(oldData, newData);

                expect(result).toEqual([]);
            });
        });
    });

    describe('appendAuditLog', () => {
        it('should append single audit entry to existing notes', () => {
            const existingNotes = 'Previous admin note';
            const auditEntries = ['[24/01/2026]: Student updated first name from "John" to "Jane"'];

            const result = appendAuditLog(existingNotes, auditEntries);

            expect(result).toBe('Previous admin note\n[24/01/2026]: Student updated first name from "John" to "Jane"');
        });

        it('should append multiple audit entries to existing notes', () => {
            const existingNotes = 'Previous admin note';
            const auditEntries = [
                '[24/01/2026]: Student updated first name from "John" to "Jane"',
                '[24/01/2026]: Student updated last name from "Smith" to "Jones"'
            ];

            const result = appendAuditLog(existingNotes, auditEntries);

            expect(result).toContain('Previous admin note');
            expect(result).toContain('first name');
            expect(result).toContain('last name');
            expect(result.split('\n')).toHaveLength(3);
        });

        it('should create notes from audit entries when no existing notes', () => {
            const existingNotes = '';
            const auditEntries = ['[24/01/2026]: Student updated first name from "John" to "Jane"'];

            const result = appendAuditLog(existingNotes, auditEntries);

            expect(result).toBe('[24/01/2026]: Student updated first name from "John" to "Jane"');
        });

        it('should create notes from audit entries when existing notes is null', () => {
            const existingNotes = null;
            const auditEntries = ['[24/01/2026]: Student updated first name from "John" to "Jane"'];

            const result = appendAuditLog(existingNotes, auditEntries);

            expect(result).toBe('[24/01/2026]: Student updated first name from "John" to "Jane"');
        });

        it('should create notes from audit entries when existing notes is undefined', () => {
            const existingNotes = undefined;
            const auditEntries = ['[24/01/2026]: Student updated first name from "John" to "Jane"'];

            const result = appendAuditLog(existingNotes, auditEntries);

            expect(result).toBe('[24/01/2026]: Student updated first name from "John" to "Jane"');
        });

        it('should join multiple entries with newlines when no existing notes', () => {
            const existingNotes = '';
            const auditEntries = [
                '[24/01/2026]: Student updated first name from "John" to "Jane"',
                '[24/01/2026]: Student updated last name from "Smith" to "Jones"',
                '[24/01/2026]: Student updated email consent from No to Yes'
            ];

            const result = appendAuditLog(existingNotes, auditEntries);

            const lines = result.split('\n');
            expect(lines).toHaveLength(3);
            expect(lines[0]).toContain('first name');
            expect(lines[1]).toContain('last name');
            expect(lines[2]).toContain('email consent');
        });

        it('should return existing notes unchanged when no audit entries', () => {
            const existingNotes = 'Previous admin note';
            const auditEntries = [];

            const result = appendAuditLog(existingNotes, auditEntries);

            expect(result).toBe('Previous admin note');
        });

        it('should return empty string when no notes and no entries', () => {
            const existingNotes = '';
            const auditEntries = [];

            const result = appendAuditLog(existingNotes, auditEntries);

            expect(result).toBe('');
        });

        it('should preserve existing notes formatting with multiple lines', () => {
            const existingNotes = 'Line 1\nLine 2\nLine 3';
            const auditEntries = ['[24/01/2026]: Student updated first name from "John" to "Jane"'];

            const result = appendAuditLog(existingNotes, auditEntries);

            expect(result).toContain('Line 1\nLine 2\nLine 3');
            expect(result.split('\n')).toHaveLength(4);
        });

        it('should handle very long audit entries', () => {
            const existingNotes = 'Short note';
            const auditEntries = [
                '[24/01/2026]: Admin updated email from "very.long.email.address@subdomain.domain.com" to "another.very.long.email@differentdomain.co.nz"'
            ];

            const result = appendAuditLog(existingNotes, auditEntries);

            expect(result).toContain('Short note');
            expect(result).toContain('very.long.email');
            expect(result).toContain('another.very.long.email');
        });
    });

    describe('integration - full workflow', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2026-01-24T12:00:00'));
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should generate and append audit log for profile update', () => {
            const oldData = {
                firstName: 'John',
                lastName: 'Smith',
                email: 'john@example.com',
                phoneNumber: '021234567',
                pronouns: 'he/him',
                emailConsent: false
            };

            const newData = {
                firstName: 'John',
                lastName: 'Smith',
                email: 'john.smith@example.com',
                phoneNumber: '027654321',
                pronouns: 'he/him',
                emailConsent: true
            };

            const existingNotes = 'Student enrolled on 01/01/2026';

            // Generate audit log
            const auditEntries = generateAuditLog(oldData, newData);
            expect(auditEntries).toHaveLength(3); // email, phone, consent changed

            // Append to notes
            const updatedNotes = appendAuditLog(existingNotes, auditEntries);

            expect(updatedNotes).toContain('Student enrolled on 01/01/2026');
            expect(updatedNotes).toContain('email');
            expect(updatedNotes).toContain('phone number');
            expect(updatedNotes).toContain('email consent');
            expect(updatedNotes).toContain('john@example.com');
            expect(updatedNotes).toContain('john.smith@example.com');
        });

        it('should handle admin making changes', () => {
            const oldData = { firstName: 'John', emailConsent: false };
            const newData = { firstName: 'Jonathan', emailConsent: true };
            const existingNotes = '';

            const auditEntries = generateAuditLog(oldData, newData, true);
            const updatedNotes = appendAuditLog(existingNotes, auditEntries);

            expect(updatedNotes).toContain('Admin updated');
            expect(updatedNotes).toContain('first name');
            expect(updatedNotes).toContain('email consent');
        });

        it('should handle no changes scenario', () => {
            const oldData = { firstName: 'John', lastName: 'Smith' };
            const newData = { firstName: 'John', lastName: 'Smith' };
            const existingNotes = 'Original note';

            const auditEntries = generateAuditLog(oldData, newData);
            const updatedNotes = appendAuditLog(existingNotes, auditEntries);

            expect(updatedNotes).toBe('Original note');
        });

        it('should build up audit trail over time', () => {
            let notes = '';

            // First change
            const change1Old = { firstName: 'John' };
            const change1New = { firstName: 'Jonathan' };
            const audit1 = generateAuditLog(change1Old, change1New);
            notes = appendAuditLog(notes, audit1);

            // Second change (next day)
            jest.setSystemTime(new Date('2026-01-25T12:00:00'));
            const change2Old = { email: 'john@example.com' };
            const change2New = { email: 'jonathan@example.com' };
            const audit2 = generateAuditLog(change2Old, change2New);
            notes = appendAuditLog(notes, audit2);

            // Should have both entries
            expect(notes).toContain('[24/01/2026]');
            expect(notes).toContain('[25/01/2026]');
            expect(notes).toContain('first name');
            expect(notes).toContain('email');
            expect(notes.split('\n')).toHaveLength(2);
        });
    });
});
