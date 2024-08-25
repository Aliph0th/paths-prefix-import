import { CompletionProvider } from './completion-provider';
import { Cache } from './cache';
import {
   Position,
   Range,
   StatusBarAlignment,
   TextDocument,
   window,
   workspace,
   WorkspaceEdit,
   commands,
   languages,
   ExtensionContext,
   Uri,
   WorkspaceConfiguration
} from 'vscode';
import { Scanner } from './scanner';
import { Notifier } from './notifier';
import { CompletionDataItem, PrefixConfig, PrefixedFile } from './common/types';
import { regex } from './common/regex';
import path from 'path';

export class PrefixImport {
   private readonly statusBar = window.createStatusBarItem(StatusBarAlignment.Left);
   private readonly scanner: Scanner;
   private readonly cache: Cache;
   private readonly context: ExtensionContext;
   private readonly completionProvider: CompletionProvider;

   constructor(
      context: ExtensionContext,
      scanner: Scanner,
      cache: Cache,
      completionProvider: CompletionProvider
   ) {
      this.scanner = scanner;
      this.statusBar.text = '{0}';
      this.statusBar.show();
      this.cache = cache;
      this.context = context;
      this.completionProvider = completionProvider;
   }

   initSubscriptions() {
      const scanCommand = commands.registerCommand('paths-prefix-import.scan-prefixes', () =>
         this.scanPrefixes()
      );
      const updateImports = commands.registerCommand('paths-prefix-import.updateImports', args => {
         this.updateImports(args.data, args.document, args.importPath);
      });
      const completionItemProvider = languages.registerCompletionItemProvider(
         ['typescript'],
         this.completionProvider
      );

      this.context.subscriptions.push(scanCommand, completionItemProvider, updateImports);
   }

   initFileWatchers() {
      const codeWatcher = workspace.createFileSystemWatcher('**/*.ts');
      const configWatcher = workspace.createFileSystemWatcher('**/tsconfig*.json');

      codeWatcher.onDidChange(async (file: Uri) => {
         await this.onChangeFile(file);
         this.statusBar.text = `{${this.cache.length}}`;
      });
      codeWatcher.onDidCreate(async (file: Uri) => {
         await this.onCreateFile(file);
         this.statusBar.text = `{${this.cache.length}}`;
      });
      codeWatcher.onDidDelete((file: Uri) => {
         this.cache.invalidateForFile(file);
         this.statusBar.text = `{${this.cache.length}}`;
      });

      configWatcher.onDidChange(async (file: Uri) => {
         await this.onChangeConfig(file);
         this.statusBar.text = `{${this.cache.length}}`;
      });
      configWatcher.onDidCreate(async (file: Uri) => {
         await this.onCreateConfig(file);
         this.statusBar.text = `{${this.cache.length}}`;
      });
      configWatcher.onDidDelete((file: Uri) => {
         this.cache.invalidateForConfigFile(file);
         this.statusBar.text = `{${this.cache.length}}`;
      });
   }

   async scanPrefixes() {
      const root = workspace.workspaceFolders?.[0];
      if (!root) {
         Notifier.error('Workspace root folder is undefined');
         return;
      }
      const configs = await this.scanner.findConfigs();
      if (configs.length) {
         this.cache.pushConfigs(configs);
      }
      await this.handleConfigs(configs);
   }

   private async handleConfigs(configs: PrefixConfig[]) {
      const prefixedFiles = await this.scanner.findPrefixedFiles(configs);
      const parsedTokens = await this.scanner.parseExportTokens(prefixedFiles);
      if (parsedTokens.length) {
         this.cache.pushTokens(parsedTokens);
         this.statusBar.text = `{${this.cache.length}}`;
      }
   }

   async onChangeConfig(file: Uri) {
      const { config, index } = this.cache.findConfigByFile(file);
      if (!config) {
         return;
      }
      this.cache.invalidateForConfigFile(file);
      const newConfig = await this.scanner.readConfig(file);
      if (!newConfig) {
         return;
      }
      this.cache.replaceConfigByIndex(index, newConfig);
      await this.handleConfigs([newConfig]);
   }

   async onCreateConfig(file: Uri) {
      const config = await this.scanner.readConfig(file);
      if (!config) {
         return;
      }
      this.cache.pushConfigs([config]);
      await this.handleConfigs([config]);
   }

   async onCreateFile(file: Uri) {
      const data = this.cache.isFileAffected(file);
      if (!data) {
         return;
      }
      const prefixedFile: PrefixedFile = {
         files: [file],
         ...data
      };
      const newExportTokens = await this.scanner.parseExportTokens([prefixedFile]);
      this.cache.pushTokens(newExportTokens);
   }

   async onChangeFile(changedFile: Uri) {
      const { exportToken, index } = this.cache.findTokenByFile(changedFile);
      if (!exportToken) {
         return;
      }
      const { file, exports: _, ...data } = exportToken;
      const prefixedFile: PrefixedFile = {
         files: [file],
         ...data
      };

      const newExportTokens = await this.scanner.parseExportTokens([prefixedFile]);
      this.cache.replaceExportsByIndex(index, newExportTokens[0].exports);
   }

   updateImports(data: CompletionDataItem, document: TextDocument, importPath: string) {
      workspace.applyEdit(this.getEdit(data, document, importPath));
   }

   private getEdit(
      data: CompletionDataItem,
      document: TextDocument,
      importPath: string
   ): WorkspaceEdit {
      const edit = new WorkspaceEdit();

      if (!!this.findInImports(document, { searchNames: data.token })) {
         return edit;
      }

      const statement = this.findInImports(document, { searchPath: importPath });
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
      const importArray = importNames.split(/,\s*/).filter(Boolean);
      importArray.push(token);
      const newImport = this.createImportStatement(importArray.join(', '), importPath);

      return documentText.replace(currentStatement, newImport);
   }

   private createImportStatement(token: string, importPath: string, endline = false): string {
      const config = workspace.getConfiguration('paths-prefix-import');
      const spaces = config.get<boolean>('bracketSpacing') ? ' ' : '';
      const quotes = config.get<boolean>('singleQuotes') ? "'" : '"';
      const semicolon = config.get<boolean>('useSemi') ? ';' : '';
      return `import {${spaces}${token}${spaces}} from ${quotes}${importPath}${quotes}${semicolon}${
         endline ? '\r\n' : ''
      }`;
   }

   private findInImports(
      document: TextDocument,
      { searchNames, searchPath }: { searchNames?: string; searchPath?: string }
   ) {
      const matches = document.getText().matchAll(regex.importStatement);
      for (const match of matches) {
         if (searchNames && match.groups?.names.includes(searchNames)) {
            return match[0];
         }
         if (searchPath && match.groups?.path === searchPath) {
            return match[0];
         }
      }
      return null;
   }
}
