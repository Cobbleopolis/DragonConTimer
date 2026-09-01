import packageInfo from './package.json' with {type: 'json'}

export default {
    version: packageInfo["version"]
}