import { Uri } from 'vscode';

export type ParsingToken = {
   names: string[];
   exportPath?: string;
};

export type ConfigPrefix = {
   configFile: Uri;
   baseUrl: string;
   paths: {
      [path: string]: [string];
   };
};

export type ExportToken = {
   file: Uri;
   exports: ParsingToken[];
   config: ConfigPrefix;
};

export type PrefixedFile = {
   config: ConfigPrefix;
   files: Uri[];
};
