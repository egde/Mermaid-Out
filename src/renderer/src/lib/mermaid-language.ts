import type * as Monaco from 'monaco-editor';

export const MERMAID_LANGUAGE_ID = 'mermaid';
export const MERMAID_THEME_ID = 'mermaid-ink';

let registered = false;

export function registerMermaidLanguage(monaco: typeof Monaco) {
  if (registered) return;
  registered = true;

  monaco.languages.register({
    id: MERMAID_LANGUAGE_ID,
    extensions: ['.mmd', '.mermaid'],
    aliases: ['Mermaid', 'mermaid'],
  });

  monaco.languages.setLanguageConfiguration(MERMAID_LANGUAGE_ID, {
    comments: { lineComment: '%%' },
    brackets: [
      ['[', ']'],
      ['{', '}'],
      ['(', ')'],
    ],
    autoClosingPairs: [
      { open: '[', close: ']' },
      { open: '{', close: '}' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    surroundingPairs: [
      { open: '[', close: ']' },
      { open: '{', close: '}' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
  });

  monaco.languages.setMonarchTokensProvider(MERMAID_LANGUAGE_ID, {
    defaultToken: '',
    tokenPostfix: '.mermaid',

    diagramTypes: [
      'graph', 'flowchart', 'sequenceDiagram', 'classDiagram',
      'stateDiagram', 'stateDiagram-v2', 'erDiagram', 'gantt', 'pie',
      'journey', 'gitGraph', 'mindmap', 'timeline', 'quadrantChart',
      'requirementDiagram', 'sankey', 'xychart-beta', 'block-beta',
    ],

    keywords: [
      'subgraph', 'end', 'direction',
      'participant', 'actor', 'note', 'over', 'right', 'left', 'of',
      'loop', 'alt', 'else', 'opt', 'par', 'and', 'critical', 'break',
      'rect', 'activate', 'deactivate', 'autonumber',
      'class', 'state', 'namespace',
      'section', 'dateFormat', 'axisFormat', 'excludes', 'title',
      'accTitle', 'accDescr',
      'click', 'link', 'callback', 'call', 'href',
      'style', 'classDef', 'linkStyle',
      'TB', 'TD', 'BT', 'RL', 'LR',
    ],

    operators: [
      '-->', '--->', '==>', '===>', '-.->', '-..->',
      '---', '===', '-.-', '-.', '--x', '--o',
      '->', '->>', '-->>', '-x', '--x',
      '>>', '<<', ':::', '::',
    ],

    symbols: /[=><!~?:&|+\-*/^%.]+/,

    tokenizer: {
      root: [
        [/%%.*$/, 'comment'],

        [
          /(sequenceDiagram|classDiagram|stateDiagram-v2|stateDiagram|erDiagram|flowchart|graph|gantt|pie|journey|gitGraph|mindmap|timeline|quadrantChart|requirementDiagram|sankey|xychart-beta|block-beta)\b/,
          'keyword.diagram',
        ],

        [
          /[a-zA-Z_][\w-]*/,
          {
            cases: {
              '@keywords': 'keyword',
              '@default': 'identifier',
            },
          },
        ],

        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/"/, { token: 'string.quote', bracket: '@open', next: '@string_dq' }],
        [/'([^'\\]|\\.)*$/, 'string.invalid'],
        [/'/, { token: 'string.quote', bracket: '@open', next: '@string_sq' }],

        [/\|[^|]*\|/, 'string.label'],

        [/[{}[\]()]/, '@brackets'],

        [
          /(-?\.?-+>+|=+>+|-?\.+->|--[xo]|---+|===+|-\.-)/,
          'operator.arrow',
        ],

        [
          /@symbols/,
          {
            cases: {
              '@operators': 'operator',
              '@default': '',
            },
          },
        ],

        [/\d+(\.\d+)?/, 'number'],
        [/[;,]/, 'delimiter'],
        [/\s+/, 'white'],
      ],

      string_dq: [
        [/[^\\"]+/, 'string'],
        [/\\./, 'string.escape'],
        [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }],
      ],
      string_sq: [
        [/[^\\']+/, 'string'],
        [/\\./, 'string.escape'],
        [/'/, { token: 'string.quote', bracket: '@close', next: '@pop' }],
      ],
    },
  } as Monaco.languages.IMonarchLanguage);

  monaco.editor.defineTheme(MERMAID_THEME_ID, {
    base: 'vs',
    inherit: true,
    rules: [
      { token: '', foreground: '1A1A1A' },
      { token: 'comment', foreground: '808080', fontStyle: 'italic' },
      { token: 'keyword', foreground: '000000', fontStyle: 'bold' },
      { token: 'keyword.diagram', foreground: '000000', fontStyle: 'bold' },
      { token: 'operator.arrow', foreground: '000000', fontStyle: 'bold' },
      { token: 'operator', foreground: '4D4D4D' },
      { token: 'identifier', foreground: '1A1A1A' },
      { token: 'number', foreground: '4D4D4D' },
      { token: 'string', foreground: '4D4D4D' },
      { token: 'string.label', foreground: '4D4D4D', fontStyle: 'italic' },
      { token: 'string.quote', foreground: '4D4D4D' },
      { token: 'delimiter', foreground: '808080' },
    ],
    colors: {
      'editor.background': '#FFFFFF',
      'editor.foreground': '#1A1A1A',
      'editor.lineHighlightBackground': '#F2F2F2',
      'editor.lineHighlightBorder': '#F2F2F2',
      'editorLineNumber.foreground': '#B3B3B3',
      'editorLineNumber.activeForeground': '#000000',
      'editorCursor.foreground': '#000000',
      'editor.selectionBackground': '#D9D9D9',
      'editor.inactiveSelectionBackground': '#F2F2F2',
      'editorIndentGuide.background1': '#F2F2F2',
      'editorIndentGuide.activeBackground1': '#D9D9D9',
      'editorGutter.background': '#FFFFFF',
      'editorWhitespace.foreground': '#D9D9D9',
      'editorBracketMatch.background': '#F2F2F2',
      'editorBracketMatch.border': '#000000',
      'scrollbarSlider.background': '#D9D9D9AA',
      'scrollbarSlider.hoverBackground': '#B3B3B3AA',
      'scrollbarSlider.activeBackground': '#808080AA',
    },
  });
}
