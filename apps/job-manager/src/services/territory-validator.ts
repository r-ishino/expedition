import { access } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** 指定パスがファイルシステム上に存在するか検証する */
export const validatePathExists = async (path: string): Promise<boolean> => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

/** 指定パスが git リポジトリであるか検証する */
export const validateIsGitRepo = async (path: string): Promise<boolean> => {
  try {
    await execFileAsync('git', ['rev-parse', '--show-toplevel'], {
      cwd: path,
    });
    return true;
  } catch {
    return false;
  }
};
