import { Uri } from 'vscode';

export type ParsingToken = {
   names: string[];
   exportPath?: string;
};

export type PrefixConfig = {
   configFile: Uri;
   baseUrl: string;
   paths: {
      [path: string]: [string];
   };
};

export type PrefixedFile = {
   files: Uri[];
   configPath: string;
   prefix: string;
   prefixPath: string;
   baseUrl: string;
};

export type ExportToken = {
   file: Uri;
   exports: string[];
} & Omit<PrefixedFile, 'files'>;

export type CompletionDataItem = {
   token: string;
} & Omit<ExportToken, 'exports'>;
