# ripcord

project scaffolding and opinion enforcer!

## what

what does `ripcord` _really_ do? it:

- deploys a set of [counsel](https://github.com/cdaringe/counsel) rules, on request
- enforces those rules, on request
- exposes tooling for report generation

what rules & opinions does ripcord apply? see [module.exports.rules](https://github.com/cdaringe/ripcord/blob/master/src/index.js), or below for a high level summarizations.

## usage

to apply `ripcord` to your project, from the project root, run:

`npm install --save-dev ripcord`

immediately on install, ripcord will inject its rules into your project.  what else can it do?

`node_modules/.bin/ripcord --help`

pro tip: you can `[sudo] npm i -g ripcord` and run `ripcord [cmd]` in your project _after_ you have installed it locally, and just run `ripcord` from the project root.  Even if there's a version mismatch, fear-not, your locally installed version will be run!

## applied opinions & actions

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
