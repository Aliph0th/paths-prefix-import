import { Uri, workspace } from 'vscode';
import { ConfigPrefix, ExportToken, ParsingToken } from './types';
import { Notifier } from './notifier';
import path from 'path';
import { checkExports, regex } from './regex';
import JSON5 from 'json5';

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
                  configPath: config.fsPath,
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
      const prefixedFiles: Uri[] = [];
      for (const config of configs) {
         for (const pathPrefix in config.paths) {
            let prefixedFilesPath: string = path.join(
               path.dirname(config.configPath),
               config.baseUrl,
               config.paths[pathPrefix][0]
            );
            prefixedFilesPath += `${
               prefixedFilesPath.match(regex.oneAsteriskAtTheEnd)
                  ? path.join('*', '*')
                  : `${path.sep}*`
            }.ts`;
            const files = await this.findFiles(prefixedFilesPath);
            prefixedFiles.push(
               ...files.filter(file =>
                  prefixedFiles.every(prefixedFile => prefixedFile.fsPath !== file.fsPath)
               )
            );
         }
      }
      return prefixedFiles;
   }

   async parseExportTokens(files: Uri[]) {
      const tokens: ExportToken[] = [];
      for (const file of files) {
         const code = (await workspace.fs.readFile(file)).toString();
         const parsingResult = checkExports(code);
         if (parsingResult.length) {
            tokens.push({
               file,
               exports: parsingResult
            });
         }
      }
      return tokens;
   }
}
