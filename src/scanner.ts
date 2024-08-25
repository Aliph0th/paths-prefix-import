import JSON5 from 'json5';
import path from 'path';
import { Uri, workspace } from 'vscode';
import { joinPrefixedFiles } from './common/helpers';
import { PrefixConfig, ExportToken, ParsingToken, PrefixedFile } from './common/types';
import { Notifier } from './notifier';
import { checkRegex, regex } from './common/regex';

export class Scanner {
   async findFiles(path: string) {
      const relativePath = workspace.asRelativePath(path);
      return await workspace.findFiles(relativePath, '**/node_modules/**', 999999);
   }

   async readConfig(file: Uri): Promise<PrefixConfig | null> {
      const text = await workspace.fs.readFile(file);
      const config = JSON5.parse(text.toString());
      if (config?.compilerOptions?.paths && config?.compilerOptions?.baseUrl) {
         const {
            compilerOptions: { baseUrl, paths }
         } = config;
         return {
            configFile: file,
            baseUrl,
            paths
         };
      }
      return null;
   }

   async findConfigs() {
      const files = await this.findFiles('**/tsconfig*.json');
      const configs: PrefixConfig[] = [];
      for (const config of files) {
         try {
            const cfg = await this.readConfig(config);
            if (cfg) {
               configs.push(cfg);
            }
         } catch (e) {
            Notifier.warn(`Error reading ${config.fsPath}`);
         }
      }
      return configs;
   }

   async findPrefixedFiles(configs: PrefixConfig[]) {
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
