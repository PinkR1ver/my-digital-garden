import { QuartzFilterPlugin } from "../types"

export const SecretNotesGuard: QuartzFilterPlugin = () => ({
  name: "SecretNotesGuard",
  shouldPublish(_ctx, [_tree, file]) {
    if (file.data.frontmatter?.secret !== true) return true
    if (file.data.secretEnvelopeValid === true) return true

    const path = file.data.relativePath ?? file.path ?? "unknown file"
    throw new Error(
      `Refusing to publish plaintext secret note ${path}. ` +
        "Encrypt it first with `npm run secret:encrypt -- <file> ...`.",
    )
  },
})
