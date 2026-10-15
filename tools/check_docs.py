"""Check local links and path mentions in README.md and docs/*.md.

Relative paths resolve from the containing Markdown file. Checks Markdown links,
reference-link definitions, HTML href/src attributes, and bare/inline-code file
or directory paths (including fenced source listings and shell commands).
External URLs are skipped; URL fragments do not affect file existence checks.
"""
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
LINK = re.compile(r"!?\[[^\]\n]*\]\(\s*(<[^>]+>|[^\s)]+)(?:\s+[^)]*)?\)")
DEFINITION = re.compile(r"^\s{0,3}\[[^\]\n]+\]:\s*(<[^>]+>|\S+)", re.MULTILINE)
HTML = re.compile(r"\b(?:href|src)\s*=\s*['\"]([^'\"]+)['\"]", re.IGNORECASE)
URL = re.compile(r"\b[A-Za-z][A-Za-z0-9+.-]*://[^\s<>`]*")
PYTHON_MODULE = re.compile(r"\bpython\s+-m\s+([\w.]+)")
PATH = re.compile(
    r"(?<![\w:/.+-])(?:"
    r"(?:\.{1,2}/)?(?:[\w.-]+/)*[\w-]+(?:\.[\w-]+)*\.[A-Za-z][\w-]*"
    r"|(?:\.{1,2}/)?(?:[\w.-]+/)+(?![\w./-])"
    r")(?![\w.-])"
)
CODE = re.compile(r"`([^`\n]+)`")


def references(text):
    """Yield (offset, target) without scanning URLs as bare paths."""
    masked = list(text)
    for pattern in (LINK, DEFINITION, HTML):
        for match in pattern.finditer(text):
            yield match.start(), match.group(1).strip("<>")
            masked[match.start():match.end()] = " " * (match.end() - match.start())
    for match in URL.finditer(text):
        masked[match.start():match.end()] = " " * (match.end() - match.start())
    for match in PYTHON_MODULE.finditer(text):
        start, end = match.span(1)
        masked[start:end] = " " * (end - start)
    remainder = "".join(masked)
    for match in PATH.finditer(remainder):
        yield match.start(), match.group()
    # Extensionless file names can also be explicitly named in inline code.
    for match in CODE.finditer(remainder):
        if match.group(1) in {"LICENSE", "README", "Makefile", "Dockerfile"}:
            yield match.start(), match.group(1)


def check(root):
    root = root.resolve()
    documents = [root / "README.md", *sorted((root / "docs").glob("*.md"))]
    checked = set()
    errors = []
    for document in documents:
        if not document.is_file():
            errors.append(f"Missing document: {document}")
            continue
        text = document.read_text(encoding="utf-8")
        for offset, target in references(text):
            url = urlsplit(target)
            if url.scheme or url.netloc:
                continue
            relative = unquote(url.path)
            if not relative:  # An anchor-only link refers to this document.
                relative = document.name
            candidate = (document.parent / relative).resolve()
            key = (document, relative)
            if key in checked:
                continue
            checked.add(key)
            try:
                candidate.relative_to(root)
            except ValueError:
                problem = "escapes repository"
            else:
                exists = candidate.is_dir() if relative.endswith("/") else candidate.is_file()
                problem = None if exists else "missing file or directory"
            if problem:
                line = text.count("\n", 0, offset) + 1
                errors.append(f"{document.relative_to(root)}:{line}: {target} ({problem})")
    return documents, checked, errors


if __name__ == "__main__":
    documents, checked, errors = check(ROOT)
    for error in errors:
        print(error)
    print(f"Checked {len(documents)} documents, {len(checked)} unique local path references: "
          f"{len(errors)} errors.")
    raise SystemExit(bool(errors))
