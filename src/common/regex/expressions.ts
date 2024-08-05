export const oneAsteriskAtTheEnd = /[^*][*]$/gm;
export const hasFileExtensionAtTheEnd = /(?:\.ts|\.js)$/gi;
export const splitter = /\s*,\s*/gm;
export const alias = /\w+\s*as\s*/gm;
export const indexFile = /index.(ts|js)/g;

export const importStatement =
   /^\s*import\s*{\s*(?<names>[\w ,]+)}\s*from\s*(['"])(?<path>[\w\/\\.]*)\2/gm;

export const checkExpressions = [
   // export (class | interface | let | var | const | enum | type | function | function*) EntityName;
   /^\s*export\s+(class|interface|let|var|const|enum|type|function)\s*\*?\s*(?<names>\w+)/gm,

   // export { EntityName1, EntityName2 };
   /^\s*export\s*\{\s*(?<names>\w+(?:\s*,\s*\w+)*),*\s*\}/gm,

   // export * from 'path/to/file';
   /^\s*export\s*(?<names>\*)\s*from\s*(['"])(?<path>[\w\/\\.-]*)\2/gm,

   // export { EntityName, EntityName2 as EntityName3 } from 'path/to/file';
   /^\s*export\s*{\s*(?<names>[\w ,]+)}\s*from\s*(['"])(?<path>[\w\/\\.]*)\2/gm
];
