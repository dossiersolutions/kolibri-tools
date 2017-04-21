# kolibri-update-dependencies

This repository contains the `kolibri-update-dependencies` script, which automatically fills in `package.json` based on local `dependencies.local.js` files, which in turn may require modules, automatically including their dependencies as well.

### The problem

- We want to split the Kolibri JavaScript codebase beween several folders within `ProFile/trunk` (called modules) in order to be able to share code between different frontend projects.
- We want to be able to use a single webpack-dev-server to hot reload code from several modules
- We want each different module to be able to have external npm dependencies, which would then be included by any other module depending on this module

`package.json` does not support requiring local folders as packages without copying them to `node_modules` or using the `link` feature. In other words there is no easy way to share dependencies between the kolibri modules, without invoking npm packaging and versioning.

### The solution

Although it is a bit hacky, we can use a script to automatically fill in packages into `package.json` based on a separate `dependencies.local.js` file at the root of each module. This file can contain npm dependencies as well as a list of local module dependencies, whose own `dependencies.local.js` will be consulted.

Here is an example `dependencies.local.js`:

```javascript
module.exports = {
  subprojectDependencies: [
    "../dfr-kolibri-core"
  ],
  npmDependencies: {
    "babel-preset-es2015": "^6.16.0"
  }
};
```
