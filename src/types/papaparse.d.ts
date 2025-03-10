declare module 'papaparse' {
  export interface ParseConfig {
    delimiter?: string;
    newline?: string;
    quoteChar?: string;
    escapeChar?: string;
    header?: boolean;
    dynamicTyping?: boolean;
    preview?: number;
    encoding?: string;
    worker?: boolean;
    comments?: boolean | string;
    download?: boolean;
    skipEmptyLines?: boolean | 'greedy';
    fastMode?: boolean;
    withCredentials?: boolean;
    delimitersToGuess?: string[];
    chunk?: (results: ParseResult<any>, parser: Parser) => void;
    complete?: (results: ParseResult<any>, file: File) => void;
    beforeFirstChunk?: (chunk: string) => string | void;
    transform?: (value: string, field: string | number) => any;
    error?: (error: ParseError, file: File) => void;
  }

  export interface ParseResult<T> {
    data: T[];
    errors: ParseError[];
    meta: {
      delimiter: string;
      linebreak: string;
      aborted: boolean;
      truncated: boolean;
      cursor: number;
      fields?: string[];
    };
  }

  export interface ParseError {
    type: string;
    code: string;
    message: string;
    row: number;
    index: number;
  }

  export class Parser {
    abort: () => void;
  }

  export function parse<T = any>(input: string | File, config?: ParseConfig): ParseResult<T>;
  export function unparse<T = any>(data: T[], config?: any): string;

  export default {
    parse,
    unparse,
  };
}
