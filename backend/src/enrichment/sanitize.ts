"use strict";

const SCRIPT_BLOCK_PATTERN = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
const STYLE_BLOCK_PATTERN = /<style\b[^>]*>[\s\S]*?<\/style>/gi;
const HTML_TAG_PATTERN = /<[^>]+>/g;
/* eslint-disable no-control-regex -- intentional removal of control characters from untrusted article text */
const CONTROL_CHAR_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
/* eslint-enable no-control-regex */
const ZERO_WIDTH_PATTERN = /[\u200B-\u200D\uFEFF]/g;
const ARTICLE_INPUT_OPEN = "<ARTICLE_INPUT>";
const ARTICLE_INPUT_CLOSE = "</ARTICLE_INPUT>";
const CODE_FENCE_PATTERN = /```/g;

/**
 * Parameters for sanitizing untrusted article text before LLM submission.
 */
export interface SanitizeArticleTextParams {
    value: string;
}

/**
 * Strip HTML, control characters, and prompt delimiter sequences from article text.
 */
export function sanitizeArticleText(params: SanitizeArticleTextParams): string {
    let sanitized = params.value;

    sanitized = sanitized.replace(SCRIPT_BLOCK_PATTERN, " ");
    sanitized = sanitized.replace(STYLE_BLOCK_PATTERN, " ");
    sanitized = sanitized.replace(HTML_TAG_PATTERN, " ");
    sanitized = sanitized.replace(CONTROL_CHAR_PATTERN, " ");
    sanitized = sanitized.replace(ZERO_WIDTH_PATTERN, " ");
    sanitized = sanitized.replaceAll(ARTICLE_INPUT_OPEN, " ");
    sanitized = sanitized.replaceAll(ARTICLE_INPUT_CLOSE, " ");
    sanitized = sanitized.replace(CODE_FENCE_PATTERN, " ");
    sanitized = sanitized.replace(/\s+/g, " ").trim();

    return sanitized;
}
