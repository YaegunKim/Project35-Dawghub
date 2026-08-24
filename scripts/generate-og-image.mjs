import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(rootDir, 'public/brand/og-source.svg')
const output = join(rootDir, 'public/og-image.png')

await sharp(source).resize(1200, 630).png().toFile(output)

console.log(`Generated ${output}`)
