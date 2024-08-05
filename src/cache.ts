import { CompletionDataItem, ExportToken } from './common/types';

export class Cache {
   private exports: ExportToken[] = [];

   get length() {
      return this.exports.length;
   }

   push(exports: ExportToken[]) {
      this.exports.push(...exports);
   }

   lookFor(text: string) {
      const regex = new RegExp(text, 'gi');
      return this.exports.reduce<CompletionDataItem[]>((items, { exports, ...item }) => {
         const matches = exports.filter(exportItem => regex.test(exportItem));
         items.push(...matches.map(match => ({ token: match, ...item })));
         return items;
      }, []);
   }

   invalidate() {
      this.exports = [];
   }
}
