import { createHash } from "crypto";

export const hashFilePath = (filePath: string): string => {
    return createHash('sha256').update(filePath).digest('hex').slice(0, 12);
};
