import { Uri } from 'vscode';
import { PrefixConfig, PrefixedFile } from './types';

export function joinPrefixedFiles(
   array: PrefixedFile[],
   newArray: Uri[],
   config: PrefixConfig,
   prefix: string
) {
   const existingRecord = array.find(
      prefixedFile =>
         prefixedFile.configPath === config.configFile.fsPath && prefixedFile.prefix === prefix
   );
   if (existingRecord) {
      existingRecord.files = joinFiles(existingRecord.files, newArray);
   } else {
      array.push({
         configPath: config.configFile.fsPath,
         files: newArray,
         prefix,
         prefixPath: config.paths[prefix][0],
         baseUrl: config.baseUrl
      });
   }
   return array;
}

export function joinFiles(existing: Uri[], newFiles: Uri[]) {
   return [
      ...existing,
      ...newFiles.filter(
         file => !existing.some(existingFile => existingFile.fsPath === file.fsPath)
      )
   ];
}
