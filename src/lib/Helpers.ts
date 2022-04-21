import { NS } from "Bitburner";

const ReadText = {
    readLines(ns: NS, file: string): string[] {
        return (ns.read(file) as string).split(/\r?\n/);
    },

    readNonEmptyLines(ns: NS, file: string): string[] {
        return ReadText.readLines(ns, file).filter(
            (x) => x.trim() != ""
        );
    },
};

const DownloadFiles = {
    async getfileToHome(ns: NS, source: string, dest: string) {
        const logger = new TermLogger(ns);
        logger.info(`Downloading ${source} -> ${dest}`);

        if (!(await ns.wget(source, dest, ns.getHostname()))) {
            logger.err(`\tFailed retrieving ${source} -> ${dest}`);
        }
    },
};

class TermLogger {
    static INFO_LITERAL = "INFO   >";
    static WARN_LITERAL = "WARN   >";
    static ERR_LITERAL = "ERROR  >";
    static TRACE_LITERAL = "TRACE  >";
    public canLog: boolean = true;
    constructor(public ns: NS, public identifier: string = "") {
    }

    info(msg: string, ...args: string[]) {
        if (!this.canLog) return;
        this.ns.printf(`${TermLogger.INFO_LITERAL}[${this.identifier ? this.identifier + ":" : ""}] ${msg}`, ...args);
    }

    warn(msg: string, ...args: string[]) {
        if (!this.canLog) return;
        this.ns.printf(`${TermLogger.WARN_LITERAL}[${this.identifier ? this.identifier + ":" : ""}] ${msg}`, ...args);
    }

    err(msg: string, ...args: string[]) {
        if (!this.canLog) return;
        this.ns.printf(`${TermLogger.ERR_LITERAL}[${this.identifier ? this.identifier + ":" : ""}] ${msg}`, ...args);
    }

    log(msg: string, ...args: string[]) {
        if (!this.canLog) return;
        this.ns.printf(`${TermLogger.TRACE_LITERAL}[${this.identifier ? this.identifier + ":" : ""}] ${msg}`, ...args);
    }
    trace(msg: string, ...args: string[]) {
        if (!this.canLog) return;
        this.log(msg, ...args);
    }
}

interface RepoSettings {
    baseUrl: string;
    manifestPath: string;
}

const repoSettings: RepoSettings = {
    baseUrl: "http://localhost:9182",
    manifestPath: "/resources/manifest.txt",
};

class RepoInit {
    ns: NS;
    logger: TermLogger;

    constructor(ns: NS, logger: TermLogger = new TermLogger(ns)) {
        this.ns = ns;
        this.logger = logger;
    }

    private static getSourceDestPair(line: string): { source: string; dest: string } | null {
        return line.startsWith("./")
            ? {
                source: `${repoSettings.baseUrl}${line.substring(1)}`,
                dest: line.substring(1),
            }
            : null;
    }

    async pullScripts() {
        await this.getManifest();
        await this.downloadAllFiles();
    }

    async getManifest() {
        const manifestUrl = `${repoSettings.baseUrl}${repoSettings.manifestPath}`;

        this.logger.info(`Getting manifest...`);

        await DownloadFiles.getfileToHome(
            this.ns,
            manifestUrl,
            repoSettings.manifestPath
        );
    }

    async downloadAllFiles() {
        const files = ReadText.readNonEmptyLines(
            this.ns,
            repoSettings.manifestPath
        );

        this.logger.info(`Contents of manifest:`);
        this.logger.info(`\t${files}`);

        for (let file of files) {
            const pair = RepoInit.getSourceDestPair(file);

            if (!pair) {
                this.logger.err(`Could not read line ${file}`);
            } else {
                await DownloadFiles.getfileToHome(this.ns, pair.source, pair.dest);
            }
        }
    }
}

export { ReadText, TermLogger, RepoInit, DownloadFiles };
