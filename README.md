# jupiter-fs

A small file system implementation for the Jupiter blockchain.

## Install

`$ npm install -s jupiter-fs`

## Usage

```ts
import JupiterFs from 'jupiter-fs'

const jupFs = JupiterFs({
  server: 'https://jpr.gojupiter.tech', // Jupiter server
  address, // JUP-XXX-XXX
  passphrase, // Jupiter address passphrase
  encryptSecret, // optional extra alphanumeric string to encrypt file data in addition to normal Jupiter on chain encryption
})

// list all files for an account
const listOfFiles = await jupFs.ls()

// write a new file to the blockchain
await jupFs.writeFile('myFile.txt', Buffer.from('jupToTheMoon'))

// get binary data of file contents
const buffer = await jupFs.getFile({ name: 'myFile.txt' })
// OR
const buffer = await jupFs.getFile({
  id: '123e4567-e89b-42d3-a456-556642440000',
})
// NOTE that if you fetch a file by name and there are multiple files
// with the same name, jupiter-fs will get the first one it finds and
// stop looking. Therefore, you should name files distinctly and/or
// use the file ID to fetch paticular files since it's
// guaranteed to be unique per file. Every file that's stored
// is assigned a UUID in the ID field of the master record you can
// use here if you wish.

// you can also get the file as a Readable stream to pipe to
// or be piped other streams
await readStream = await jupFs.getFileStream({ name: 'myFile.txt' })

// delete the file by providing the file ID (UUID assigned originally)
await jupFs.deleteFile('123e4567-e89b-42d3-a456-556642440000')
```