# contributing

- this project uses Microsoft TypeScript.  if you are editing `.ts`, be mindful that they must be compiled.  simply running `tsc --watch` or `node_modules/.bin/tsc --watch` will fire off the compiler and auto-watch the ts files.  fear not, the compiled files include source maps, so you can debug the TypeScript content naturally.
- if you do not have editor preference, it is recommended to use `VSCode`.  this package bundles some helpful workspace settings:
  - easy debug using the pre-defined launch tasks
  - debug using the built source maps
  - hide .js and .map files from the source tree.

