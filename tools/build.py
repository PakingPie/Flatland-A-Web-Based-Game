"""Dependency-free, deterministic assembly of the offline HTML distributable."""
from pathlib import Path
import argparse

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ["core", "characters", "navigation", "world", "social", "romance", "persistence", "input", "renderer", "game", "social-ui", "bootstrap"]

def build():
    source = ROOT / "src"
    parts = []
    for name in SOURCES:
        path = source / (name + ".js")
        parts.append("// ---- " + name + ".js ----\n" + path.read_text(encoding="utf-8"))
    script = "'use strict';\n(() => {\n" + "\n".join(parts) + "\n})();"
    if "</script" in script.lower():
        raise ValueError("JavaScript contains a literal closing script tag")
    return source.joinpath("shell.html").read_text(encoding="utf-8").replace("/*__STYLE__*/", source.joinpath("style.css").read_text(encoding="utf-8")).replace("/*__SCRIPT__*/", script)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Fail if the committed build is stale")
    args = parser.parse_args()
    target = ROOT / "the-flatland.html"
    result = build()
    if args.check:
        if not target.exists() or target.read_text(encoding="utf-8") != result:
            raise SystemExit("Build is stale. Run python tools/build.py")
        print("Build matches source.")
    else:
        target.write_text(result, encoding="utf-8", newline="\n")
        print(f"Built {target.name}: {len(result.encode('utf-8')):,} bytes")
