import { StatusBarAlignment, window, workspace } from 'vscode';
import { Scanner } from './scanner';
import { Notifier } from './notifier';

export class PrefixImport {
   private readonly statusBar = window.createStatusBarItem(StatusBarAlignment.Left);
   private readonly scanner: Scanner;
   constructor(scanner: Scanner) {
      this.scanner = scanner;
      this.statusBar.text = 'Prefixes: 0';
      this.statusBar.show();
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
      console.log(parsedTokens);
   }
}
