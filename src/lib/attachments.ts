const DATABASE_NAME = 'anchor-attachments-v1'
const DATABASE_VERSION = 1
const STORE_NAME = 'files'

interface AttachmentRecord {
  id: string
  blob: Blob
}

function openAttachmentDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('Local file storage is unavailable in this browser.'))
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Local file storage could not be opened.'))
  })
}

export async function saveAnchorAttachmentFile(id: string, file: Blob): Promise<void> {
  const database = await openAttachmentDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put({ id, blob: file } satisfies AttachmentRecord)
    transaction.oncomplete = () => {
      database.close()
      resolve()
    }
    transaction.onerror = () => {
      database.close()
      reject(transaction.error ?? new Error('The attachment could not be saved on this device.'))
    }
    transaction.onabort = () => {
      database.close()
      reject(transaction.error ?? new Error('The attachment could not be saved on this device.'))
    }
  })
}

export async function readAnchorAttachmentFile(id: string): Promise<Blob | undefined> {
  const database = await openAttachmentDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).get(id) as IDBRequest<AttachmentRecord | undefined>
    request.onsuccess = () => {
      database.close()
      resolve(request.result?.blob)
    }
    request.onerror = () => {
      database.close()
      reject(request.error ?? new Error('The attachment could not be opened.'))
    }
    transaction.onabort = () => {
      database.close()
      reject(transaction.error ?? new Error('The attachment could not be opened.'))
    }
  })
}

export async function removeAnchorAttachmentFile(id: string): Promise<void> {
  const database = await openAttachmentDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).delete(id)
    transaction.oncomplete = () => {
      database.close()
      resolve()
    }
    transaction.onerror = () => {
      database.close()
      reject(transaction.error ?? new Error('The attachment could not be removed from this device.'))
    }
    transaction.onabort = () => {
      database.close()
      reject(transaction.error ?? new Error('The attachment could not be removed from this device.'))
    }
  })
}

export async function clearAnchorAttachmentFiles(): Promise<void> {
  const database = await openAttachmentDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).clear()
    transaction.oncomplete = () => {
      database.close()
      resolve()
    }
    transaction.onerror = () => {
      database.close()
      reject(transaction.error ?? new Error('Local attachments could not be cleared.'))
    }
    transaction.onabort = () => {
      database.close()
      reject(transaction.error ?? new Error('Local attachments could not be cleared.'))
    }
  })
}
