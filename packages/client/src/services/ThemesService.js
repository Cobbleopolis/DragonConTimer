const knownThemes = ['light', 'dark']
//const themes = {}

export default class Themes {
    constructor() {

        //this._watchSystemChanges()
        const userPref = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        const useTheme = localStorage.getItem('theme') || userPref || knownThemes[0]
        this.select(useTheme)
    }

    select(name) {
        if (name && !this.getnames().includes(name)) {
            throw new Error(`"${name}" has not been defined as a theme.`)
        }
        let body = document.body
        //Object.keys(themes).forEach(n => themes[n].disabled = (n !== name))
        body.setAttribute('data-bs-theme', name)
        localStorage.setItem('theme', name)
    }


    _watchSystemChanges() {
        if (!window.matchMedia) return
        window.matchMedia('(prefers-color-scheme: dark)').addListener(e => {
            if (e.matches) {
                this.select('dark')
            } else {
                this.select('light')
            }
        })
    }

    getnames() {
        return knownThemes
    }
}