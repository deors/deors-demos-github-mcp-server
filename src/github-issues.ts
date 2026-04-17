import { Octokit } from "octokit";

// check for GITHUB_TOKEN environment variable
const githubToken = process.env.GITHUB_TOKEN;
if (!githubToken || githubToken.trim() === "") {
    console.error("[ERROR] The GITHUB_TOKEN environment variable is not set or is empty. Please set it before starting the server.");
    process.exit(1);
}

export const octokit = new Octokit({
    auth: githubToken,
    userAgent: 'mcp-github-issues v1.0.0'
});

console.log('Octokit initialized with the provided GitHub token.');

const {data: { login }} = await octokit.rest.users.getAuthenticated();

console.log(`Token corresponds to user @${login}`);

export async function getIssues(repo: string, query: string, org?: string): Promise<string[]> {
    try {
        const response = await octokit.rest.issues.listForRepo({
            owner: org ?? login,
            repo,
            state: 'open',
            per_page: 100,
            page: 1
        });

        console.log('[findIssues] Issues found:');
        response.data.forEach(issue => {
            console.log(`- ${issue.title}`);
        });

        let matchingIssues: string[] = [];
        // if query has commas, or vertical bars, split into multiple terms
        if (query.includes(',') || query.includes('|')) {
            const terms = query.split(/[,|]+/).map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
            matchingIssues = response.data
                .filter(issue => terms.some(term => issue.title.toLowerCase().includes(term) || (issue.body && issue.body.toLowerCase().includes(term))))
                .map(issue => issue.title);
        } else {
            matchingIssues = response.data
                .filter(issue => issue.title.toLowerCase().includes(query.toLowerCase()) || (issue.body && issue.body.toLowerCase().includes(query.toLowerCase())))
                .map(issue => issue.title);
        }
        return matchingIssues;
    } catch (error: any) {
        console.error('[findIssues] Error finding issues:', error.message || error);
        throw error;
    }
}

export async function getRepoLabels(repo: string, org?: string): Promise<string[]> {
    try {
        const labelResponse = await octokit.rest.issues.listLabelsForRepo({
            owner: org ?? login,
            repo,
            per_page: 100,
            page: 1
        });
        console.log('[createIssue] Available labels in the repository:');
        labelResponse.data.forEach(label => {
            console.log(`- ${label.name}`);
        });

        return labelResponse.data.map(label => label.name);
    } catch (error: any) {
        console.error(`[createIssue] Error ${error.status} fetching repository labels:`, error.message || error);
        throw error;
    }
}

export async function createIssue(repo: string, title: string, body: string, labels?: string[], org?: string) {
    try {
        const issueResponse = await octokit.rest.issues.create({
            owner: org ?? login,
            repo,
            title,
            body,
            labels: labels || []
        });
        console.log(`[createIssues] Issue created: "${issueResponse.data.title}" @ (${issueResponse.data.html_url})`);
        return issueResponse.data;
    } catch (error: any) {
        console.error(`[createIssues] Error ${error.status} creating issue:`, error.message || error);
        throw error;
    }
}
