import { Uri } from 'vscode';

export type ParsingToken = {
   names: string[];
   exportPath?: string;
};

export type ConfigPrefix = {
   configPath: string;
   baseUrl: string;
   paths: {
      [path: string]: [string];
   };
};

export type ExportToken = {
   file: Uri;
   exports: ParsingToken[];
};
