#! /usr/bin/env python3
import sys

search_string = sys.argv[1]
filtered_lines = []
prev_line = None

# First pass to filter lines
for line in sys.stdin:
    if line.startswith('index'):
        if prev_line:
            filtered_lines.append(prev_line)
        filtered_lines.append(line)
    elif search_string in line:
        filtered_lines.append(line)
    prev_line = line

for (i,line) in enumerate(filtered_lines):
    # Print lines with search-string and the two lines before
    if search_string in line:
        for j in range(i-2, i+1):
            sys.stdout.write(filtered_lines[j])
        sys.stdout.write("\n")

