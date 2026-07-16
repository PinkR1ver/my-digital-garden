// @ts-ignore
import slidesScript from "./scripts/slides.inline"
import styles from "./styles/slides.scss"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const SlidesSVG = () => (
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
    <path d="M2 3h20" />
    <path d="M4 3v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3" />
    <path d="m8 22 4-4 4 4" />
  </svg>
)

interface SlidesOptions {
  /** Label text next to the presentation icon. Default: "Slides" */
  label?: string
}

const defaultOptions: SlidesOptions = {
  label: "Slides",
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
          aria-label="Open this note as slides"
          title="Open this note as slides"
        >
          <SlidesSVG />
          <span>{options.label}</span>
        </button>
      </div>
    )
  }

  Slides.afterDOMLoaded = slidesScript
  Slides.css = styles

  return Slides
}) satisfies QuartzComponentConstructor
