import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

type EncryptedPayload = { ciphertext: string; iv: string; tag: string }

const key = (secret: string) => {
  if (secret.length < 16) throw new Error('INTAKE_ENCRYPTION_SECRET_INVALID')
  return createHash('sha256').update(secret).digest()
}

export function encryptSensitiveIntake(value: Record<string, unknown>, secret: string): EncryptedPayload {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(secret), iv)
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  return { ciphertext: ciphertext.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64') }
}

export function decryptSensitiveIntake(value: EncryptedPayload, secret: string): Record<string, unknown> {
  const decipher = createDecipheriv('aes-256-gcm', key(secret), Buffer.from(value.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(value.tag, 'base64'))
  const plaintext = Buffer.concat([decipher.update(Buffer.from(value.ciphertext, 'base64')), decipher.final()]).toString('utf8')
  return JSON.parse(plaintext) as Record<string, unknown>
}
