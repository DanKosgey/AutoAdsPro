# Web Browsing Tool Documentation

## Overview
The `browse_url` tool allows the AI agent to fetch and extract content from websites in real-time. This capability enables the AI to provide up-to-date information, check news, verify facts, and retrieve data that isn't in its training set.

> [!IMPORTANT]
> **Usage Policy**: This tool should **ONLY** be used when the user explicitly requests information that requires browsing external websites (e.g., "check the latest news", "what is the current price of Bitcoin"). Do NOT use it for general knowledge queries that the AI can answer itself.

## Tool Details

### Name
`browse_url`

### Description
Fetch and extract content from a website URL. Use this to get real-time information, news, articles, product details, or any data from the web.

### Parameters
- **url** (required): String - The fill URL to fetch (e.g., 'https://example.com/article'). Must be a valid http or https URL.
- **extract_type** (optional): String - What to extract:
  - `'summary'` (default): Returns the title and the first few paragraphs. Best for articles and general info.
  - `'metadata'`: Returns only the title and meta description. Best for checking what a page is about without fetching full content.
  - `'full'`: Returns the entire text content of the page (truncated to 5000 chars). Use sparingly.

### Return Format
Returns a string containing the extracted content, typically formatted as:
```text
Title: Page Title

[Content paragraphs...]
```

## Security & Limitations

### 1. Safety Measures
- **Rate Limiting**: Limited to 10 requests per minute to prevent abuse.
- **URL Validation**: Blocks access to localhost (127.0.0.1) and private IP ranges to prevent server-side request forgery (SSRF).
- **Content Truncation**: Responses are limited to 5000 characters to ensure fast processing and prevent token limit issues.

### 2. Technical Limitations
- **Static Content Only**: The tool uses a standard HTTP client, so it cannot execute JavaScript. Websites that rely entirely on client-side rendering (SPA) may return empty content.
- **Authentication**: Cannot access websites that require login or cookies.
- **Anti-Bot Measures**: Some websites (e.g., Cloudflare-protected sites) may block the scraper.

## Example Scenarios

### 1. Checking News
**User**: "What's the latest news on BBC?"
**AI**: *Calls browse_url('https://www.bbc.com/news', 'summary')*
**Response**: "Here are the top stories from BBC News: [Summary of articles...]"

### 2. Product Information
**User**: "Check the price of the new iPhone on Apple's site."
**AI**: *Calls browse_url('https://www.apple.com/iphone', 'summary')*
**Response**: "According to the Apple website, the new iPhone starts at..."

### 3. Fact Checking
**User**: "Can you verify if [Event] happened today?"
**AI**: *Calls browse_url([News Source URL], 'summary')*
**Response**: "I checked [Source] and verified that..."

## Best Practices

1. **Be Specific**: When possible, provide a specific article URL rather than a homepage for better results.
2. **Use Summaries**: The default 'summary' extraction is usually sufficient and faster than fetching full content.
3. **Handle Errors Gracefully**: If a site blocks the scraper or fails to load, the AI will inform you and suggest trying a different source.

---

**Last Updated**: January 28, 2026
**Version**: 1.0.0
