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
const buffer = await jupFs.getFile({ transaction: '1234567890' })
// NOTE that if you fetch a file by name and there are multiple files
// with the same name, jupiter-fs will get the first one it finds and
// stop looking. Therefore, you should name files distinctly and/or
// use the transaction ID to fetch paticular files since it's
// guaranteed to be unique per file.
```

# Tips w/ cryptocurrency

I love FOSS (free and open source software) and for the most part don't want to charge for the software I build. It does however take a good bit of time keeping up with feature requests and bug fixes, so if you have the desire and ability to send me a free coffee, it would be greatly appreciated!

- Bitcoin (BTC): `3D779dP5SZo4szHivWHyFd6J2ESumwDmph`
- Ethereum (ETH and ERC-20 tokens): `0xF3ffa9706b3264EDd1DAa93D5F5D70C8f71fAc99`
- Stellar (XLM): `GACH6YMYFZ574FSGCV7IJXTGETEQL3DLQK64Z6DFGD57PZL5RH6LYOJT`
- Jupiter (JUP) mainnet: `JUP-TUWZ-4B8Z-9REP-2YVH5`
