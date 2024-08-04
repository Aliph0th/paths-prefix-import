import { Uri, workspace } from 'vscode';
import { ConfigPrefix, ExportToken, ParsingToken, PrefixedFile } from './common/types';
import { Notifier } from './notifier';
import path from 'path';
import { checkExports, regex } from './regex';
import JSON5 from 'json5';
import { joinPrefixedFiles } from './common/helpers';

export class Scanner {
   async findFiles(path: string) {
      const relativePath = workspace.asRelativePath(path);
      return await workspace.findFiles(relativePath, '**/node_modules/**', 999999);
   }

   async findConfigs(rootDir: string) {
      const files = await this.findFiles('**/tsconfig*.json');
      const configs: ConfigPrefix[] = [];
      for (const config of files) {
         try {
            const file = await workspace.fs.readFile(config);
            const cfg = JSON5.parse(file.toString());
            if (cfg?.compilerOptions?.paths && cfg?.compilerOptions?.baseUrl) {
               const {
                  compilerOptions: { baseUrl, paths }
               } = cfg;
               configs.push({
                  configFile: config,
                  baseUrl,
                  paths
               });
            }
         } catch (e) {
            Notifier.warn(`Error reading ${config.fsPath}`);
         }
      }
      return configs;
   }

   async findPrefixedFiles(configs: ConfigPrefix[]) {
      let prefixedFiles: PrefixedFile[] = [];
      for (const config of configs) {
         for (const pathPrefix in config.paths) {
            let prefixedFilesPath: string = path.join(
               path.dirname(config.configFile.fsPath),
               config.baseUrl,
               config.paths[pathPrefix][0]
            );
            prefixedFilesPath += `${
               prefixedFilesPath.match(regex.oneAsteriskAtTheEnd)
                  ? path.join('*', '*')
                  : `${path.sep}*`
            }.ts`;
            const files = await this.findFiles(prefixedFilesPath);
            prefixedFiles = joinPrefixedFiles(prefixedFiles, files, config);
         }
      }
      return prefixedFiles;
   }

   async parseExportTokens(prefixedFiles: PrefixedFile[]) {
      const tokens: ExportToken[] = [];
      for (const prefixedFile of prefixedFiles) {
         for (const file of prefixedFile.files) {
            const code = (await workspace.fs.readFile(file)).toString();
            const parsingResult = checkExports(code);
            if (parsingResult.length) {
               tokens.push({
                  file,
                  exports: parsingResult,
                  config: prefixedFile.config
               });
            }
         }
      }
      return tokens;
   }
}
