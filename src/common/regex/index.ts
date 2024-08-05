import { ParsingToken } from '../types';
import * as regex from './expressions';

export function checkRegex(code: string, expression: RegExp) {
   const matches = code.matchAll(expression);
   const result: ParsingToken[] = [];
   for (const match of matches) {
      if (match.groups) {
         const token: ParsingToken = {
            names: match.groups.names.trim().replace(regex.alias, '').split(regex.splitter)
         };
         match.groups.path && (token.exportPath = match.groups.path);
         result.push(token);
      }
   }
   return result.length ? result : null;
}

export { regex };
