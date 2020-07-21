#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail
trap "exit" INT

# Removes import `"../../css/awesomplete.css";` from `search.js`
# Reason: Next.js forbids CSS imports outside `_app.js`.
sed -i.bak '/import "\.\.\/\.\.\/css\/awesomplete\.css";/d' node_modules/auspice/src/components/controls/search.js

# Removes requires for '@extensions' modules from `extensions.js`
# Reason: We don't use extensions and don't want to setup webpack aliases for that.
sed -i.bak '/.*@extensions.*/d' node_modules/auspice/src/util/extensions.js
