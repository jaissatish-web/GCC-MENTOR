'use client'
export interface RecordingDraft { blob: Blob; duration: number }
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('gcc-voice-drafts', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('answers')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
export async function draftOperation(key: string, operation: 'read' | 'write' | 'delete', value?: RecordingDraft): Promise<RecordingDraft | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('answers', operation === 'read' ? 'readonly' : 'readwrite')
    const store = tx.objectStore('answers')
    const request = operation === 'read' ? store.get(key) : operation === 'write' ? store.put(value, key) : store.delete(key)
    tx.oncomplete = () => { db.close(); resolve(operation === 'read' ? request.result : undefined) }
    tx.onerror = () => { db.close(); reject(tx.error) }
    tx.onabort = () => { db.close(); reject(tx.error) }
  })
}
