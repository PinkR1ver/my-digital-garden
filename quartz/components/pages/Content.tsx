import { htmlToJsx } from "../../util/jsx"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
import RecentNotes from "../RecentNotes"

const RecentWriting = RecentNotes({ title: "Recent writing", limit: 20 })

const Content: QuartzComponent = (props: QuartzComponentProps) => {
  const { fileData, tree } = props
  const content = htmlToJsx(fileData.filePath!, tree)
  const classes: string[] = fileData.frontmatter?.cssclasses ?? []
  const classString = ["popover-hint", ...classes].join(" ")
  const isRecentWritingPage = fileData.slug === "recent-writing"

  return (
    <article class={classString}>
      {content}
      {isRecentWritingPage && <RecentWriting {...props} />}
    </article>
  )
}

export default (() => Content) satisfies QuartzComponentConstructor
