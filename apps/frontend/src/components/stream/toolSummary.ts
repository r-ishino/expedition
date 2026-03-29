/** tool_use の content から要約テキストを抽出する */

const extractFilePath = (content: string): string | undefined => {
  // JSON content から file_path を抽出
  const match = content.match(/"file_path"\s*:\s*"([^"]+)"/);
  if (match) return match[1];
  return undefined;
};

const extractCommand = (content: string): string | undefined => {
  const match = content.match(/"command"\s*:\s*"([^"]+)"/);
  if (match) return match[1];
  return undefined;
};

const extractPattern = (content: string): string | undefined => {
  const match = content.match(/"pattern"\s*:\s*"([^"]+)"/);
  if (match) return match[1];
  return undefined;
};

const truncate = (text: string, max: number): string =>
  text.length > max ? `${text.slice(0, max)}…` : text;

export const getToolSummary = (
  toolName: string | undefined,
  content: string
): string | undefined => {
  if (!toolName || !content) return undefined;

  switch (toolName) {
    case 'Read': {
      const path = extractFilePath(content);
      return path ? truncate(path, 60) : undefined;
    }
    case 'Edit': {
      const path = extractFilePath(content);
      return path ? truncate(path, 60) : undefined;
    }
    case 'Write': {
      const path = extractFilePath(content);
      return path ? truncate(path, 60) : undefined;
    }
    case 'Bash': {
      const cmd = extractCommand(content);
      return cmd ? truncate(cmd, 60) : undefined;
    }
    case 'Glob':
    case 'Grep': {
      const pattern = extractPattern(content);
      return pattern ? truncate(pattern, 60) : undefined;
    }
    case 'TodoWrite':
    case 'TodoRead':
      return 'Todo';
    default: {
      const trimmed = content.trim();
      return trimmed ? truncate(trimmed, 40) : undefined;
    }
  }
};
