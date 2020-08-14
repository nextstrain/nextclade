#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail
trap "exit" INT

# Removes CSS imports
# Reason: Next.js forbids CSS imports outside `_app.js`.
sed -i.bak '/import "\.\.\/\.\.\/css\/awesomplete\.css";/d' node_modules/auspice/src/components/controls/search.js
sed -i.bak '/import "\.\.\/\.\.\/css\/entropy\.css";/d' node_modules/auspice/src/components/entropy/index.js

# Removes requires for '@extensions' modules from `extensions.js`
# Reason: We don't use extensions and don't want to setup webpack aliases for that.
sed -i.bak '/.*@extensions.*/d' node_modules/auspice/src/util/extensions.js

# Removes references to `window`
# Reason: Next.js prerendering step is performed server-side and does not have access to `window` global
sed -i.bak  's/sidebarOpen: window.innerWidth > controlsHiddenWidth,/sidebarOpen: true,/g' node_modules/auspice/src/reducers/controls.js
sed -i.bak  's/if (window.location.pathname.includes("gisaid")) {/if (false) {/g' node_modules/auspice/src/reducers/controls.js
sed -i.bak  's/width: window.innerWidth,/width: 0,/g' node_modules/auspice/src/reducers/browserDimensions.js
sed -i.bak  's/height: window.innerHeight,/height: 0,/g' node_modules/auspice/src/reducers/browserDimensions.js
sed -i.bak  's/docHeight: window.document.body.clientHeight/docHeight: 0,/g' node_modules/auspice/src/reducers/browserDimensions.js

# Removes warning when `geoResolutions` is undefined in input data
# Reason: We don't use geo resolutions and this warning is irrelevant for our application
sed -i.bak  '/console.warn("JSONs did not include `geoResolutions`");/d' node_modules/auspice/src/actions/recomputeReduxState.js
