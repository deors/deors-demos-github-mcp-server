import { Octokit } from "octokit";

// check for GITHUB_TOKEN environment variable
const githubToken = process.env.GITHUB_TOKEN;
if (!githubToken || githubToken.trim() === "") {
    console.error("[ERROR] The GITHUB_TOKEN environment variable is not set or is empty. Please set it before starting the server.");
    process.exit(1);
}

export const octokit = new Octokit({
    auth: githubToken,
    userAgent: 'mcp-github-repos v1.0.0'
});

console.log('Octokit initialized with the provided GitHub token.');

const {data: { login }} = await octokit.rest.users.getAuthenticated();

console.log(`Token corresponds to user @${login}`);

export async function getRepo(query: string, org?: string): Promise<string[]> {
    try {
        const response = org
            ? await octokit.rest.repos.listForOrg({
                org,
                type: 'all',
                sort: 'full_name',
                direction: 'asc',
                per_page: 100,
                page: 1
            })
            : await octokit.rest.repos.listForAuthenticatedUser({
                visibility: 'all',
                affiliation: 'owner',
                sort: 'full_name',
                direction: 'asc',
                per_page: 100,
                page: 1
            });

        console.log('[findRepo] Repositories found:');
        response.data.forEach(repo => {
            console.log(`- ${repo.name}`);
        });

        let matchingRepos: string[] = [];
        // if query has commas or vertical bars, split into multiple terms
        if (query.includes(',') || query.includes('|')) {
            const terms = query.split(/[,|]+/).map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
            matchingRepos = response.data
                .filter(repo => terms.some(term => repo.name.toLowerCase().includes(term)))
                .map(repo => repo.name);
        } else {
            matchingRepos = response.data
                .filter(repo => repo.name.toLowerCase().includes(query.toLowerCase()))
                .map(repo => repo.name);
        }
        return matchingRepos;
    } catch (error: any) {
        console.error('[findRepo] Error finding repositories:', error.message || error);
        throw error;
    }
}

export async function createRepo(name: string, description: string, isPrivate: boolean, org?: string, teamName?: string, appId?: string) {
    try {
        const repoResponse = org
            ? await octokit.rest.repos.createInOrg({
                org,
                name,
                description,
                private: isPrivate
            })
            : await octokit.rest.repos.createForAuthenticatedUser({
                name,
                description,
                private: isPrivate
            });
        console.log(`[createRepo] Repository created: "${repoResponse.data.full_name}" @ ${repoResponse.data.html_url}`);

        if (org) {
            console.log('[createRepo] Setting custom properties for the repository...');
            const resolvedTeamName = teamName && teamName.trim() !== '' ? teamName : 'unknown';
            const resolvedAppId = appId && appId.trim() !== '' ? appId : 'unknown';

            await octokit.rest.repos.createOrUpdateCustomPropertiesValues({
                owner: org,
                repo: name,
                properties: [
                    { "property_name": "team_name", "value": resolvedTeamName },
                    { "property_name": "app_id", "value": resolvedAppId },
                ]
            });
            console.log(`[createRepo] Custom properties set: team_name="${resolvedTeamName}", app_id="${resolvedAppId}"`);
        } else {
            console.log('[createRepo] Skipping custom properties: not an organization repository.');
        }

        // return repoResponse.data;
        return "ok";
    } catch (error: any) {
        console.error(error);
        console.error(`[createRepo] Error ${error.status} creating repository:`, error.message || error);
        throw error;
    }
}
