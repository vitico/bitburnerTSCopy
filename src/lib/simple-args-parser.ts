type Config = {
    short: string[],
    long: string[],
    stupid: string[],
    errOnDisallowed: boolean

}
function parse(argv: string[], config: Config, fallback = (err) => {
    if (err) throw err
}) {
    var obj = {}

    argv.forEach((i, n) => {
        if (i.startsWith('-') && i.length === 2) { // Short argument

            if (config.short.includes(i.substring(1) + ':')) { // Need option
                obj[i.substring(1)] = String(argv[(n + 1)])

            } else if (config.short.includes(i.substring(1))) {
                obj[i.substring(1)] = true

            } else if (config.errOnDisallowed) {
                fallback('argsParseError: ' + i + ' flag is not avalible!')
            }

        } else if (i.startsWith('--') && config.long.includes(i.substring(2))) {
            obj[i.substring(2)] = true

        } else if (i.startsWith('--') && config.long.includes(i.substring(2) + ':')) {
            obj[i.substring(2)] = String(argv[(n + 1)])

        } else if (i.startsWith('--') && config.errOnDisallowed) {
            fallback('argsParseError: ' + i + ' flag is not avalible!')

        } else if (i.startsWith('-') && i.length != 2) {
            if (config.stupid.includes(i.substring(1))) {
                obj[i.substring(1)] = true
            } else if (config.stupid.includes(i.substring(1) + ':')) {
                obj[i.substring(1)] = String(argv[(n + 1)])
            } else if (config.errOnDisallowed) {
                fallback('argsParseError: ' + i + ' flag is not avalible!')
            }

        }
    })

    return obj
}

export default parse;
