/**
 * Sanitize a topic string for safe prompting and caching.
 * Default max length capped at 60 chars to avoid prompt injection surface and long cache keys.
 */
export function sanitizeTopic(input: string, maxLen = 60): string {
	let s = String(input ?? '').trim();
	s = s.replace(/[\x00-\x1F\x7F]/g, '');
	s = s.replace(/[<>]/g, '');
	s = s.replace(/\s+/g, ' ');
	if (s.length > maxLen) s = s.slice(0, maxLen).trim();
	return s;
}

/**
 * Basic validation: require at least 2 characters after trimming/sanitizing.
 */
export function isTopicValid(input: string): boolean {
	const s = sanitizeTopic(input);
	return s.length >= 2;
}
