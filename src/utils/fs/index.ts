import { exec } from 'child_process';
import fs, { constants } from 'fs';
import { mkdir, access } from 'fs/promises';

export const ensureFolderExists = async (folderPath: string) => {
  try {
    await access(folderPath, constants.F_OK)
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      await mkdir(folderPath, { recursive: true })

      if (process.platform === 'win32') {
        exec(`attrib +h ${folderPath}`, (err) => {
          if (err) {
            console.error(`Failed to hide folder "${folderPath}":`, err);
          } else {
            console.log(`Folder "${folderPath}" is now hidden.`);
          }
        });
      }
    } else {
      throw error;
    }
  }
}

export function isDirectory(path: fs.PathLike) {
    try {
      return fs.statSync(path).isDirectory();
    } catch (err) {
      return false;
    }
}
  
export function isFile(path: fs.PathLike) {
    try {
        return fs.statSync(path).isFile();
    } catch (err) {
        return false;
    }
}
