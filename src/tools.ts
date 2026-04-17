import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { z } from 'zod';
import { getRepo, createRepo } from './github-repos.js';
import { getRepoLabels, getIssues, createIssue } from './github-issues.js';

export async function addTools(server: McpServer) {
    server.tool(
        'findRepo',
        'Finds a GitHub repository.',
        {
            query: z.string().describe('A query string to find matching repositories.'),
            org: z.string().optional().describe('Optional GitHub organization name. If provided, searches the organization repos instead of the authenticated user repos.')
        },
        async ({ query, org }) => {
            console.log(`[findRepo] Received request with query "${query}"${org ? ` in org "${org}"` : ''}`);
            let message: string;
            const foundRepos = await getRepo(query, org);
            if (foundRepos.length > 0) {
                console.log(`[findRepo] Found ${foundRepos.length} repos matching "${query}":`, foundRepos);
                const header = `| ## |                  Repository Name                 |\n|----|--------------------------------------------------|`;
                const rows = foundRepos.map((name, idx) => `| ${String(idx + 1).padStart(2)} | ${name.slice(0, 48).padEnd(48)} |`).join('\n');
                message = `Repositories found matching "${query}":\n${header}\n${rows}`;
            } else {
                message = `No repositories found matching "${query}".`;
            }
            const response: any = {
                content: [
                    {
                        type: 'text',
                        text: message
                    },
                ],
            };
            console.log(`[findRepo] Responding with:`, response);
            return response;
        }
    );
    console.log('Registered tool: findRepo');

    server.tool(
        'createRepo',
        'Creates a new GitHub repository.',
        {
            name: z.string().describe('The name of the repository to create.'),
            description: z.string().describe('A description of the repository.'),
            isPrivate: z.boolean().optional().default(true).describe('Whether the repository should be private. Defaults to true.'),
            org: z.string().optional().describe('Optional GitHub organization name. If provided, creates the repository in the organization instead of the authenticated user account.'),
            teamName: z.string().optional().describe('Optional team name to attach to the repo. If not provided, "unknown" will be used but keep in mind that the repository might be flagged and removed at a later point by admins or cleaning bots.'),
            appId: z.string().optional().describe('Optional application id to attach to the repo. If not provided, "unknown" will be used but keep in mind that the repository might be flagged and removed at a later point by admins or cleaning bots.')
        },
        async ({ name, description, isPrivate, org, teamName, appId }) => {
            console.log(`[createRepo] Received request to create a repo with name "${name}", description "${description}" and private visibility ${isPrivate}${org ? ` in org "${org}"` : ''}`);
            console.log(`[createRepo] The following values were used for custom properties: ` +
                `teamName = "${teamName ? `'${teamName}'` : 'unknown'}", ` +
                `appId = "${appId ? `'${appId}'` : 'unknown'}"`
            );
            await createRepo(name, description, isPrivate, org, teamName, appId);
            const response: any = {
                content: [
                    {
                        type: 'text',
                        text: `Repo "${name}" created with description "${description}" and private visibility ${isPrivate} is now available:`// ${creationResult.html_url}`
                    }
                ]
            };
            console.log(`[createRepo] Responding with:`, response);
            return response;
        }
    );
    console.log('Registered tool: createRepo');

    server.tool(
        'findIssues',
        'Finds GitHub issues based on a query string.',
        {
            repo: z.string().describe('The repository to search for issues.'),
            query: z.string().describe('A query string to find matching issues.'),
            org: z.string().optional().describe('Optional GitHub organization name. If provided, searches issues in the organization repo instead of the authenticated user repo.')
        },
        async ({ repo, query, org }) => {
            console.log(`[findIssues] Received request for repo "${repo}" with query "${query}"${org ? ` in org "${org}"` : ''}`);
            let message: string;
            const foundIssues = await getIssues(repo, query, org);
            if (foundIssues.length > 0) {
                console.log(`[findIssues] Found ${foundIssues.length} issues matching "${query}":`, foundIssues);
                const header = `| ## |                   Issue Title                    |\n|----|--------------------------------------------------|`;
                const rows = foundIssues.map((title, idx) => `| ${String(idx + 1).padStart(2)} | ${title.slice(0, 48).padEnd(48)} |`).join('\n');
                message = `Issues found matching "${query}":\n${header}\n${rows}`;
            } else {
                message = `No issues found matching "${query}".`;
            }
            const response: any = {
                content: [
                    {
                        type: 'text',
                        text: message
                    },
                ],
            };
            console.log(`[findIssues] Responding with:`, response);
            return response;
        }
    );
    console.log('Registered tool: findIssues');

    server.tool(
        'createIssue',
        'Creates a new GitHub issue.',
        {
            repo: z.string().describe('The repository to create the issue in.'),
            title: z.string().describe('The title of the issue.'),
            body: z.string().describe('The body of the issue.'),
            org: z.string().optional().describe('Optional GitHub organization name. If provided, creates the issue in the organization repo instead of the authenticated user repo.')
        },
        async ({repo, title, body, org}, extra: RequestHandlerExtra<any, any>) => {
            console.log(`[createIssue] Received request to create an issue in repo "${repo}" with title "${title}"${org ? ` in org "${org}"` : ''}`);
            console.log('[createIssue] Listing available labels for this repo...');

            const availableLabels = await getRepoLabels(repo, org);
            
            console.log(`[createIssue] Available labels: ${availableLabels.join(', ')}`);
            
            // use elicitations to ask the user to select labels
            const elicitationResponse = await extra.sendRequest(
                {
                    method: "elicitation/create",
                    params: {
                        message:
                            "Please select the labels to assign to the issue from the available labels: " +
                            availableLabels.join(", ") +
                            ". You can select multiple labels separated by commas, or type 'none' to assign no labels.",
                        requestedSchema: {
                            type: "object",
                            properties: {
                                selectedLabels: {
                                    type: "string",
                                    title: "Issue labels",
                                    description: "The labels to assign to the issue from the available labels.",
                                    enum: [...availableLabels, 'none']
                                }
                            },
                            required: ["selectedLabels"]
                        }
                    }
                },
                z.any()
            );

            console.log('[createIssue] Elicitation response received:', elicitationResponse);

            const selectedLabels = elicitationResponse.content.selectedLabels === 'none' ? [] : elicitationResponse.content.selectedLabels.split(',').map((label: string) => label.trim());

            const creationResult = await createIssue(repo, title, body, selectedLabels, org);
            const response: any = {
                content: [
                    {
                        type: 'text',
                        text: `Issue created in repo "${repo}" with title "${title}": ${creationResult.html_url}`
                    }
                ]
            };
            console.log(`[createIssue] Responding with:`, response);
            return response;
        }
    );
    console.log('Registered tool: createIssue');
}