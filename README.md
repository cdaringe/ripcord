<img src="https://raw.githubusercontent.com/cdaringe/ripcord/master/img/parachute.svg" />

# ripcord

project scaffolding and opinion enforcer!

[ ![Codeship Status for cdaringe/ripcord](https://app.codeship.com/projects/8944d7f0-6e6a-0134-4108-3672b74a6b59/status?branch=master)](https://app.codeship.com/projects/177795) ![](https://img.shields.io/badge/standardjs-%E2%9C%93-brightgreen.svg)

## install

`npm install --save-dev ripcord`

pro tip: you can `[sudo] npm i -g ripcord` and run `ripcord [cmd]` in your project _after_ you have installed it locally, and just run `ripcord` from the project root.  Even if there's a version mismatch, fear-not, your locally installed version will be run!

## what

what does `ripcord` _really_ do?

- :rocket: deploys a set of rules into your project, on request.
  - what are rules? they are _all sorts of things._ business rules, scripts, or even depedencies!
  - see  [counsel](https://github.com/cdaringe/counsel) for more. ripcord uses counsel to apply scaffolding and enforcement.
- :lock: enforces those rules, on request.
- :memo: exposes tooling for report generation!

what rules & opinions does ripcord apply? see [module.exports.rules](https://github.com/cdaringe/ripcord/blob/master/src/index.js), or the below rules section for a high level summarization.

## usage

- to install `ripcord` rules into to your project, simply install it or update it!
- to manually apply rules, run `ripcord counsel apply`
- to check if ripcord's rules are honored, run `ripcord counsel check`
- to generate a depedency report, run `ripcord report [-o /path/to/report]`

what else can it do?

`[node_modules/.bin/]ripcord --help`

**api docs** found [here](https://cdaringe.github.io/ripcord/)

## does ripcord dogfood itself?

absolutely. :tada:

## applied rules

- general package validation (on pre-commit)
  - `npm ls` - validate package declaration matches _actual_ package content
  - `ripcord counsel check` - enforce all rules below that implement a `check` method
    - options: `scriptCommandVariants: [/nsm ls/]`

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
    - `"ripcord": { "isOpenSource": true }` waives license accountability as publish gate.

- pre-commit actions
  - summarization of the above
  - on pre-commit: `['validate', 'lint', 'test', 'check-coverage', 'check-licenses', 'secure']`
})

## considerations

- [semantic-release](https://github.com/semantic-release/semantic-release)
