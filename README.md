# ripcord

project scaffolding and opinion enforcer!

## what

what does `ripcord` _really_ do? it:

- deploys a set of [counsel](https://github.com/cdaringe/counsel) rules, on request
- enforces those rules, on request
- exposes tooling for report generation

what rules & opinions does ripcord apply? see [module.exports.rules](https://github.com/cdaringe/ripcord/blob/master/src/index.js).

## usage

to apply `ripcord` to your project, from the project root, run:

`npm install --save-dev ripcord`

immediately on install, ripcord will inject its rules into your project.  what else can
`node_modules/.bin/ripcord --help`

Pro Tip: you can `[sudo] npm i -g ripcord` and run `ripcord [cmd]` in your project _after_ you have installed it, and just run `ripcord` from the project root.  Even if there's a version mismatch, fear-not, your locally installed version will be run!
