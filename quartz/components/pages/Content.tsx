import { htmlToJsx } from "../../util/jsx"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
import RecentNotes from "../RecentNotes"
// @ts-ignore
import secretScript from "../scripts/secret.inline"
import secretStyles from "../styles/secret.scss"

const RecentWriting = RecentNotes({ title: "Recent writing", limit: 20 })

const Content: QuartzComponent = (props: QuartzComponentProps) => {
  const { fileData, tree } = props
  const frontmatter = fileData.frontmatter
  const isSecret = frontmatter?.secret === true

  if (isSecret) {
    return (
      <article class="popover-hint secret-note-page">
        <section
          class="secret-note-lock"
          data-secret-note
          data-secret-wrapped-key={frontmatter.secret_wrapped_key}
          data-secret-iv={frontmatter.secret_iv}
          data-secret-ciphertext={frontmatter.secret_ciphertext}
        >
          <div class="secret-note-mark" aria-hidden="true">
            🔐
          </div>
          <h2>This note is encrypted</h2>
          <p class="secret-note-explainer">
            Choose the matching private key (and passphrase, if it has one) to decrypt and render
            the Markdown locally.
          </p>
          <form class="secret-note-form">
            <label class="secret-note-label" for="secret-key-file">
              Private key file (PKCS#8 PEM)
            </label>
            <input
              class="secret-key-file"
              id="secret-key-file"
              type="file"
              accept=".pem,.key,text/plain"
            />
            <label class="secret-note-label" for="secret-key-text">
              Or paste the private key
            </label>
            <textarea
              class="secret-key-text"
              id="secret-key-text"
              autocomplete="off"
              autocapitalize="off"
              spellcheck={false}
              placeholder="-----BEGIN (ENCRYPTED) PRIVATE KEY-----"
            />
            <label class="secret-note-label" for="secret-passphrase">
              Passphrase (only for encrypted private keys)
            </label>
            <input
              class="secret-passphrase"
              id="secret-passphrase"
              type="password"
              autocomplete="off"
              spellcheck={false}
            />
            <button type="submit">Unlock note</button>
            <p class="secret-note-privacy">
              The key stays in this tab. It is not uploaded or saved in browser storage.
            </p>
          </form>
          <p class="secret-note-status" role="status" aria-live="polite"></p>
        </section>
        <div class="secret-note-output" hidden></div>
      </article>
    )
  }

  const content = htmlToJsx(fileData.filePath!, tree)
  const classes: string[] = fileData.frontmatter?.cssclasses ?? []
  const reportClass = fileData.frontmatter?.report === true ? ["report-page"] : []
  const classString = ["popover-hint", ...reportClass, ...classes].join(" ")
  const isRecentWritingPage = fileData.slug === "recent-writing"

  return (
    <article class={classString}>
      {content}
      {isRecentWritingPage && <RecentWriting {...props} />}
    </article>
  )
}

Content.afterDOMLoaded = secretScript
Content.css = secretStyles

export default (() => Content) satisfies QuartzComponentConstructor
