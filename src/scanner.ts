import JSON5 from 'json5';
import path from 'path';
import { workspace } from 'vscode';
import { joinPrefixedFiles } from './common/helpers';
import { ConfigPrefix, ExportToken, ParsingToken, PrefixedFile } from './common/types';
import { Notifier } from './notifier';
import { checkRegex, regex } from './common/regex';

export class Scanner {
   async findFiles(path: string) {
      const relativePath = workspace.asRelativePath(path);
      return await workspace.findFiles(relativePath, '**/node_modules/**', 999999);
   }

   async findConfigs() {
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
         for (const prefix in config.paths) {
            let prefixedFilesPath: string = path.join(
               path.dirname(config.configFile.fsPath),
               config.baseUrl,
               config.paths[prefix][0]
            );
            prefixedFilesPath += `${
               prefixedFilesPath.match(regex.oneAsteriskAtTheEnd)
                  ? path.join('*', '*')
                  : `${path.sep}*`
            }.ts`;
            const files = await this.findFiles(prefixedFilesPath);
            prefixedFiles = joinPrefixedFiles(prefixedFiles, files, config, prefix);
         }
      }
      return prefixedFiles;
   }

   async parseExportTokens(prefixedFiles: PrefixedFile[]) {
      const tokens: ExportToken[] = [];
      for (const { files, ...prefixedFile } of prefixedFiles) {
         for (const file of files) {
            const code = (await workspace.fs.readFile(file)).toString();
            const parsingResults = this.checkExports(code);
            if (parsingResults.length) {
               tokens.push({
                  file,
                  exports: parsingResults.reduce<string[]>((prev, x) => {
                     prev.push(...x.names);
                     return prev;
                  }, []),
                  ...prefixedFile
               });
            }
         }
      }
      return tokens;
   }

   checkExports(code: string): ParsingToken[] {
      const checks = regex.checkExpressions.map(expression => checkRegex(code, expression));

      return checks.reduce<ParsingToken[]>((prev, curr) => {
         if (curr) {
            prev.push(...curr);
         }
         return prev;
      }, []);
   }
}
