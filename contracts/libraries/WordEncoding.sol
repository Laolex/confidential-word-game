// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title WordEncoding
 * @notice Helper library for encoding/decoding words for FHE operations
 * @dev Provides utilities for converting between strings and numeric representations
 */
library WordEncoding {
    uint8 constant LETTER_A_CODE = 65; // ASCII 'A'
    uint8 constant LETTER_Z_CODE = 90; // ASCII 'Z'

    /**
     * @notice Validate that a character is an uppercase letter
     * @param char The character code to validate
     * @return bool True if valid uppercase letter
     */
    function isValidLetter(uint8 char) internal pure returns (bool) {
        return char >= LETTER_A_CODE && char <= LETTER_Z_CODE;
    }

    /**
     * @notice Convert string to array of letter codes
     * @param word The word to encode
     * @return codes Array of letter codes (65-90)
     */
    function encodeWord(string memory word) internal pure returns (uint8[] memory) {
        bytes memory wordBytes = bytes(word);
        uint8[] memory codes = new uint8[](wordBytes.length);

        for (uint i = 0; i < wordBytes.length; i++) {
            uint8 char = uint8(wordBytes[i]);

            // Convert lowercase to uppercase if needed
            if (char >= 97 && char <= 122) {
                char -= 32;
            }

            require(isValidLetter(char), "Invalid character in word");
            codes[i] = char;
        }

        return codes;
    }

    /**
     * @notice Convert letter codes back to string
     * @param codes Array of letter codes
     * @return word The decoded word
     */
    function decodeWord(uint8[] memory codes) internal pure returns (string memory) {
        bytes memory wordBytes = new bytes(codes.length);

        for (uint i = 0; i < codes.length; i++) {
            require(isValidLetter(codes[i]), "Invalid letter code");
            wordBytes[i] = bytes1(codes[i]);
        }

        return string(wordBytes);
    }

    /**
     * @notice Validate word meets game requirements
     * @param word The word to validate
     * @param expectedLength Expected word length
     * @return bool True if valid
     */
    function validateWord(string memory word, uint8 expectedLength)
        internal
        pure
        returns (bool)
    {
        bytes memory wordBytes = bytes(word);

        if (wordBytes.length != expectedLength) {
            return false;
        }

        for (uint i = 0; i < wordBytes.length; i++) {
            uint8 char = uint8(wordBytes[i]);

            // Accept both upper and lowercase
            if (char >= 97 && char <= 122) {
                char -= 32;
            }

            if (!isValidLetter(char)) {
                return false;
            }
        }

        return true;
    }
}
