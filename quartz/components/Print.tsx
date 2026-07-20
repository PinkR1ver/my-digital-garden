// @ts-ignore
import printScript from "./scripts/print.inline"
import styles from "./styles/print.scss"
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

interface PrintOptions {
  /** Label text next to the printer icon. Default: "Print" */
  label?: string
}

const defaultOptions: PrintOptions = {
  label: "Print",
}

export default ((opts?: Partial<PrintOptions>) => {
  const options: PrintOptions = { ...defaultOptions, ...opts }

  const Print: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
    // Reports are print-ready by definition; normal notes still opt in explicitly.
    if (!fileData.frontmatter?.print && fileData.frontmatter?.report !== true) {
      return null
    }

    return (
      <div class="print-button-wrapper">
        <button
          id="print-button"
          type="button"
          aria-label="Print this note"
          title="Print this note"
        >
          <PrinterSVG />
          <span>{options.label}</span>
        </button>
      </div>
    )
  }

  Print.afterDOMLoaded = printScript
  Print.css = styles

  return Print
}) satisfies QuartzComponentConstructor
