import { Root as HTMLRoot } from "hast"
import { Root as MDRoot } from "remark-parse/lib"
import { QuartzTransformerPlugin } from "../types"

export const SECRET_NOTE_VERSION = 2
export const SECRET_NOTE_ALGORITHM = "PBKDF2-SHA256+A256GCM"

const envelopeFields = ["secret_salt", "secret_iv", "secret_ciphertext"] as const

function hasValidEnvelope(frontmatter: Record<string, unknown>): boolean {
  return (
    frontmatter.secret_version === SECRET_NOTE_VERSION &&
    frontmatter.secret_algorithm === SECRET_NOTE_ALGORITHM &&
    envelopeFields.every(
      (field) =>
        typeof frontmatter[field] === "string" && (frontmatter[field] as string).length > 0,
    )
  )
}

export const SecretNotes: QuartzTransformerPlugin = () => ({
  name: "SecretNotes",
  markdownPlugins() {
    return [
      () => (tree: MDRoot, file) => {
        const frontmatter = file.data.frontmatter as Record<string, unknown> | undefined
        if (frontmatter?.secret !== true) return

        // An encrypted note has no Markdown body: the complete ciphertext lives
        // in frontmatter. Reject anything appended beneath the envelope so a
        // stray plaintext paragraph cannot be committed unnoticed.
        const hasNoBody = tree.children.every((node) =>
          ["yaml", "toml"].includes((node as { type: string }).type),
        )
        file.data.secretEnvelopeValid = hasValidEnvelope(frontmatter) && hasNoBody

        // Never allow the source body, even its harmless encrypted marker, into
        // downstream Markdown transforms, excerpts, links, or the rendered tree.
        tree.children = []
      },
    ]
  },
  htmlPlugins() {
    return [
      () => (tree: HTMLRoot, file) => {
        if (file.data.frontmatter?.secret !== true) return
        tree.children = []
        file.data.text = ""
        file.data.description = "Encrypted note. A private key is required to read it."
        file.data.toc = []
        file.data.htmlAst = tree
      },
    ]
  },
})

declare module "vfile" {
  interface DataMap {
    secretEnvelopeValid: boolean
  }
}
