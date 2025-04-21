exports.version = 1.0
exports.description = "Auto-delete rotated log files older than a configurable number of days"
exports.apiRequired = 9.8 // api.misc
exports.repo = "rejetto/hfs-purge-old-logs"
exports.preview = ["https://github.com/user-attachments/assets/9104ee74-89e7-4563-b813-9ab1019e55f8"]

exports.config = {
    days: {
        type: 'number',
        label: "Days to keep",
        defaultValue: 365,
        min: 1,
        helperText: "Files older than this will be deleted"
    }
}

exports.init = async api => {
    const fs = api.require('fs/promises')
    const path = api.require('path')

    const stop = api.misc.repeat(3600_000, async () => { // check hourly
        const cutoffTime = Date.now() - api.getConfig('days') * 86400_000
        let total = 0
        for (const configName of ['log', 'error_log']) {
            const logPath = api.getHfsConfig(configName)
            if (!logPath) continue

            const dir = path.dirname(logPath)
            const baseName = path.basename(logPath)
            const prefix = baseName.replace(/\.[^.]+$/, '') // remove extension
            const ext = path.extname(logPath)

            try {
                for (const file of await fs.readdir(dir)) {
                    const match = file.match(new RegExp(`^${prefix}-(\\d{4}-\\d{2}-\\d{2})${api._.escapeRegExp(ext)}$`))
                    if (!match) continue
                    const fileDate = new Date(match[1])
                    if (fileDate.getTime() > cutoffTime) continue
                    const fullPath = path.join(dir, file)
                    const st = await fs.stat(fullPath)
                    total += st.size
                    await fs.unlink(fullPath)
                    api.log(`Deleted old log file: ${fullPath}`)
                }
            } catch (err) {
                api.log(`Error during log cleanup: ${err.message}`)
            }
        }
        if (total)
            api.log(`Freed ${api.misc.formatBytes(total)}`)
    })

    return {
        unload: stop
    }
}
