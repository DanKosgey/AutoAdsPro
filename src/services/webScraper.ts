/**
 * Web Scraper Service - OPTIMIZED
 * Fetches and extracts content from URLs with intelligent compression
 * Features:
 * - Smart token counting (approximates Gemini tokens)
 * - Regex-based content cleaning (removes noise, boilerplate)
 * - Intelligent extraction of key data points
 * - Exact metadata delivery (word count, char count, token count)
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
    TIMEOUT_MS: 10000,              // 10 second timeout
    MAX_TOKENS: 2000,               // Target max tokens for response (Gemini models)
    MAX_CHARS: 8000,                // Max characters to return
    USER_AGENT: 'Mozilla/5.0 (compatible; AIAgent/1.0)',
    MAX_REQUESTS_PER_MINUTE: 10,    // Rate limit
    EXTRACTION_RATIO: 0.15,         // Keep ~15% of clean content for key points
} as const;

// ============================================================================
// TOKEN APPROXIMATION
// ============================================================================

/**
 * Approximates token count for Gemini (roughly 1 token per 4 chars, varies by content)
 */
function estimateTokens(text: string): number {
    const words = text.split(/\s+/).length;
    // Approximation: ~1.3 tokens per word for English
    return Math.ceil(words * 1.3);
}

/**
 * Estimates word count
 */
function estimateWords(text: string): number {
    return text.split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Estimates character count (excluding whitespace)
 */
function estimateCharacters(text: string): number {
    return text.replace(/\s+/g, '').length;
}

// ============================================================================
// CONTENT CLEANING & EXTRACTION
// ============================================================================

/**
 * Regex-based content cleaning to remove unnecessary words and noise
 */
function cleanContent(text: string): string {
    let cleaned = text;

    // Remove extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // Remove common filler phrases
    const fillerPatterns = [
        /click here to[^.]*\./gi,
        /subscribe to[^.]*newsletter[^.]*\./gi,
        /share this article[^.]*\./gi,
        /follow us on[^.]*\./gi,
        /advertisement[^.]*\./gi,
        /sponsored content[^.]*\./gi,
        /cookie policy[^.]*\./gi,
        /privacy policy[^.]*\./gi,
        /terms of service[^.]*\./gi,
        /read more[^.]*\./gi,
        /\(.*advertisement.*\)/gi,
        /\[.*ad.*\]/gi,
    ];

    fillerPatterns.forEach(pattern => {
        cleaned = cleaned.replace(pattern, ' ');
    });

    // Remove repeated whitespace again
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
}

/**
 * Extract key facts/numbers/dates from content
 */
function extractKeyDataPoints(text: string): string[] {
    const dataPoints: string[] = [];

    // Extract numbers with context (e.g., "$1,234", "50%", "2024")
    const numberPattern = /[$€£¥₹][\d,]+\.?\d*|\d+(?:\.\d+)?%|\b20\d{2}\b|\d+(?:\.\d+)?\s*(million|billion|thousand|kg|lb|usd|eur|gbp|yen)/gi;
    const numberMatches = text.match(numberPattern) || [];
    dataPoints.push(...numberMatches.slice(0, 10));

    // Extract dates (YYYY-MM-DD, Month DD, YYYY, etc.)
    const datePattern = /\d{1,2}(?:\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December))?(?:\s+\d{4})?|\d{4}-\d{2}-\d{2}/gi;
    const dateMatches = text.match(datePattern) || [];
    dataPoints.push(...dateMatches.slice(0, 5));

    // Extract important entities (capitalized phrases)
    const entityPattern = /(?:^|\.\s+)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
    let match;
    let entityCount = 0;
    while ((match = entityPattern.exec(text)) && entityCount < 10) {
        if (match[1].length > 3) {
            dataPoints.push(match[1]);
            entityCount++;
        }
    }

    return [...new Set(dataPoints)]; // Remove duplicates
}

/**
 * Extract only sentences containing important keywords
 */
function extractKeywordSentences(text: string, keywords: string[]): string {
    const sentences = text.split(/[.!?;]+/).filter(s => s.trim().length > 20);
    
    const keywordLower = keywords.map(k => k.toLowerCase());
    const importantSentences = sentences.filter(sentence => {
        const sentenceLower = sentence.toLowerCase();
        return keywordLower.some(keyword => sentenceLower.includes(keyword));
    }).slice(0, 5);

    return importantSentences.join('. ') + (importantSentences.length > 0 ? '.' : '');
}

/**
 * Smart content compression - extracts only essential information
 */
function smartCompress(title: string, content: string, targetTokens: number = 1500): string {
    // 1. Clean content of noise
    const cleaned = cleanContent(content);

    // 2. Extract key data points
    const keyPoints = extractKeyDataPoints(cleaned);

    // 3. Split into sentences and prioritize
    const sentences = cleaned
        .split(/[.!?;]+/)
        .map(s => s.trim())
        .filter(s => s.length > 15);

    // 4. Estimate current tokens
    const titleTokens = estimateTokens(title);
    let resultTokens = titleTokens;
    let result = `Title: ${title}\n\n`;

    // 5. Add key data points first (highest priority)
    if (keyPoints.length > 0) {
        const keyPointsText = `Key data: ${keyPoints.slice(0, 5).join(', ')}`;
        const keyPointsTokens = estimateTokens(keyPointsText);
        if (resultTokens + keyPointsTokens < targetTokens * 0.7) {
            result += keyPointsText + '\n\n';
            resultTokens += keyPointsTokens;
        }
    }

    // 6. Add most important sentences (contain numbers, entities, or first sentences)
    const importantSentences: string[] = [];
    for (const sentence of sentences) {
        if (importantSentences.length >= 8) break;

        const sentenceTokens = estimateTokens(sentence);
        if (resultTokens + sentenceTokens > targetTokens) break;

        // Prioritize: sentences with numbers, percentages, or proper nouns
        const hasNumbers = /\d+/.test(sentence);
        const hasPercentage = /%/.test(sentence);
        const hasEntity = /[A-Z][a-z]+\s+[A-Z][a-z]+/.test(sentence);

        if (hasNumbers || hasPercentage || hasEntity || importantSentences.length < 3) {
            importantSentences.push(sentence);
            resultTokens += sentenceTokens;
        }
    }

    result += importantSentences.join('. ') + (importantSentences.length > 0 ? '.' : '');

    return result;
}

class RateLimiter {
    private requests: number[] = [];
    private readonly maxRequests: number;
    private readonly windowMs: number;

    constructor(maxRequests: number, windowMs: number = 60000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
    }

    canMakeRequest(): boolean {
        const now = Date.now();
        // Remove old requests outside the window
        this.requests = this.requests.filter(time => now - time < this.windowMs);
        return this.requests.length < this.maxRequests;
    }

    recordRequest(): void {
        this.requests.push(Date.now());
    }

    getWaitTime(): number {
        if (this.requests.length === 0) return 0;
        const oldestRequest = this.requests[0];
        const waitTime = this.windowMs - (Date.now() - oldestRequest);
        return Math.max(0, waitTime);
    }
}

// ============================================================================
// WEB SCRAPER CLASS
// ============================================================================

export class WebScraper {
    private rateLimiter: RateLimiter;

    constructor() {
        this.rateLimiter = new RateLimiter(CONFIG.MAX_REQUESTS_PER_MINUTE);
    }

    /**
     * Intelligently search the web based on a query
     * Determines the best URL to visit based on the query and category
     */
    async searchWeb(query: string, category?: string): Promise<string> {
        const url = this.determineSearchUrl(query, category);
        console.log(`🔍 Searching for: "${query}" → ${url}`);
        return await this.scrapeUrl(url, 'summary');
    }

    /**
     * Determine the best URL to visit based on query and category
     */
    private determineSearchUrl(query: string, category?: string): string {
        const lowerQuery = query.toLowerCase();

        // Category-based URL selection
        if (category) {
            switch (category.toLowerCase()) {
                case 'news':
                    return 'https://www.bbc.com/news';
                case 'tech':
                    return 'https://techcrunch.com';
                case 'sports':
                    return 'https://www.espn.com';
                case 'finance':
                    if (lowerQuery.includes('bitcoin') || lowerQuery.includes('crypto')) {
                        return 'https://coinmarketcap.com';
                    }
                    // Bloomberg is too heavy (causes memory crashes), use Reuters instead
                    return 'https://www.reuters.com/markets';
                case 'weather':
                    return 'https://weather.com';
            }
        }

        // Query-based intelligent URL selection
        if (lowerQuery.includes('weather')) {
            return 'https://weather.com';
        }
        if (lowerQuery.includes('bitcoin') || lowerQuery.includes('crypto') || lowerQuery.includes('ethereum')) {
            return 'https://coinmarketcap.com';
        }
        if (lowerQuery.includes('interest') && lowerQuery.includes('rate')) {
            return 'https://tradingeconomics.com/united-states/interest-rate';
        }
        if (lowerQuery.includes('stock') || lowerQuery.includes('market') || lowerQuery.includes('finance')) {
            // Bloomberg is too heavy, use Yahoo Finance or Reuters
            return 'https://finance.yahoo.com';
        }
        if (lowerQuery.includes('sport') || lowerQuery.includes('football') || lowerQuery.includes('soccer') ||
            lowerQuery.includes('basketball') || lowerQuery.includes('tennis')) {
            return 'https://www.espn.com';
        }
        if (lowerQuery.includes('tech') || lowerQuery.includes('ai') || lowerQuery.includes('startup')) {
            return 'https://techcrunch.com';
        }
        if (lowerQuery.includes('news') || lowerQuery.includes('world') || lowerQuery.includes('politics')) {
            return 'https://www.bbc.com/news';
        }

        // Default to BBC News for general queries
        return 'https://www.bbc.com/news';
    }

    /**
     * Scrape content from a URL with smart compression
     */
    async scrapeUrl(url: string, extractType: 'full' | 'summary' | 'metadata' = 'summary'): Promise<string> {
        // 1. Validate URL
        if (!this.isValidUrl(url)) {
            throw new Error('Invalid URL format');
        }

        // 2. Check rate limit
        if (!this.rateLimiter.canMakeRequest()) {
            const waitTime = Math.ceil(this.rateLimiter.getWaitTime() / 1000);
            throw new Error(`Rate limit exceeded. Please wait ${waitTime} seconds.`);
        }

        try {
            // 3. Fetch HTML
            console.log(`🌐 Fetching URL: ${url}`);
            const html = await this.fetchHtml(url);

            // 4. Parse and extract
            const content = this.extractContent(html, extractType);

            // 5. Add metadata with accurate counts
            const withMetadata = this.addContentMetadata(content);

            // 6. Record request
            this.rateLimiter.recordRequest();

            return withMetadata;
        } catch (error: any) {
            console.error('Web scraping error:', error.message);
            throw new Error(`Failed to fetch URL: ${error.message}`);
        }
    }

    /**
     * Add metadata about content (word count, character count, token count)
     */
    private addContentMetadata(content: string): string {
        const words = estimateWords(content);
        const characters = estimateCharacters(content);
        const tokens = estimateTokens(content);

        const metadata = `\n\n---CONTENT METADATA---\nWords: ${words} | Characters: ${characters} | Est. Tokens: ${tokens}`;
        
        return content + metadata;
    }

    /**
     * Validate URL format and safety
     */
    private isValidUrl(url: string): boolean {
        try {
            const parsed = new URL(url);
            // Only allow http and https
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return false;
            }
            // Block localhost and private IPs
            if (parsed.hostname === 'localhost' ||
                parsed.hostname.startsWith('127.') ||
                parsed.hostname.startsWith('192.168.') ||
                parsed.hostname.startsWith('10.')) {
                return false;
            }
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Fetch HTML from URL
     */
    private async fetchHtml(url: string): Promise<string> { // Fetch the URL with strict size limits to prevent memory overflow
        const response = await axios.get(url, {
            timeout: CONFIG.TIMEOUT_MS,
            headers: {
                'User-Agent': CONFIG.USER_AGENT,
            },
            maxContentLength: 2 * 1024 * 1024, // 2MB max (prevents Bloomberg/large sites from crashing)
            maxBodyLength: 2 * 1024 * 1024,    // 2MB max
            maxRedirects: 5,
            validateStatus: (status) => status < 500 // Accept 4xx but not 5xx
        });

        return response.data;
    }

    /**
     * Extract content from HTML
     */
    private extractContent(html: string, extractType: 'full' | 'summary' | 'metadata'): string {
        const $ = cheerio.load(html);

        // Remove unwanted elements
        $('script, style, nav, header, footer, aside, iframe, noscript').remove();

        // Extract based on type
        switch (extractType) {
            case 'metadata':
                return this.extractMetadata($);

            case 'summary':
                return this.extractSummary($);

            case 'full':
                return this.extractFullContent($);

            default:
                return this.extractSummary($);
        }
    }

    /**
     * Extract only metadata (title, description)
     */
    private extractMetadata($: cheerio.Root): string {
        const title = $('title').text().trim() ||
            $('meta[property="og:title"]').attr('content') ||
            'No title';

        const description = $('meta[name="description"]').attr('content') ||
            $('meta[property="og:description"]').attr('content') ||
            'No description';

        const cleaned = cleanContent(description);
        return `Title: ${title}\n\nDescription: ${cleaned}`;
    }

    /**
     * Extract summary with smart compression
     */
    private extractSummary($: cheerio.Root): string {
        const title = $('title').text().trim() || 'No title';

        // Get main content
        const mainContent = $('article, main, .content, .post, .entry-content, .article-body').first();
        const contentArea = mainContent.length > 0 ? mainContent : $('body');

        // Extract paragraphs and headings
        const textElements: string[] = [];
        contentArea.find('p, h1, h2, h3, li').each((_, elem) => {
            const text = $(elem).text().trim();
            if (text.length > 15) { // Only substantial text
                textElements.push(text);
            }
        });

        // Join and clean
        const rawContent = textElements.join(' ');
        const cleaned = cleanContent(rawContent);

        // Smart compress to fit token limits
        const compressed = smartCompress(title, cleaned, CONFIG.MAX_TOKENS);
        return compressed;
    }

    /**
     * Extract full page content with compression
     */
    private extractFullContent($: cheerio.Root): string {
        const title = $('title').text().trim() || 'No title';

        // Get all text content
        const bodyText = $('body').text();
        const cleaned = cleanContent(bodyText);

        // Compress to fit token limits
        const compressed = smartCompress(title, cleaned, CONFIG.MAX_TOKENS);
        return compressed;
    }

    /**
     * OLD: Truncate content to max length (kept for compatibility, now uses smart compress)
     */
    private truncateContent(content: string): string {
        const tokens = estimateTokens(content);
        if (tokens <= CONFIG.MAX_TOKENS) {
            return content;
        }

        // If over token limit, use smart compression
        const title = content.split('\n')[0] || 'Content';
        return smartCompress(title, content, CONFIG.MAX_TOKENS);
    }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const webScraper = new WebScraper();
