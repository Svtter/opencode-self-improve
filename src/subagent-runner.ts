export interface ExtractedPattern {
  name: string;
  description: string;
  category: string;
  triggers: string[];
  content: string;
}

export interface ConversationReview {
  patterns: ExtractedPattern[];
}

/**
 * Stub subagent runner. In a real implementation this would spawn a background
 * LLM call to analyse conversations. For now it uses heuristics to extract
 * patterns from message content.
 */
export class SubagentRunner {
  reviewConversation(messages: Array<{ role: string; content: string }>): ConversationReview {
    const patterns: ExtractedPattern[] = [];

    for (const msg of messages) {
      if (msg.role !== 'assistant') continue;

      const content = msg.content;
      if (content.length < 50) continue;

      // Heuristic: if the assistant gave a multi-step answer with code blocks, extract a pattern
      const hasSteps = /\n\d+\.\s/.test(content);
      const hasCode = content.includes('```');

      if (hasSteps && hasCode) {
        // Try to extract a title from the first heading or first line
        const headingMatch = content.match(/^#+\s+(.+)$/m);
        const title = headingMatch
          ? headingMatch[1].trim()
          : content.split('\n')[0].slice(0, 60).trim();

        // Extract potential trigger keywords from the content
        const codeLangMatch = content.match(/```(\w+)/);
        const lang = codeLangMatch ? codeLangMatch[1].toLowerCase() : '';

        const triggers: string[] = [];
        if (lang) triggers.push(lang);

        // Add words from the title as triggers
        title.split(/\s+/).filter(w => w.length > 4).forEach(w => triggers.push(w.toLowerCase()));

        if (triggers.length === 0) triggers.push('general');

        // Determine category heuristically
        const category = this.inferCategory(content, lang);

        patterns.push({
          name: title.replace(/[^a-zA-Z0-9\s-]/g, '').trim(),
          description: `Pattern extracted from conversation: ${title}`,
          category,
          triggers: [...new Set(triggers)],
          content: content.slice(0, 500),
        });
      }
    }

    return { patterns: patterns.slice(0, 3) };
  }

  private inferCategory(content: string, lang: string): string {
    const lower = content.toLowerCase();
    if (lower.includes('test') || lower.includes('jest') || lower.includes('vitest')) return 'testing';
    if (lower.includes('debug') || lower.includes('error') || lower.includes('bug')) return 'debugging';
    if (lower.includes('refactor') || lower.includes('clean') || lower.includes('restructure')) return 'refactoring';
    if (lower.includes('api') || lower.includes('endpoint') || lower.includes('route')) return 'api';
    if (lower.includes('component') || lower.includes('ui') || lower.includes('render')) return 'ui';
    if (lower.includes('database') || lower.includes('query') || lower.includes('sql')) return 'database';
    if (lang === 'typescript' || lang === 'javascript') return 'coding';
    return 'other';
  }
}
