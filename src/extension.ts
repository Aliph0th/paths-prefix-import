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
   completionProvider = new CompletionProvider(cache);

   prefixImport = new PrefixImport(context, scanner, cache, completionProvider);

   prefixImport.initSubscriptions();
   prefixImport.initFileWatchers();

   prefixImport.scanPrefixes();
}

export function deactivate() {
   prefixImport = null;
   completionProvider = null;
   scanner = null;
   cache = null;
}
