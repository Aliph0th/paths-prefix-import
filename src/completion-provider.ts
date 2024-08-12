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
      return {
         label: data.token,
         kind: vscode.CompletionItemKind.Reference,
         detail: `Import ${data.token}`,
         command: {
            title: 'Auto-import',
            command: 'paths-prefix-import.updateImports',
            arguments: [{ data, document }]
         }
      };
   }
}
