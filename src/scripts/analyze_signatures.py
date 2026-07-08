import re

signatures_path = "/home/kali/Desktop/Desktop_folders/github/Chrome_Extensions/Website_Scanner/src/scripts/techSignatures.js"

with open(signatures_path, 'r') as f:
    content = f.read()

# Find all occurrences of name: '...' or name: "..."
names = re.findall(r"name:\s*['\"]([^'\"]+)['\"]", content)
print("Total technologies:", len(names))
print("List of names:")
for name in sorted(list(set(names))):
    print(f" - {name}")
