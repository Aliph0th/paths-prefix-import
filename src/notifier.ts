import { window } from 'vscode';

export class Notifier {
   static error(message: string) {
      window.showErrorMessage(message);
   }
   static warn(message: string) {
      window.showWarningMessage(message);
   }
}
