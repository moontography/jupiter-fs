import assert from 'assert'
import BigNumber from 'bignumber.js'
import { Readable } from 'stream'
import { v1 as uuidv1 } from 'uuid'
import JupiterClient, { generatePassphrase } from 'jupiter-node-sdk'

export default function JupiterFs({
  server,
  address,
  passphrase,
  encryptSecret,
  feeNQT,
}: any): any {
  const jupServer = server || 'https://jpr.gojupiter.tech'
  feeNQT = feeNQT || 400

  return {
    key: `jupiter-fs`,
    metaDataKey: `jupiter-fs-meta`,
    client: JupiterClient({
      server: jupServer,
      address,
      passphrase,
      encryptSecret,
      feeNQT,
    }),
    binaryClient: null,

    async getOrCreateBinaryAddress() {
      if (this.binaryClient) {
        return {
          [this.key]: true,
          [this.metaDataKey]: true,
          server: this.binaryClient.server,
          address: this.binaryClient.address,
          publicKey: this.binaryClient.publicKey,
          account: this.binaryClient.account,
          passphrase: this.binaryClient.passphrase,
          encryptSecret: this.binaryClient.encryptSecret,
          feeNQT,
        }
      }

      let addy = await this.getBinaryAddress()
      if (!addy) {
        const {
          address,
          publicKey,
          account,
          passphrase,
        } = await this.newBinaryAddress()

        const newAddyInfo = {
          [this.key]: true,
          [this.metaDataKey]: true,
          server: jupServer,
          address,
          publicKey,
          account,
          passphrase,
          encryptSecret,
          feeNQT,
        }
        await this.client.storeRecord(newAddyInfo)
        addy = newAddyInfo
      }
      await this.checkAndFundAccount(addy.address)
      this.binaryClient = JupiterClient({ ...addy, server: jupServer, feeNQT })
      return addy
    },

    async checkAndFundAccount(targetAddress: string) {
      const balanceJup = await this.client.getBalance(targetAddress)
      if (
        !balanceJup ||
        new BigNumber(balanceJup).lt(
          new BigNumber(
            this.client.nqtToJup(this.client.config.minimumFndrAccountBalance)
          ).div(2)
        )
      ) {
        await this.client.sendMoney(targetAddress)
      }
    },

    async getBinaryAddress() {
      const allTxns = await this.client.getAllTransactions()
      const binaryAccountInfo: any = (
        await Promise.all(
          allTxns.map(async (txn: any) => {
            try {
              const decryptedMessage = await this.client.decryptRecord(
                txn.attachment.encryptedMessage
              )
              let data = JSON.parse(await this.client.decrypt(decryptedMessage))
              if (!data[this.metaDataKey]) return false

              return { transaction: txn.transaction, ...data }
            } catch (err) {
              return false
            }
          })
        )
      )
        .filter((r) => !!r)
        .reduce(
          (obj: any, file: any) => ({
            ...obj,
            [file.id]: { ...obj[file.id], ...file },
          }),
          {}
        )
      return Object.values(binaryAccountInfo).find((r: any) => !r.isDeleted)
    },

    async ls() {
      const allTxns = await this.client.getAllTransactions()
      const allFilesObj: any = (
        await Promise.all(
          allTxns.map(async (txn: any) => {
            try {
              const decryptedMessage = await this.client.decryptRecord(
                txn.attachment.encryptedMessage
              )
              let data = JSON.parse(await this.client.decrypt(decryptedMessage))
              if (!data[this.key]) return false

              return { transaction: txn.transaction, ...data }
            } catch (err) {
              return false
            }
          })
        )
      )
        .filter((r: any) => r && !r[this.metaDataKey])
        .reduce(
          (obj: any, file: any) => ({
            ...obj,
            [file.id]: { ...obj[file.id], ...file },
          }),
          {}
        )
      return Object.values(allFilesObj).filter((r: any) => !r.isDeleted)
    },

    async writeFile(
      name: string,
      data: Buffer,
      errorCallback?: (err: Error) => {}
    ) {
      await this.getOrCreateBinaryAddress()
      const chunks = data.toString('base64').match(/.{1,1000}/g)
      assert(chunks, `we couldn't split the data into chunks`)

      const dataTxns: string[] = await Promise.all(
        chunks.map(async (str) => {
          const { transaction } = await exponentialBackoff(async () => {
            await this.checkAndFundAccount(this.binaryClient.address)
            return await this.binaryClient.storeRecord({
              data: str,
            })
          }, errorCallback)
          return transaction
        })
      )

      const masterRecord = {
        [this.key]: true,
        id: uuidv1(),
        fileName: name,
        fileSize: data.length,
        txns: await this.client.encrypt(JSON.stringify(dataTxns)),
      }

      await this.client.storeRecord(masterRecord)
      return masterRecord
    },

    async deleteFile(id: string): Promise<boolean> {
      await this.client.storeRecord({ id, isDeleted: true })
      return true
    },

    /**
     *
     * @param { name, id }: Either the name of a file or an ID to fetch file data.
     * If a file name is provided, it will find the first file it can with the name. Therefore, if you have
     * multiple files with the same name you should use the id field to get the file.
     * @returns Buffer of raw file data
     */
    async getFile(
      { name, id }: any,
      isReadStream: boolean = false
    ): Promise<Buffer | Readable> {
      await this.getOrCreateBinaryAddress()
      const unconfTxns = await this.binaryClient.getAllUnconfirmedTransactions()
      const files = await this.ls()
      const targetFile = files.find(
        (t: any) => (id && id === t.id) || t.fileName === name
      )
      assert(targetFile, 'target file was not found')
      const dataTxns = JSON.parse(await this.client.decrypt(targetFile.txns))
      const readable = new Readable()

      const getBase64Strings = async (
        readableStream?: Readable
      ): Promise<string[]> => {
        const getBase64Chunk = async (decryptedMessage: string) => {
          const jsonWithData = await this.binaryClient.decrypt(decryptedMessage)
          const base64Chunk = JSON.parse(jsonWithData).data
          if (readableStream)
            readableStream.push(Buffer.from(base64Chunk, 'base64'))
          return base64Chunk
        }

        const allBase64Strings: string[] = await Promise.all(
          dataTxns.map(async (txnId: string) => {
            try {
              const { data } = await this.binaryClient.request('post', '/nxt', {
                params: {
                  requestType: 'readMessage',
                  secretPhrase: encryptSecret || this.binaryClient.passphrase,
                  transaction: txnId,
                },
              })
              if (data.errorCode > 0) throw new Error(JSON.stringify(data))
              return await getBase64Chunk(data.decryptedMessage)
            } catch (err) {
              const txn = unconfTxns.find(
                (txn: any) => txn.transaction === txnId
              )
              if (!txn) throw new Error(`target file was not found`)

              const decryptedMessage = await this.binaryClient.decryptRecord(
                txn.attachment.encryptedMessage
              )
              return await getBase64Chunk(decryptedMessage)
            }
          })
        )
        if (readableStream) readableStream.push(null)
        return allBase64Strings
      }

      if (isReadStream) {
        readable._read = async () => {
          await getBase64Strings(readable)
        }
        return readable
      }

      const base64Strings = await getBase64Strings()
      return Buffer.from(base64Strings.join(''), 'base64')
    },

    async getFileStream({ name, id }: any): Promise<Readable> {
      return await this.getFile({ name, id }, true)
    },

    async newBinaryAddress() {
      const passphrase = generatePassphrase()
      const data = await this.client.getAddressFromPassphrase(passphrase)
      return {
        ...data,
        passphrase,
      }
    },
  }
}

async function exponentialBackoff(
  promiseFunction: any,
  failureFunction: any = () => {},
  err = null,
  totalAllowedBackoffTries = 10,
  backoffAttempt = 1
): Promise<any> {
  const backoffSecondsToWait = 2 + Math.pow(backoffAttempt, 2)

  if (backoffAttempt > totalAllowedBackoffTries) throw err

  try {
    const result = await promiseFunction()
    return result
  } catch (err) {
    failureFunction(err, backoffAttempt)
    await sleep(backoffSecondsToWait * 1000)
    return await exponentialBackoff(
      promiseFunction,
      failureFunction,
      err,
      totalAllowedBackoffTries,
      backoffAttempt + 1
    )
  }
}

async function sleep(milliseconds = 1000) {
  return await new Promise((resolve) => setTimeout(resolve, milliseconds))
}
