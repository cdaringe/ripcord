<img src="https://raw.githubusercontent.com/cdaringe/ripcord/master/img/parachute.png" />

# deprecated

ripcord functions are being migrated out of ripcord and into independent utilities.

# ripcord

project scaffolding and build tooling.

[ ![Codeship Status for cdaringe/ripcord](https://app.codeship.com/projects/8944d7f0-6e6a-0134-4108-3672b74a6b59/status?branch=master)](https://app.codeship.com/projects/177795) [![Coverage Status](https://coveralls.io/repos/github/cdaringe/ripcord/badge.svg?branch=master)](https://coveralls.io/github/cdaringe/ripcord?branch=master) ![](https://img.shields.io/badge/standardjs-%E2%9C%93-brightgreen.svg) [![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release) [![Greenkeeper badge](https://badges.greenkeeper.io/cdaringe/ripcord.svg)](https://greenkeeper.io/)



## install

`npm install --save-dev ripcord`

## usage

**api docs** found [here](https://cdaringe.github.io/ripcord/)

### reporting

generate dependency report.  operates in two modes:

- node mode
  - uses your `package.json` depedencies & devDependencies as sole source of depedencies
- ui build
  - uses ui build compiler output as declaration of which `dependencies` are used, and uses remaining `devDependencies` as source of external devDependencies.
    - currently only supports webpack

### license checking

check or dump (output) project licenses. only outputs licenses for `dependencies` not `devDependencies` by default.

`licenses [options] <check|dump>`

### npm repo package syncning

sync packages from npm repo to repo. current implementation assumes artifactory API present to successfully copy!

`ripcord sync-packages --help`


## logo

[margdking](https://github.com/margdking)

## todo
- ui build support for license checking
