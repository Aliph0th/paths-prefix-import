import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
   const disposable = vscode.commands.registerCommand('paths-prefix-import.helloWorld', () => {
      vscode.window.showInformationMessage('Hello World from Paths Prefix Import!');
   });

   context.subscriptions.push(disposable);
}

export function deactivate() {}
