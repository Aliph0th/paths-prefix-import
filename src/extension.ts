import * as vscode from 'vscode';
import { PrefixImport } from './prefix-import';
import { CompletionProvider } from './completion-provider';
import { Scanner } from './scanner';
import { Cache } from './cache';

let prefixImport: PrefixImport | null = null;
let completionProvider: CompletionProvider | null = null;
let scanner: Scanner | null = null;
let cache: Cache | null = null;

export function activate(context: vscode.ExtensionContext) {
   cache = new Cache();
   scanner = new Scanner();
   prefixImport = new PrefixImport(scanner, cache);
   completionProvider = new CompletionProvider(cache);
   const scanCommand = vscode.commands.registerCommand('paths-prefix-import.scan-prefixes', () =>
      prefixImport!.scanPrefixes()
   );
   const updateImports = vscode.commands.registerCommand(
      'paths-prefix-import.updateImports',
      args => {
         prefixImport!.updateImports(args.data, args.document);
      }
   );
   const completionItemProvider = vscode.languages.registerCompletionItemProvider(
      ['typescript'],
      completionProvider
   );

   context.subscriptions.push(scanCommand, completionItemProvider, updateImports);

   prefixImport!.scanPrefixes();
}

export function deactivate() {
   prefixImport = null;
   completionProvider = null;
   scanner = null;
   cache = null;
}
