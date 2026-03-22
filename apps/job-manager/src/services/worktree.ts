import { execFile } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const WORKTREE_DIR = '.worktrees';

export type WorktreeInfo = {
  path: string;
  branch: string;
};

/**
 * git worktree を作成し、パスとブランチ名を返す。
 * ブランチ名は `expedition/<jobId>` で衝突を避ける。
 */
export const createWorktree = async (
  repoPath: string,
  jobId: string
): Promise<WorktreeInfo> => {
  const branch = `expedition/${jobId}`;
  const worktreePath = join(repoPath, WORKTREE_DIR, jobId);

  await execFileAsync('git', ['worktree', 'add', '-b', branch, worktreePath], {
    cwd: repoPath,
  });

  return { path: worktreePath, branch };
};

/**
 * git worktree を削除し、対応するブランチも削除する。
 */
export const removeWorktree = async (
  repoPath: string,
  worktreePath: string,
  branch: string
): Promise<void> => {
  try {
    await execFileAsync(
      'git',
      ['worktree', 'remove', worktreePath, '--force'],
      { cwd: repoPath }
    );
  } catch {
    // worktree remove が失敗した場合、ディレクトリを直接削除
    await rm(worktreePath, { recursive: true, force: true });
    await execFileAsync('git', ['worktree', 'prune'], {
      cwd: repoPath,
    });
  }

  // ブランチの削除（失敗しても無視）
  try {
    await execFileAsync('git', ['branch', '-D', branch], {
      cwd: repoPath,
    });
  } catch {
    // ブランチが既に削除済みの場合は無視
  }
};

/**
 * 現在の worktree 一覧を取得する。
 */
export const listWorktrees = async (
  repoPath: string
): Promise<WorktreeInfo[]> => {
  const { stdout } = await execFileAsync(
    'git',
    ['worktree', 'list', '--porcelain'],
    { cwd: repoPath }
  );

  const worktrees: WorktreeInfo[] = [];
  let currentPath = '';

  for (const line of stdout.split('\n')) {
    if (line.startsWith('worktree ')) {
      currentPath = line.slice('worktree '.length);
    } else if (line.startsWith('branch ') && currentPath) {
      const ref = line.slice('branch '.length);
      // refs/heads/expedition/xxx → expedition/xxx
      const branch = ref.replace('refs/heads/', '');
      if (branch.startsWith('expedition/')) {
        worktrees.push({ path: currentPath, branch });
      }
      currentPath = '';
    }
  }

  return worktrees;
};
