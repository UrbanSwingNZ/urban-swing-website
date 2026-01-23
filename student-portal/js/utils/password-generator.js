/**
 * password-generator.js - Password Generation Utility
 * Generates secure, memorable passwords in the format: WordWord1234
 */

// Word lists for password generation
const WORD_LIST = [
    'Dancing', 'Swing', 'Music', 'Rhythm', 'Jazz', 'Blues', 'Shuffle', 'Jump',
    'Lindy', 'Charleston', 'Boogie', 'Groove', 'Bounce', 'Spin', 'Turn', 'Twist',
    'Happy', 'Joyful', 'Sunny', 'Bright', 'Golden', 'Silver', 'Purple', 'Crimson',
    'Ocean', 'River', 'Mountain', 'Forest', 'Meadow', 'Valley', 'Summit', 'Canyon',
    'Phoenix', 'Dragon', 'Eagle', 'Falcon', 'Tiger', 'Lion', 'Wolf', 'Bear',
    'Thunder', 'Lightning', 'Storm', 'Breeze', 'Cloud', 'Rainbow', 'Sunset', 'Dawn',
    'Marble', 'Crystal', 'Diamond', 'Emerald', 'Sapphire', 'Ruby', 'Pearl', 'Amber',
    'Champion', 'Victory', 'Triumph', 'Success', 'Glory', 'Honor', 'Legend', 'Hero',
    'Swift', 'Quick', 'Rapid', 'Flash', 'Spark', 'Flame', 'Blaze', 'Glow',
    'Noble', 'Royal', 'Regal', 'Grand', 'Majestic', 'Supreme', 'Elite', 'Prime',
    'Cosmic', 'Stellar', 'Solar', 'Lunar', 'Nova', 'Comet', 'Galaxy', 'Nebula',
    'Magic', 'Mystic', 'Enchant', 'Wonder', 'Dream', 'Vision', 'Spirit', 'Soul'
];

/**
 * Generate a random password in the format: WordWord1234
 * Example: DancingSwing5847
 * 
 * @returns {string} Generated password
 */
function generatePassword() {
    // Get two random words
    const word1 = getRandomWord();
    const word2 = getRandomWord();
    
    // Generate random 4-digit number
    const number = Math.floor(1000 + Math.random() * 9000);
    
    // Combine: WordWord1234
    return `${word1}${word2}${number}`;
}

/**
 * Get a random word from the word list
 * @returns {string} Random word with first letter capitalized
 */
function getRandomWord() {
    const index = Math.floor(Math.random() * WORD_LIST.length);
    return WORD_LIST[index];
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with isValid flag and message
 */
function validatePassword(password) {
    if (!password || password.length < 8) {
        return {
            isValid: false,
            message: 'Password must be at least 8 characters long'
        };
    }
    
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    
    if (!hasUppercase || !hasLowercase) {
        return {
            isValid: false,
            message: 'Password must contain both uppercase and lowercase letters'
        };
    }
    
    return {
        isValid: true,
        message: 'Password is valid'
    };
}

/**
 * Check if two passwords match
 * @param {string} password - First password
 * @param {string} confirmPassword - Second password
 * @returns {boolean} True if passwords match
 */
function passwordsMatch(password, confirmPassword) {
    return password === confirmPassword;
}

// Export for testing (Node.js only, doesn't affect browser usage)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generatePassword,
        getRandomWord,
        validatePassword,
        passwordsMatch,
        WORD_LIST
    };
}
