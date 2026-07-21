// @ts-ignore
import slidesScript from "./scripts/slides.inline"
import styles from "./styles/slides.scss"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const PrinterSVG = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 12H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
)

interface SlidesOptions {
  /** Label text next to the printer icon. Default: "Print" */
  label?: string
}

const defaultOptions: SlidesOptions = {
  label: "Print",
}

export default ((opts?: Partial<SlidesOptions>) => {
  const options: SlidesOptions = { ...defaultOptions, ...opts }

  const Slides: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
    // Slides are opt-in so normal notes do not acquire another page action.
    if (fileData.frontmatter?.slides !== true) {
      return null
    }

    return (
      <div class="slides-button-wrapper">
        <button
          id="slides-button"
          type="button"
          aria-label="Print this note as slides"
          title="Print this note as slides"
        >
          <PrinterSVG />
          <span>{options.label}</span>
        </button>
      </div>
    )
  }

  Slides.afterDOMLoaded = slidesScript
  Slides.css = styles

  return Slides
}) satisfies QuartzComponentConstructor
