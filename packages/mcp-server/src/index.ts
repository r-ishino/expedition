import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerWaypointTools } from './tools/waypoints';

const server = new McpServer({
  name: 'expedition',
  version: '0.1.0',
});

// ドメインごとにツールを登録
registerWaypointTools(server);

// サーバー起動
const main = async (): Promise<void> => {
  const transport = new StdioServerTransport();
  await server.connect(transport);
};

main().catch((err: unknown) => {
  console.error('MCP server failed to start:', err);
  process.exit(1);
});
