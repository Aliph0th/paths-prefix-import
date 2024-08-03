import { StatusBarAlignment, window } from 'vscode';

export class PrefixImport {
   private readonly statusBar = window.createStatusBarItem(StatusBarAlignment.Left);
   constructor() {
      this.statusBar.text = 'Prefixes: 0';
      this.statusBar.show();
   }

   async scanPrefixes() {}
}
