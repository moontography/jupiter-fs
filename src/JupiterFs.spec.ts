import assert from 'assert'
import fs from 'fs'
import path from 'path'
import JupiterFs from './JupiterFs'

/**
 * TODO TODO TODO TODO TODO TODO
 * need to run tests against locally spun up node/testnet so we're not
 * polluting accounts and data on mainnet
 */
describe('JupiterFs', function() {
  this.timeout(5000)

  // const fs = JupiterFs({ server: 'http://localhost:7876' })
  const jupFs = JupiterFs({
    server: 'https://jpr4.gojupiter.tech',
    address: '',
    passphrase: '',
  })

  describe('#newBinaryAddress()', function() {
    it(`should get a new JUP address from a passphrase`, async () => {
      const info = await jupFs.newBinaryAddress()
      assert.strictEqual(info.address.slice(0, 4), 'JUP-')
    })
  })

  describe('#getOrCreateBinaryAddress()', function() {
    it(`should get the binary address info to store file data`, async function() {
      const addy = await jupFs.getOrCreateBinaryAddress()
      // console.log('ADDY', addy)
      assert.strictEqual(typeof addy.address === 'string', true)
    })
  })

  describe('#ls()', function() {
    it(`should fetch a list of files for a jupiter account`, async () => {
      const files = await jupFs.ls()
      // console.log('FILES', files)
      assert.strictEqual(files instanceof Array, true)
    })
  })

  describe('#writeFile()', function() {
    this.timeout(10000)

    it(`should write a file to a jupiter account without error`, async () => {
      const fileData = await fs.promises.readFile(
        path.join(__dirname, 'JupiterFs.ts'),
        { encoding: null }
      )
      const res = await jupFs.writeFile(
        'JupiterFs.ts',
        fileData,
        (err: Error) => console.error(`Error writing file`, err)
      )
      assert.strictEqual(res.fileName, 'JupiterFs.ts')
      assert.strictEqual(res.txns.length > 0, true)
    })
  })

  describe('#getFile()', function() {
    it(`should get the binary data for a file specified`, async () => {
      const fileData = await jupFs.getFile({ name: `JupiterFs.ts` })
      await fs.promises.writeFile(
        path.join(__dirname, 'JupiterFs.ts'),
        fileData
      )
      assert.strictEqual(fileData instanceof Buffer, true)
      assert.strictEqual(fileData.length > 0, true)
    })
  })
})
