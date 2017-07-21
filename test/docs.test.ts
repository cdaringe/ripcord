import * as path from 'path'
const ripcord = require('../') // include to bootstrap ripcord constants
import ava from 'ava'
const docs = require('../src/docs')
const fs = require('fs')
const sinon = require('sinon')

ava('generates & publishes docs', t => {
  t.plan(3)
  const outputDirname = path.join(__dirname, '../docs')
  const stub = sinon.stub(docs, '_ghPublish').returns(() => Promise.resolve())
  return Promise.resolve()
  .then(() => docs._clean())
  .then(() => ripcord.docs(null, { publish: false }))
  .then(() => t.truthy(fs.existsSync(outputDirname), 'docs generated'))
  .then(() => docs.publish())
  .then(() => t.truthy(stub.calledOnce, 'published called once'))
  .then(stub.restore)
  .then(() => t.pass('docs teardown ok'))
  // .then(() => docs._clean()) // publish cleans as part of its cycle, for better or worse
})
