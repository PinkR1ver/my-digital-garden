import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

/**
 * Quartz 4.0 Configuration
 *
 * See https://quartz.jzhao.xyz/configuration for more information.
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "🎣 JudeW's Knowledge Brain",
    enableSPA: true,
    enablePopovers: true,
    analytics: {
      provider: "plausible",
    },
    locale: "en-US",
    baseUrl: "pinktalk.online",
    ignorePatterns: ["private", "templates", ".obsidian", "arch", "**/attachments/**/*.md"],
    defaultDateType: "created",
    theme: {
      cdnCaching: true,
      typography: {
        header: "DM Serif Display",
        body: "Bricolage Grotesque",
        code: "JetBrains Mono",
      },
      colors: {
        lightMode: {
          light: "#eff1f5",
          lightgray: "#ccd0da",
          gray: "#8c8fa1",
          darkgray: "#4c4f69",
          dark: "#dc8a78",
          secondary: "#1e66f5",
          tertiary: "#179299",
          highlight: "rgba(136, 57, 239, 0.14)",
        },
        darkMode: {
          light: "#303446",
          lightgray: "#414559",
          gray: "#626880",
          darkgray: "#c6d0f5",
          dark: "#f2d5cf",
          secondary: "#8caaee",
          tertiary: "#81c8be",
          highlight: "rgba(202, 158, 230, 0.18)",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "filesystem"],
      }),
      Plugin.Latex({ renderEngine: "katex" }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.SecretNotes(),
    ],
    filters: [Plugin.SecretNotesGuard(), Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources({ fontOrigin: "googleFonts" }),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.NotFoundPage(),
    ],
  },
}

export default config
