# dummy ui build project

- we intentionally do a web build where a devDependency _is_ used in the build
- we intentionally do a build where a dependency _isn't_ used in the build

these are the two cases that can be wonky when doing a web build dep report than a standard nodejs dep report.

here's a physical breakdown of our deps (`tree node_modules`):

```
.
├── dummy-build-pkg
│   ├── index.js
│   └── package.json
├── dummy-pkg
│   ├── index.js
│   ├── node_modules
│   │   └── dummy-pkg-used-dep // (0.0.1)
│   │       ├── index.js
│   │       └── package.json
│   └── package.json
├── dummy-pkg-unused-dep
│   ├── index.js
│   └── package.json
├── dummy-pkg-used-dep // (0.0.2)
│   ├── index.js
│   └── package.json
└── unused-pkg
    ├── index.js
    └── package.json
```

here's a logical dep tree of dep declarations:

```
dependencies:
  unused-pkg
  dummy-pkg-used-dep (v2) [INBUILD]
devDependencies:
  dummy-pkg [INBUILD]
    dummy-pkg-used-dep (v1)[INBUILD]
    dummy-pkg-unused-dep
  dummy-build-pkg
```

in turn, we expect a dep report denoting the following

```csv
NAME,PRODUCTION,REASON
dummy-pkg,TRUE,<root>
dummy-pkg-used-dep,TRUE,dummy-pkg
dummy-pkg-unused-dep,FALSE,dummy-pkg
dumm-build-pkg,FALSE,<root>
```


