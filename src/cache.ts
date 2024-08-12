import { Uri, workspace, WorkspaceFolder } from 'vscode';
import { CompletionDataItem, ExportToken } from './common/types';

export class Cache {
   exports: ExportToken[] = [];

   get length() {
      return this.exports.reduce((prev, token) => (prev += token.exports.length), 0);
   }

   push(exports: ExportToken[]) {
      for (const exportToken of exports) {
         const existingExport = this.exports.find(
            exp => exp.file.fsPath === exportToken.file.fsPath
         );
         if (existingExport) {
            existingExport.exports.push(...exportToken.exports);
            existingExport.exports = [...new Set(existingExport.exports)];
         } else {
            this.exports.push(exportToken);
         }
      }
   }

   findByFile(file: Uri) {
      const index = this.exports.findIndex(exportToken => exportToken.file.fsPath === file.fsPath);
      return { exportToken: this.exports[index], index };
   }

   replaceExportsByIndex(index: number, exports: string[]) {
      this.exports[index].exports = exports;
   }

   lookForCompletions(text: string, uriWorkspace: WorkspaceFolder | undefined) {
      const regex = new RegExp(text, 'gi');
      return this.exports.reduce<CompletionDataItem[]>((items, { exports, ...item }) => {
         const matches = exports.filter(exportItem => regex.test(exportItem));
         items.push(
            ...matches
               .map(match => ({ token: match, ...item }))
               .filter(
                  dataItem =>
                     workspace.getWorkspaceFolder(dataItem.file)?.index === uriWorkspace?.index
               )
         );
         return items;
      }, []);
   }

   invalidateForFile(file: Uri) {
      this.exports = this.exports.filter(ExportToken => ExportToken.file.fsPath !== file.fsPath);
   }
}
