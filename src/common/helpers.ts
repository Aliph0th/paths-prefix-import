import { Uri } from 'vscode';
import { ConfigPrefix, PrefixedFile } from './types';

export function joinPrefixedFiles(array: PrefixedFile[], newArray: Uri[], config: ConfigPrefix) {
   const existingRecord = array.find(
      prefixedFile => prefixedFile.config.configFile.fsPath === config.configFile.fsPath
   );
   if (existingRecord) {
      existingRecord.files = joinFiles(existingRecord.files, newArray);
   } else {
      array.push({
         config,
         files: newArray
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
