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
          data-secret-salt={frontmatter.secret_salt}
          data-secret-iv={frontmatter.secret_iv}
          data-secret-ciphertext={frontmatter.secret_ciphertext}
        >
          <div class="secret-note-mark" aria-hidden="true">
            🔐
          </div>
          <h2>This note is encrypted</h2>
          <p class="secret-note-explainer">
            Enter the passphrase to decrypt and render the Markdown locally.
          </p>
          <form class="secret-note-form">
            <label class="secret-note-label" for="secret-passphrase">
              Passphrase
            </label>
            <input
              class="secret-passphrase"
              id="secret-passphrase"
              type="password"
              autocomplete="off"
              autocapitalize="off"
              spellcheck={false}
            />
            <button type="submit">Unlock note</button>
            <p class="secret-note-privacy">
              The passphrase stays in this tab. It is not uploaded or saved in browser storage.
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
