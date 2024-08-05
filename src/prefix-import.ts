import { Cache } from './cache';
import {
   Position,
   Range,
   StatusBarAlignment,
   TextDocument,
   window,
   workspace,
   WorkspaceEdit
} from 'vscode';
import { Scanner } from './scanner';
import { Notifier } from './notifier';
import { CompletionDataItem } from './common/types';
import { regex } from './common/regex';
import path from 'path';

export class PrefixImport {
   private readonly statusBar = window.createStatusBarItem(StatusBarAlignment.Left);
   private readonly scanner: Scanner;
   private readonly cache: Cache;
   constructor(scanner: Scanner, cache: Cache) {
      this.scanner = scanner;
      this.statusBar.text = '{0}';
      this.statusBar.show();
      this.cache = cache;
   }

   async scanPrefixes() {
      const root = workspace.workspaceFolders?.[0];
      if (!root) {
         Notifier.error('Workspace root folder is undefined');
         return;
      }
      const configs = await this.scanner.findConfigs(root.uri.fsPath);
      const prefixedFiles = await this.scanner.findPrefixedFiles(configs);
      const parsedTokens = await this.scanner.parseExportTokens(prefixedFiles);
      this.cache.push(parsedTokens);
      this.statusBar.text = `{${this.cache.length}}`;
   }

   updateImports(data: CompletionDataItem, document: TextDocument) {
      workspace.applyEdit(this.getEdit(data, document));
   }

   private getEdit(data: CompletionDataItem, document: TextDocument): WorkspaceEdit {
      const edit: WorkspaceEdit = new WorkspaceEdit();

      const importPath = this.buildCompletionPath(data);

      if (!!this.findInImports(document, data.token)) {
         return edit;
      }

      const statement = this.findInImports(document, importPath);
      if (!!statement) {
         edit.replace(
            document.uri,
            new Range(0, 0, document.lineCount, 0),
            this.mergeImportStatement(document, statement, data.token, importPath)
         );
      } else {
         edit.insert(
            document.uri,
            new Position(0, 0),
            this.createImportStatement(data.token, importPath, true)
         );
      }

      return edit;
   }

   private mergeImportStatement(
      document: TextDocument,
      currentStatement: string,
      token: string,
      importPath: string
   ) {
      const documentText = document.getText();
      const importNames = currentStatement.match(regex.importNames)![0].trim();
      const importArray = importNames.split(',');
      importArray.push(token);
      console.log(importArray);
      const newImport = this.createImportStatement(importArray.join(', '), importPath);

      return documentText.replace(currentStatement, newImport);
   }

   private createImportStatement(token: string, importPath: string, endline = false): string {
      return `import { ${token} } from '${importPath}';${endline ? '\r\n' : ''}`;
   }

   private findInImports(document: TextDocument, substring: string) {
      const matches = document.getText().matchAll(regex.importStatement);
      for (const match of matches) {
         if (match[0].includes(substring)) {
            return match[0];
         }
      }
      return null;
   }

   private buildCompletionPath(data: CompletionDataItem): string {
      const pathToImport = path.resolve(
         path.dirname(data.configPath),
         data.baseUrl,
         data.prefixPath.replace(regex.oneAsteriskAtTheEnd, '')
      );
      const suffix = path
         .relative(pathToImport, data.file.fsPath)
         .replace(new RegExp(`${path.extname(data.file.fsPath)}$`), '');
      return path.join(data.prefix, suffix.replace(/index$/, '')).replace(/\\/g, '/');
   }
}
