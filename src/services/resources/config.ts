/**
 * Configuration for Resource Curation Service
 * 
 * Contains trusted domain lists and credibility scoring logic.
 */

/**
 * Domain credibility scores (0.0 - 1.0)
 * Higher scores indicate more trustworthy sources for financial information.
 */
export const DOMAIN_CREDIBILITY: Record<string, number> = {
    // Government (highest trust)
    '.gov': 1.0,
    '.gov.uk': 1.0,
    'consumerfinance.gov': 1.0,

    // Regulatory
    'sec.gov': 1.0,
    'irs.gov': 1.0,
    'finra.org': 1.0,

    // Educational
    '.edu': 0.95,

    // Established Financial Publications
    'nerdwallet.com': 0.9,
    'investopedia.com': 0.9,
    'consumerreports.org': 0.9,
    'morningstar.com': 0.9,
    'bankrate.com': 0.85,
    'kiplinger.com': 0.85,
    'fool.com': 0.8,  // Motley Fool

    // Nonprofits
    'nfcc.org': 0.9,   // National Foundation for Credit Counseling
    'nefe.org': 0.9,   // National Endowment for Financial Education

    // Major Financial Institutions
    'fidelity.com': 0.85,
    'vanguard.com': 0.85,
    'schwab.com': 0.85,
    'tdameritrade.com': 0.85,
    'wellsfargo.com': 0.8,
    'chase.com': 0.8,
    'bankofamerica.com': 0.8,
};

/**
 * Domains to block (affiliate farms, low-quality aggregators)
 */
export const BLOCKED_DOMAINS: string[] = [
    // Add as we encounter them
];

/**
 * Calculates credibility score for a given URL based on domain reputation.
 * 
 * Scoring logic:
 * 1. Check exact domain match (e.g., "nerdwallet.com")
 * 2. Check TLD match (e.g., ".gov", ".edu")
 * 3. Default to 0.5 for unknown domains
 * 
 * @param url - The URL to score
 * @returns Credibility score between 0.0 and 1.0
 */
export function getCredibilityScore(url: string): number {
    let domain: string;

    try {
        domain = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
        return 0.3;  // Invalid URL gets low score
    }

    // Check if domain is blocked
    if (BLOCKED_DOMAINS.some(blocked => domain.includes(blocked))) {
        return 0.0;
    }

    // Check exact domain match first
    if (DOMAIN_CREDIBILITY[domain] !== undefined) {
        return DOMAIN_CREDIBILITY[domain];
    }

    // Check parent domain (e.g., "blog.nerdwallet.com" -> "nerdwallet.com")
    const parts = domain.split('.');
    if (parts.length > 2) {
        const parentDomain = parts.slice(-2).join('.');
        if (DOMAIN_CREDIBILITY[parentDomain] !== undefined) {
            return DOMAIN_CREDIBILITY[parentDomain];
        }
    }

    // Check TLD matches (.gov, .edu)
    for (const [tld, score] of Object.entries(DOMAIN_CREDIBILITY)) {
        if (tld.startsWith('.') && domain.endsWith(tld)) {
            return score;
        }
    }

    // Unknown domain
    return 0.5;
}

/**
 * Checks if a URL should be filtered out
 */
export function isBlockedDomain(url: string): boolean {
    try {
        const domain = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
        return BLOCKED_DOMAINS.some(blocked => domain.includes(blocked));
    } catch {
        return true;  // Invalid URLs are blocked
    }
}
