const cppWords = [
  "alignas",
  "alignof",
  "and",
  "and_eq",
  "asm",
  "atomic_cancel",
  "atomic_commit",
  "atomic_noexcept",
  "auto",
  "bitand",
  "bitor",
  "bool",
  "break",
  "case",
  "catch",
  "char",
  "char8_t",
  "char16_t",
  "char32_t",
  "class",
  "compl",
  "concept",
  "const",
  "consteval",
  "constexpr",
  "constinit",
  "const_cast",
  "continue",
  "co_await",
  "co_return",
  "co_yield",
  "decltype",
  "default",
  "delete",
  "do",
  "double",
  "dynamic_cast",
  "else",
  "enum",
  "explicit",
  "export",
  "extern",
  "false",
  "final",
  "first",
  "float",
  "for",
  "friend",
  "goto",
  "if",
  "import",
  "include",
  "inline",
  "int",
  "iostream",
  "long",
  "main",
  "module",
  "mutable",
  "namespace",
  "new",
  "noexcept",
  "not",
  "not_eq",
  "nullptr",
  "operator",
  "or",
  "or_eq",
  "override",
  "private",
  "protected",
  "public",
  "register",
  "reinterpret_cast",
  "requires",
  "return",
  "second",
  "short",
  "signed",
  "sizeof",
  "static",
  "static_assert",
  "static_cast",
  "std",
  "struct",
  "switch",
  "template",
  "this",
  "thread_local",
  "throw",
  "true",
  "try",
  "typedef",
  "typeid",
  "typename",
  "union",
  "unsigned",
  "using",
  "virtual",
  "void",
  "volatile",
  "wchar_t",
  "while",
  "xor",
  "xor_eq",
];

const cppPrimitiveTypes = [
  "bool",
  "char",
  "char8_t",
  "char16_t",
  "char32_t",
  "double",
  "float",
  "int",
  "long",
  "short",
  "signed",
  "string",
  "unsigned",
  "void",
  "wchar_t",
];

const cppTypeWords = [
  ...cppPrimitiveTypes,
  "size_t",
  "string",
  "vector",
  "queue",
  "stack",
  "deque",
  "map",
  "unordered_map",
  "set",
  "unordered_set",
  "multiset",
  "pair",
];

const cppKeywordWords = cppWords.filter(
  (word) =>
    !cppTypeWords.includes(word) &&
    !["std", "include", "iostream"].includes(word),
);

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const createTrieNode = () => ({
  children: {},
  isWord: false,
  word: "",
});

const insertWordIntoTrie = (root, word) => {
  let node = root;

  for (const character of word.toLowerCase()) {
    if (!node.children[character]) {
      node.children[character] = createTrieNode();
    }

    node = node.children[character];
  }

  node.isWord = true;
  node.word = word;
};

const buildTrie = (words) => {
  const root = createTrieNode();

  words.forEach((word) => {
    insertWordIntoTrie(root, word);
  });

  return root;
};

const collectTrieWords = (node, suggestions, limit) => {
  if (suggestions.length >= limit) {
    return;
  }

  if (node.isWord) {
    suggestions.push(node.word);
  }

  const keys = Object.keys(node.children).sort();

  for (const key of keys) {
    collectTrieWords(node.children[key], suggestions, limit);

    if (suggestions.length >= limit) {
      return;
    }
  }
};

const getTrieSuggestions = (root, prefix, limit = 8) => {
  const normalizedPrefix = prefix.toLowerCase();
  let node = root;

  for (const character of normalizedPrefix) {
    if (!node.children[character]) {
      return [];
    }

    node = node.children[character];
  }

  const suggestions = [];
  collectTrieWords(node, suggestions, limit + 1);

  return suggestions.filter((word) => word.toLowerCase() !== normalizedPrefix).slice(0, limit);
};

const cppKeywordTrie = buildTrie(cppWords);
const cppKeywordPattern = cppKeywordWords
  .slice()
  .sort((left, right) => right.length - left.length)
  .map(escapeRegex)
  .join("|");
const cppTypePattern = cppTypeWords
  .slice()
  .sort((left, right) => right.length - left.length)
  .map(escapeRegex)
  .join("|");

const cppHighlightRegex = new RegExp(
  [
    "(?<comment>\\/\\/.*$|\\/\\*[\\s\\S]*?\\*\\/)",
    '(?<string>"(?:\\\\.|[^"\\\\])*")',
    "(?<char>'(?:\\\\.|[^'\\\\])*')",
    "(?<directive>#\\s*[A-Za-z_]\\w*)",
    "(?<header><[A-Za-z0-9_./+-]+>)",
    `(?<keyword>\\b(?:${cppKeywordPattern})\\b)`,
    `(?<type>\\b(?:${cppTypePattern})\\b)`,
    "(?<number>\\b\\d+(?:\\.\\d+)?\\b)",
    "(?<namespace>\\bstd\\b|::)",
    "(?<function>\\b[A-Za-z_]\\w*(?=\\s*\\())",
  ].join("|"),
  "gm",
);

const renderHighlightedSegment = (segment, markedIndexSet, baseIndex, tokenClass = "") => {
  let html = "";

  for (let offset = 0; offset < segment.length; offset += 1) {
    const character = segment[offset];
    const characterIndex = baseIndex + offset;
    const classNames = [];

    if (tokenClass) {
      classNames.push(tokenClass);
    }

    if (markedIndexSet.has(characterIndex)) {
      classNames.push("bracket-match");
    }

    const escapedCharacter = escapeHtml(character);

    if (classNames.length) {
      html += `<span class="${classNames.join(" ")}">${escapedCharacter}</span>`;
    } else {
      html += escapedCharacter;
    }
  }

  return html;
};

const highlightCppCode = (source, markedIndices = []) => {
  let html = "";
  let lastIndex = 0;
  const markedIndexSet = new Set(markedIndices);

  source.replace(cppHighlightRegex, (match, ...args) => {
    const groups = args.at(-1);
    const matchIndex = args.at(-3);

    html += renderHighlightedSegment(
      source.slice(lastIndex, matchIndex),
      markedIndexSet,
      lastIndex,
    );

    if (groups.comment) {
      html += renderHighlightedSegment(match, markedIndexSet, matchIndex, "token-comment");
    } else if (groups.string || groups.char) {
      html += renderHighlightedSegment(match, markedIndexSet, matchIndex, "token-string");
    } else if (groups.directive) {
      html += renderHighlightedSegment(match, markedIndexSet, matchIndex, "token-directive");
    } else if (groups.header) {
      html += renderHighlightedSegment(match, markedIndexSet, matchIndex, "token-header");
    } else if (groups.keyword) {
      html += renderHighlightedSegment(match, markedIndexSet, matchIndex, "token-keyword");
    } else if (groups.type) {
      html += renderHighlightedSegment(match, markedIndexSet, matchIndex, "token-type");
    } else if (groups.number) {
      html += renderHighlightedSegment(match, markedIndexSet, matchIndex, "token-number");
    } else if (groups.namespace) {
      html += renderHighlightedSegment(match, markedIndexSet, matchIndex, "token-namespace");
    } else if (groups.function) {
      html += renderHighlightedSegment(match, markedIndexSet, matchIndex, "token-function");
    } else {
      html += renderHighlightedSegment(match, markedIndexSet, matchIndex);
    }

    lastIndex = matchIndex + match.length;
    return match;
  });

  html += renderHighlightedSegment(source.slice(lastIndex), markedIndexSet, lastIndex);

  return html || " ";
};
