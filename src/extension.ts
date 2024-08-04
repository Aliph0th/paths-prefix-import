import * as vscode from 'vscode';
import { PrefixImport } from './prefix-import';
import { CompletionProvider } from './completion-provider';
import { Scanner } from './scanner';

let prefixImport: PrefixImport | null = null;
let completionProvider: CompletionProvider | null = null;
let scanner: Scanner | null = null;

export function activate(context: vscode.ExtensionContext) {
   scanner = new Scanner();
   prefixImport = new PrefixImport(scanner);
   completionProvider = new CompletionProvider();
   const scanCommand = vscode.commands.registerCommand('paths-prefix-import.scan-prefixes', () =>
      prefixImport!.scanPrefixes()
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
   scanner = null;
}
