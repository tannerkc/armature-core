import fs from 'fs';
export function isDirectory(path) {
    try {
      return fs.statSync(path).isDirectory();
    } catch (err) {
      return false;
    }
}
  
export function isFile(path) {
    try {
        return fs.statSync(path).isFile();
    } catch (err) {
        return false;
    }
}
