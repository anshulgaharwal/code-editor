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

const highlightCppCode = (source) => {
  let html = "";
  let lastIndex = 0;

  source.replace(cppHighlightRegex, (match, ...args) => {
    const groups = args.at(-1);
    const matchIndex = args.at(-3);

    html += escapeHtml(source.slice(lastIndex, matchIndex));

    if (groups.comment) {
      html += `<span class="token-comment">${escapeHtml(match)}</span>`;
    } else if (groups.string || groups.char) {
      html += `<span class="token-string">${escapeHtml(match)}</span>`;
    } else if (groups.directive) {
      html += `<span class="token-directive">${escapeHtml(match)}</span>`;
    } else if (groups.header) {
      html += `<span class="token-header">${escapeHtml(match)}</span>`;
    } else if (groups.keyword) {
      html += `<span class="token-keyword">${escapeHtml(match)}</span>`;
    } else if (groups.type) {
      html += `<span class="token-type">${escapeHtml(match)}</span>`;
    } else if (groups.number) {
      html += `<span class="token-number">${escapeHtml(match)}</span>`;
    } else if (groups.namespace) {
      html += `<span class="token-namespace">${escapeHtml(match)}</span>`;
    } else if (groups.function) {
      html += `<span class="token-function">${escapeHtml(match)}</span>`;
    } else {
      html += escapeHtml(match);
    }

    lastIndex = matchIndex + match.length;
    return match;
  });

  html += escapeHtml(source.slice(lastIndex));

  return html || " ";
};
