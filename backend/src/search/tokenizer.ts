"use strict";

import { BooleanQueryError } from "./errors.js";
import type { Token, TokenType } from "./types.js";

const OPERATOR_AND = "AND";
const OPERATOR_OR = "OR";
const OPERATOR_NOT = "NOT";

const TERM_CHAR_PATTERN = /[\p{L}\p{N}_-]/u;
const LEXEME_PATTERN = /[\p{L}\p{N}]/u;

interface TokenizerState {
    input: string;
    index: number;
    tokens: Token[];
}

/**
 * Check whether a character is allowed inside an unquoted term.
 */
function isTermCharacter(character: string): boolean {
    const result = TERM_CHAR_PATTERN.test(character);
    return result;
}

/**
 * Check whether a string contains at least one letter or digit lexeme.
 */
export function containsLexeme(value: string): boolean {
    for (const character of value) {
        if (LEXEME_PATTERN.test(character)) {
            return true;
        }
    }

    return false;
}

/**
 * Peek the current character without advancing.
 */
function peekCharacter(state: TokenizerState): string | null {
    if (state.index >= state.input.length) {
        return null;
    }

    const character = state.input.charAt(state.index);
    return character;
}

/**
 * Consume and return the current character, advancing the index.
 */
function consumeCharacter(state: TokenizerState): string | null {
    const character = peekCharacter(state);

    if (character === null) {
        return null;
    }

    state.index = state.index + 1;
    return character;
}

/**
 * Skip whitespace characters.
 */
function skipWhitespace(state: TokenizerState): void {
    let character = peekCharacter(state);

    while (character !== null && /\s/u.test(character)) {
        consumeCharacter(state);
        character = peekCharacter(state);
    }
}

/**
 * Append a token to the token list.
 */
function pushToken(state: TokenizerState, type: TokenType, value: string, position: number): void {
    const token: Token = {
        type,
        value,
        position,
    };

    state.tokens.push(token);
}

/**
 * Check whether an operator word is followed by a valid boundary.
 */
function isOperatorBoundary(state: TokenizerState, operatorLength: number): boolean {
    const boundaryIndex = state.index + operatorLength;

    if (boundaryIndex >= state.input.length) {
        return true;
    }

    const boundaryCharacter = state.input.charAt(boundaryIndex);

    if (/\s/u.test(boundaryCharacter)) {
        return true;
    }

    if (boundaryCharacter === "(" || boundaryCharacter === ")") {
        return true;
    }

    return false;
}

/**
 * Try to match a case-sensitive boolean operator at the current position.
 */
function tryReadOperator(state: TokenizerState, startPosition: number): boolean {
    const remainingInput = state.input.slice(state.index);

    if (remainingInput.startsWith(OPERATOR_AND) && isOperatorBoundary(state, OPERATOR_AND.length)) {
        pushToken(state, "AND", OPERATOR_AND, startPosition);
        state.index = state.index + OPERATOR_AND.length;
        return true;
    }

    if (remainingInput.startsWith(OPERATOR_OR) && isOperatorBoundary(state, OPERATOR_OR.length)) {
        pushToken(state, "OR", OPERATOR_OR, startPosition);
        state.index = state.index + OPERATOR_OR.length;
        return true;
    }

    if (remainingInput.startsWith(OPERATOR_NOT) && isOperatorBoundary(state, OPERATOR_NOT.length)) {
        pushToken(state, "NOT", OPERATOR_NOT, startPosition);
        state.index = state.index + OPERATOR_NOT.length;
        return true;
    }

    return false;
}

/**
 * Read a double-quoted phrase token.
 */
function readPhraseToken(state: TokenizerState, startPosition: number): void {
    consumeCharacter(state);

    let phraseValue = "";

    while (true) {
        const character = peekCharacter(state);

        if (character === null) {
            throw new BooleanQueryError(
                "unterminated_quote",
                "Unterminated quoted phrase",
                startPosition,
            );
        }

        if (character === '"') {
            consumeCharacter(state);
            break;
        }

        phraseValue = phraseValue + consumeCharacter(state);
    }

    if (phraseValue.length === 0) {
        throw new BooleanQueryError(
            "syntax_error",
            "Quoted phrase cannot be empty",
            startPosition,
        );
    }

    if (!containsLexeme(phraseValue)) {
        throw new BooleanQueryError(
            "no_lexeme",
            "Phrase must contain at least one letter or digit",
            startPosition,
        );
    }

    pushToken(state, "PHRASE", phraseValue, startPosition);
}

/**
 * Determine whether the current character ends an unquoted term.
 */
function isTermBoundaryCharacter(character: string | null): boolean {
    if (character === null) {
        return true;
    }

    if (/\s/u.test(character)) {
        return true;
    }

    if (character === "(" || character === ")" || character === '"') {
        return true;
    }

    return false;
}

/**
 * Validate and consume a trailing wildcard suffix on a term.
 */
function consumeWildcardSuffix(
    state: TokenizerState,
    termValue: string,
    startPosition: number,
): boolean {
    const character = peekCharacter(state);

    if (character !== "*") {
        return false;
    }

    consumeCharacter(state);

    const nextCharacter = peekCharacter(state);

    if (nextCharacter !== null && !/\s/u.test(nextCharacter) && nextCharacter !== ")") {
        throw new BooleanQueryError(
            "invalid_term",
            "Wildcard * is only allowed as a trailing suffix on a term",
            state.index - 1,
        );
    }

    if (termValue.length === 0) {
        throw new BooleanQueryError(
            "invalid_term",
            "Wildcard term must have a prefix before *",
            startPosition,
        );
    }

    if (!containsLexeme(termValue)) {
        throw new BooleanQueryError(
            "no_lexeme",
            "Term must contain at least one letter or digit",
            startPosition,
        );
    }

    pushToken(state, "TERM", `${termValue}*`, startPosition);
    return true;
}

/**
 * Read characters for an unquoted term until a boundary is reached.
 */
function readTermCharacters(state: TokenizerState): string {
    let termValue = "";

    while (true) {
        const character = peekCharacter(state);

        if (isTermBoundaryCharacter(character)) {
            break;
        }

        if (character === "*") {
            break;
        }

        if (character === null || !isTermCharacter(character)) {
            throw new BooleanQueryError(
                "invalid_term",
                `Invalid character in term: ${character ?? "unknown"}`,
                state.index,
            );
        }

        termValue = termValue + consumeCharacter(state);
    }

    return termValue;
}

/**
 * Validate and emit a completed non-wildcard term token.
 */
function emitPlainTermToken(
    state: TokenizerState,
    termValue: string,
    startPosition: number,
): void {
    if (termValue.length === 0) {
        throw new BooleanQueryError(
            "syntax_error",
            "Expected term, phrase, or parenthesis",
            startPosition,
        );
    }

    if (!containsLexeme(termValue)) {
        throw new BooleanQueryError(
            "no_lexeme",
            "Term must contain at least one letter or digit",
            startPosition,
        );
    }

    pushToken(state, "TERM", termValue, startPosition);
}

/**
 * Read an unquoted term token, optionally with a trailing wildcard.
 */
function readTermToken(state: TokenizerState, startPosition: number): void {
    const termValue = readTermCharacters(state);

    if (consumeWildcardSuffix(state, termValue, startPosition)) {
        return;
    }

    emitPlainTermToken(state, termValue, startPosition);
}

/**
 * Tokenize a boolean query string into a list of tokens.
 */
export function tokenizeBooleanQuery(input: string): Token[] {
    const trimmedInput = input.trim();

    if (trimmedInput.length === 0) {
        throw new BooleanQueryError("empty_query", "Query cannot be empty");
    }

    const state: TokenizerState = {
        input: trimmedInput,
        index: 0,
        tokens: [],
    };

    while (state.index < state.input.length) {
        skipWhitespace(state);

        if (state.index >= state.input.length) {
            break;
        }

        const startPosition = state.index;
        const character = peekCharacter(state);

        if (character === null) {
            break;
        }

        if (character === "(") {
            consumeCharacter(state);
            pushToken(state, "LPAREN", "(", startPosition);
            continue;
        }

        if (character === ")") {
            consumeCharacter(state);
            pushToken(state, "RPAREN", ")", startPosition);
            continue;
        }

        if (character === '"') {
            readPhraseToken(state, startPosition);
            continue;
        }

        if (tryReadOperator(state, startPosition)) {
            continue;
        }

        readTermToken(state, startPosition);
    }

    pushToken(state, "EOF", "", state.index);

    return state.tokens;
}
