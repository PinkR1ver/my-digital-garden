import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import style from "./styles/search.scss"
// @ts-ignore
import script from "./scripts/search.inline"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"

export interface SearchOptions {
  enablePreview: boolean
}

const defaultOptions: SearchOptions = {
  enablePreview: true,
}

function searchAgent() {
  return (
    <svg class="search-agent" viewBox="0 0 64 64" aria-hidden="true">
      <g class="agent-pose">
        <circle class="agent-body" cx="32" cy="32" r="26" />
        <g class="agent-orbit">
          <g transform="rotate(18 32 32)">
            <ellipse cx="32" cy="32" rx="30" ry="11" />
          </g>
          <g transform="rotate(78 32 32)">
            <ellipse cx="32" cy="32" rx="30" ry="11" />
          </g>
          <g transform="rotate(138 32 32)">
            <ellipse cx="32" cy="32" rx="30" ry="11" />
          </g>
        </g>
        <g class="agent-look">
          <g class="agent-eye" transform="translate(24.5 27.5) rotate(-28)">
            <rect class="agent-lid" x="-3.7" y="-7.4" width="7.4" height="14.8" rx="3.7" />
          </g>
          <g class="agent-eye agent-eye-far" transform="translate(40.5 22.5) rotate(-24)">
            <rect class="agent-lid" x="-2.6" y="-5.5" width="5.2" height="11" rx="2.6" />
          </g>
        </g>
      </g>
    </svg>
  )
}

export default ((userOpts?: Partial<SearchOptions>) => {
  const Search: QuartzComponent = ({ displayClass, cfg }: QuartzComponentProps) => {
    const opts = { ...defaultOptions, ...userOpts }
    const searchPlaceholder = i18n(cfg.locale).components.search.searchBarPlaceholder
    return (
      <div class={classNames(displayClass, "search")}>
        <div id="search-icon" role="button" tabIndex={0}>
          <p>{i18n(cfg.locale).components.search.title}</p>
          <div></div>
          {searchAgent()}
        </div>
        <div id="search-container">
          <div id="search-space">
            <div id="search-field">
              {searchAgent()}
              <input
                autocomplete="off"
                id="search-bar"
                name="search"
                type="text"
                aria-label={searchPlaceholder}
                placeholder={searchPlaceholder}
              />
            </div>
            <div id="search-layout" data-preview={opts.enablePreview}></div>
          </div>
        </div>
      </div>
    )
  }

  Search.afterDOMLoaded = script
  Search.css = style

  return Search
}) satisfies QuartzComponentConstructor
