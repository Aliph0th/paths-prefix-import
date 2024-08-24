import { Cache } from './cache';
import {
   CancellationToken,
   CompletionContext,
   CompletionItem,
   CompletionItemProvider,
   CompletionList,
   Position,
   ProviderResult,
   TextDocument
} from 'vscode';
import * as vscode from 'vscode';
import { CompletionDataItem } from './common/types';
import path from 'path';
import { regex } from './common/regex';

export class CompletionProvider implements CompletionItemProvider {
   constructor(private readonly cache: Cache) {}
   provideCompletionItems(
      document: TextDocument,
      position: Position,
      token: CancellationToken,
      context: CompletionContext
   ): ProviderResult<CompletionItem[] | CompletionList<CompletionItem>> {
      const range = document.getWordRangeAtPosition(position);
      const textToComplete = range ? document.getText(new vscode.Range(range.start, position)) : '';

      const uriWorkspace = vscode.workspace.getWorkspaceFolder(document.uri);
      const completionsData = this.cache.lookForCompletions(textToComplete, uriWorkspace);
      return completionsData.map(item => this.buildCompletion(item, document));
   }

   private buildCompletion(data: CompletionDataItem, document: TextDocument): CompletionItem {
      const importPath = this.buildCompletionPath(data);
      return {
         label: data.token,
         kind: vscode.CompletionItemKind.Reference,
         detail: `Add import from ${importPath}`,
         command: {
            title: 'Auto-import',
            command: 'paths-prefix-import.updateImports',
            arguments: [{ data, document, importPath }]
         }
      };
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
