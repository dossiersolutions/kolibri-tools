const fs   = require("fs");
const path = require("path");

function fatalError(msg) {
  console.log(
    "===\n" +
    "ERROR (kolibri-update-dependencies):\n" +
    msg + "\n" +
    "==="
  );
  process.exit(1);
}

function validateFileExists(path, message) {
  if (!fs.existsSync(path)) {
    fatalError(
      path + " does not exist.\n" +
      message + "\n"
    );
  }
}

function resolveDeps(subprojectPath, resolvedDeps, importOrigins, importedSubprojects) {
  const localDepConfPath = path.resolve(path.join(subprojectPath, "dependencies.local.js"));
  validateFileExists(localDepConfPath, "Dependency file missing.");

  if (importedSubprojects[subprojectPath]) {
    return;
  }
  importedSubprojects[subprojectPath] = true;

  const localDepConf = require(localDepConfPath);

  ["subprojectDependencies", "npmDependencies"].forEach((key) => {
    if (localDepConf[key] == undefined) {
      fatalError("Key missing from " + localDepConfPath + ": " + key);
    }
  });

  const subprojectDependencies = localDepConf.subprojectDependencies;
  const npmDependencies        = localDepConf.npmDependencies;

  subprojectDependencies.forEach((path) => resolveDeps(path, resolvedDeps, importOrigins, importedSubprojects));

  Object.keys(npmDependencies).forEach((name) => {
    if (resolvedDeps[name]) {
      fatalError(
        "The npm package \"" + name + "\", required by " + subprojectPath +
        "/dependencies.local.js was already included by " + importOrigins[name] + "/dependencies.local.js." +
        " kolibri-update-dependencies does not perform dependency resolution, " +
        " and dependencies may only be included in one place."
      );
    }
    resolvedDeps[name]  = npmDependencies[name];
    importOrigins[name] = subprojectPath;
  });


  return resolvedDeps;
}

validateFileExists("package.json", "Working directory is not an npm package.");
const oldPackageJson = JSON.parse(fs.readFileSync(path.resolve("package.json")), "utf-8");

const resolvedDeps = resolveDeps(".", {}, {}, {});

if (oldPackageJson.devDependencies) {
  oldPackageJson.devDependencies.forEach(() =>
    fatalError(
      "devDependencies found in package.json. All dependencies should be \n" +
      "added as regular dependencies, otherwise they will be ignored on jenkins, \n" +
      "where NODE_ENV=production. Webpack will still only bundle the imported packages."
    )
  );
}

if (oldPackageJson.dependencies) {
  Object.keys(oldPackageJson.dependencies).forEach((name) => {
    if (!resolvedDeps[name]) {
      console.log(
        "WARNING: removing unused dependency from package.json: " + name + "\n" +
        "If this is a mistake, please re-add this dependency to dependencies.local.js " +
        " rather than package.json."
      );
    }
  });
}

const newPackageJson = Object.assign(
  {
    "//": [
      "IMPORTANT: This file is automatically updated by kolibri-update-dependencies.",
      "If you need to add npm dependencies, then you should add them to the appropriate",
      "dependencies.local.js file rather than here. However, all of the other fields in",
      "this file will be preserved during auto update, so you can still add scripts etc."
    ]
  },
  oldPackageJson,
  {
    dependencies: resolvedDeps
  }
);

fs.writeFileSync(path.resolve("package.json"), JSON.stringify(newPackageJson, null, 2));
