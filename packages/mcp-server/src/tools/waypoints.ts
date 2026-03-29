import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { buildUrl, fetchJson } from '../api-client';

// --- API client ---

type CreateInput = {
  title: string;
  description?: string;
  estimate?: string;
  uncertainty?: string;
  categories?: string[];
};

type UpdateInput = {
  title?: string;
  description?: string;
  status?: string;
  estimate?: string | null;
  uncertainty?: string | null;
  sortOrder?: number;
  categories?: string[];
};

const list = (): Promise<unknown> => fetchJson(buildUrl('/waypoints'));

const create = (data: CreateInput): Promise<unknown> =>
  fetchJson(buildUrl('/waypoints'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

const update = (waypointId: number, data: UpdateInput): Promise<unknown> =>
  fetchJson(buildUrl(`/waypoints/${waypointId}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

const remove = async (waypointId: number): Promise<void> => {
  await fetchJson(buildUrl(`/waypoints/${waypointId}`), {
    method: 'DELETE',
  });
};

// --- Tool registration ---

export const registerWaypointTools = (server: McpServer): void => {
  server.tool(
    'list_waypoints',
    'List all waypoints for the current quest',
    {},
    async () => {
      const result = await list();
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(result, null, 2) },
        ],
      };
    }
  );

  server.tool(
    'create_waypoint',
    'Create a new waypoint for the current quest',
    {
      title: z.string().describe('Waypoint title'),
      description: z.string().optional().describe('Detailed description'),
      estimate: z
        .string()
        .optional()
        .describe('Estimated change size (e.g. "~50 lines")'),
      uncertainty: z.string().optional().describe('Uncertainties or risks'),
      categories: z
        .array(z.string())
        .optional()
        .describe('Categories (e.g. "schema", "backend", "frontend")'),
    },
    async (params) => {
      const result = await create(params);
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(result, null, 2) },
        ],
      };
    }
  );

  server.tool(
    'update_waypoint',
    'Update an existing waypoint',
    {
      waypointId: z.number().describe('ID of the waypoint'),
      title: z.string().optional().describe('New title'),
      description: z.string().optional().describe('New description'),
      status: z
        .enum(['pending', 'approved', 'reviewing'])
        .optional()
        .describe('New status'),
      estimate: z.string().nullable().optional().describe('New estimate'),
      uncertainty: z.string().nullable().optional().describe('New uncertainty'),
      sortOrder: z.number().optional().describe('New sort order'),
      categories: z.array(z.string()).optional().describe('New categories'),
    },
    async ({ waypointId, ...data }) => {
      const result = await update(waypointId, data);
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(result, null, 2) },
        ],
      };
    }
  );

  server.tool(
    'delete_waypoint',
    'Delete a waypoint',
    {
      waypointId: z.number().describe('ID of the waypoint'),
    },
    async ({ waypointId }) => {
      await remove(waypointId);
      return {
        content: [
          { type: 'text' as const, text: `Waypoint ${waypointId} deleted` },
        ],
      };
    }
  );
};
