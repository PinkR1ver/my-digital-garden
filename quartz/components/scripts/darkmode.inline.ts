const userPref = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
const currentTheme = localStorage.getItem("theme") ?? userPref
document.documentElement.setAttribute("saved-theme", currentTheme)

const emitThemeChangeEvent = (theme: "light" | "dark") => {
  const event: CustomEventMap["themechange"] = new CustomEvent("themechange", {
    detail: { theme },
  })
  document.dispatchEvent(event)
}

const applyTheme = (theme: "light" | "dark") => {
  document.documentElement.setAttribute("saved-theme", theme)
  localStorage.setItem("theme", theme)
  emitThemeChangeEvent(theme)
}

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> }
}

const transitionThemeFromTopLeft = (theme: "light" | "dark") => {
  const viewTransitionDocument = document as ViewTransitionDocument

  if (!viewTransitionDocument.startViewTransition || prefersReducedMotion()) {
    applyTheme(theme)
    return
  }

  document.documentElement.classList.add("theme-curtain-transition")

  const transition = viewTransitionDocument.startViewTransition(() => {
    applyTheme(theme)
  })

  transition.finished.finally(() => {
    document.documentElement.classList.remove("theme-curtain-transition")
  })
}

document.addEventListener("nav", () => {
  const switchTheme = (e: Event) => {
    const newTheme = (e.target as HTMLInputElement)?.checked ? "dark" : "light"
    transitionThemeFromTopLeft(newTheme)
  }

  const themeChange = (e: MediaQueryListEvent) => {
    const newTheme = e.matches ? "dark" : "light"
    transitionThemeFromTopLeft(newTheme)
    toggleSwitch.checked = e.matches
  }

  // Darkmode toggle
  const toggleSwitch = document.querySelector("#darkmode-toggle") as HTMLInputElement
  toggleSwitch.addEventListener("change", switchTheme)
  window.addCleanup(() => toggleSwitch.removeEventListener("change", switchTheme))
  if (currentTheme === "dark") {
    toggleSwitch.checked = true
  }

  // Listen for changes in prefers-color-scheme
  const colorSchemeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
  colorSchemeMediaQuery.addEventListener("change", themeChange)
  window.addCleanup(() => colorSchemeMediaQuery.removeEventListener("change", themeChange))
})
