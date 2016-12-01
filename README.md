<img src="https://raw.githubusercontent.com/cdaringe/ripcord/master/img/parachute.png" />

# ripcord

project scaffolding, opinion enforcer, and build tooling!

[ ![Codeship Status for cdaringe/ripcord](https://app.codeship.com/projects/8944d7f0-6e6a-0134-4108-3672b74a6b59/status?branch=master)](https://app.codeship.com/projects/177795) [![Coverage Status](https://coveralls.io/repos/github/cdaringe/ripcord/badge.svg?branch=master)](https://coveralls.io/github/cdaringe/ripcord?branch=master) ![](https://img.shields.io/badge/standardjs-%E2%9C%93-brightgreen.svg) [![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)


## install

`npm install --save-dev ripcord`

## what

what does `ripcord` _really_ do?

- :rocket: deploys a set of rules into your project, on request.
  - what are rules? they are _all sorts of things._ business rules, scripts, or even depedencies!
  - see  [counsel](https://github.com/cdaringe/counsel) for more. ripcord uses counsel to apply scaffolding and enforcement.
- :lock: enforces those rules, on request.
- :memo: exposes tooling for report generation!

what rules & opinions does ripcord apply? see [module.exports.rules](https://github.com/cdaringe/ripcord/blob/master/src/index.js), or the below rules section for a high level summarization.

## usage

here are some hypothetical use cases:

- to install `ripcord` rules into to your project, simply install it or update it into your project!
- to manually apply rules, run `ripcord counsel apply`
- to check if ripcord's rules are honored, run `ripcord counsel check`
- to generate a depedency report, run `ripcord report [-o /path/to/report]`

pro tip: if you install ripcord globally (`[sudo] npm i -g ripcord`) _and_ have `ripcord` installed locally, you can simply run `ripcord [cmd]` in your project.  `ripcord` will [detect a local copy](https://github.com/cdaringe/ripcord/blob/ebd59305bb27f92febe69f5760f21c2a1bbc21d5/bin/ripcord#L19) and run that version. rad+!

what else can it do?

`[node_modules/.bin/]ripcord --help`

**api docs** found [here](https://cdaringe.github.io/ripcord/)

## does ripcord dogfood itself?

absolutely. :tada:

## applied rules

- general package validation (on pre-commit)
  - `npm ls` - validate package declaration matches _actual_ package content
  - `ripcord counsel check` - enforce all rules below that implement a `check` method

- security check (on pre-commit)
  - `nsp check` - check pkg deps for vulns

- linting
  - `standard`

- test and coverage
  - enforces `test` task defined. prefers wrapping tests with `nyc` pacakge
  - encourages coverage enforcement on common metrics @90%

- user docs
  - mandates `README.md`

- api docs (onpublish)
  - generate JSDoc pages, themed, published to `gh-pages`

- package publish behavior
  - apply version bumping using npm and git tooling
    - **no manual** version number bumping
  - use git tags/releases
  - e.g. `npm run publish-patch`

- license validation (on pre-commit)
  - assert licenses are _approved_! does not guarantee you've been given permission to use them :)
  - configuration:
    - `"ripcord": { "devOnly": true }` waives license accountability. if your package is for development only, you certify that it will never ship in production

- pre-commit actions
  - summarization of the above
  - on pre-commit: `['validate', 'lint', 'test', 'check-coverage', 'check-licenses', 'secure']`
})

rules can be ignored or overridden per the [counsel-rule docs](https://github.com/cdaringe/counsel/tree/master/packages/counsel-rule).

## tooling

### dependency reporting

generate tripwire dependency report.  operates in two modes:

- node/npm project mode
  - uses your `package.json` depedencies & devDependencies as sole source of external depedencies
- ui build (e.g. webpack build)
  - uses ui build compiler output as declaration of which `dependencies` are used, and uses remaining `devDependencies` as source of external devDependencies
  - see `ripcord report --help` for more info

### rule application and checking

deploy or check  project conventions via counsel. `counsel <apply|check>`

## license checking

check or dump (output) project licenses. only outputs licenses for `dependencies` not `devDependencies` by default.

`licenses [options] <check|dump>`

## npm repo package syncning

sync packages from npm repo to repo. current implementation assumes artifactory API present to successfully copy!

`ripcord sync-packages --help`

## considerations

- [semantic-release](https://github.com/semantic-release/semantic-release)

## development

- this project uses Microsoft TypeScript.  if you are editing `.ts`, be mindful that they must be compiled.  simply running `tsc --watch` or `node_modules/.bin/tsc --watch` will fire off the compiler and auto-watch the ts files.  fear not, the compiled files include source maps, so you can debug the TypeScript content naturally.
- if you do not have editor preference, it is recommended to use `VSCode`.  this package bundles some helpful workspace settings:
  - easy debug using the pre-defined launch tasks
  - debug using the built source maps
  - hide .js and .map files from the source tree.

## yarn compatibility

this modules digs deep into your `node_modules`.  hence, consistent structure and content are imperative for reporting and license features to work.  consequently, we recommend only _officially_ using npm, at least for builds.

## logo

[margdking](https://github.com/margdking)

## todo
- ui build support for license checking
