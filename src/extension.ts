import * as vscode from 'vscode';
import { PrefixImport } from './prefix-import';
import { CompletionProvider } from './completion-provider';

let prefixImport: PrefixImport | null = null;
let completionProvider: CompletionProvider | null = null;

export function activate(context: vscode.ExtensionContext) {
   prefixImport = new PrefixImport();
   completionProvider = new CompletionProvider();
   const scanCommand = vscode.commands.registerCommand(
      'path-prefix-import.scan-prefixes',
      prefixImport.scanPrefixes
   );
   const completionItemProvider = vscode.languages.registerCompletionItemProvider(
      ['typescript'],
      completionProvider
   );

   context.subscriptions.push(scanCommand, completionItemProvider);
}

export function deactivate() {
   prefixImport = null;
   completionProvider = null;
}
