import { writeFile } from 'node:fs/promises';

export async function writeJsonReport(filePath, data) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  return filePath;
}
