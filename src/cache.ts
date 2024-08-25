import path from 'path';
import { Uri, workspace, WorkspaceFolder } from 'vscode';
import { CompletionDataItem, ExportToken, PrefixConfig } from './common/types';
import wcmatch from 'wildcard-match';
import { regex } from './common/regex';

export class Cache {
   private exports: ExportToken[] = [];
   private configs: PrefixConfig[] = [];

   get length() {
      return this.exports.reduce((prev, token) => (prev += token.exports.length), 0);
   }

   isFileAffected(file: Uri) {
      for (const config of this.configs) {
         for (const [prefix, [pathWildcard]] of Object.entries(config.paths)) {
            const pathPattern =
               path
                  .resolve(path.dirname(config.configFile.fsPath), config.baseUrl, pathWildcard)
                  .replaceAll('\\', '/') +
               `${pathWildcard.match(regex.oneAsteriskAtTheEnd) ? '*' : `${path.sep}*`}`;
            if (wcmatch(pathPattern)(file.fsPath.replaceAll('\\', '/'))) {
               return {
                  baseUrl: config.baseUrl,
                  configPath: config.configFile.fsPath,
                  prefixPath: pathWildcard,
                  prefix
               };
            }
         }
      }
      return false;
   }

   pushTokens(exports: ExportToken[]) {
      for (const exportToken of exports) {
         const existingExport = this.exports.find(
            exp => exp.file.fsPath === exportToken.file.fsPath
         );
         if (existingExport) {
            existingExport.exports.push(...exportToken.exports);
            existingExport.exports = [...new Set(existingExport.exports)];
         } else {
            this.exports.push(exportToken);
         }
      }
   }

   pushConfigs(configs: PrefixConfig[]) {
      for (const config of configs) {
         const existingConfig = this.configs.find(
            prefixConfig => prefixConfig.configFile.fsPath === config.configFile.fsPath
         );
         if (existingConfig) {
            existingConfig.paths = { ...existingConfig.paths, ...config.paths };
         } else {
            this.configs.push(config);
         }
      }
   }

   findTokenByFile(file: Uri) {
      const index = this.exports.findIndex(exportToken => exportToken.file.fsPath === file.fsPath);
      return { exportToken: this.exports[index], index };
   }

   findConfigByFile(file: Uri) {
      const index = this.configs.findIndex(config => config.configFile.fsPath === file.fsPath);
      return { config: this.configs[index], index };
   }

   replaceExportsByIndex(index: number, exports: string[]) {
      this.exports[index].exports = exports;
   }

   replaceConfigByIndex(index: number, config: PrefixConfig) {
      this.configs[index] = config;
   }

   lookForCompletions(text: string, uriWorkspace: WorkspaceFolder | undefined) {
      const regex = new RegExp(text, 'gi');
      return this.exports.reduce<CompletionDataItem[]>((items, { exports, ...item }) => {
         const matches = exports.filter(exportItem => regex.test(exportItem));
         items.push(
            ...matches
               .map(match => ({ token: match, ...item }))
               .filter(
                  dataItem =>
                     workspace.getWorkspaceFolder(dataItem.file)?.index === uriWorkspace?.index ||
                     uriWorkspace === undefined
               )
         );
         return items;
      }, []);
   }

   invalidateForFile(file: Uri) {
      this.exports = this.exports.filter(exportToken => exportToken.file.fsPath !== file.fsPath);
   }

   invalidateForConfigFile(file: Uri) {
      this.exports = this.exports.filter(exportToken => exportToken.configPath !== file.fsPath);
   }
}
