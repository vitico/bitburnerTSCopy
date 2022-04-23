import { getData, getServerAvailableRam, getServerAvailableRam2 } from "/bin/utils/analyze";
import { NetscriptPort, NS } from "Bitburner";
import { canHack } from "/lib/utils";
import { TermLogger } from "/lib/Helpers";

export async function main(ns: NS) {
    ns.disableLog("ALL");

    let params = ns.flags(
        [
            ["p", 1],
            ["l", false],
            ["s", ""]
        ]
    )
    let server = params.s;
    let identifier = params.p;
    let runner = ns.getHostname();
    let logger = new TermLogger(ns, runner);
    logger.canLog = params.l;
    let availableRam = getServerAvailableRam2(ns, runner);
    let port = identifier;
    async function awaitPortValue(ns: NS, port: number) {
        let val;
        while ((val = ns.readPort(port)) == "NULL PORT DATA") {
            await ns.asleep(100);
        }

        return val;
    }

    if (!canHack(ns, server, runner, availableRam))
        return;
    ns.atExit(() => {
        ns.scriptKill("/bin/hack/hack.js", runner);
        ns.scriptKill("/bin/hack/grow.js", runner);
        ns.scriptKill("/bin/hack/weaken.js", runner);
    });
    while (true) {
        let data = getData(ns, server, runner).getHackInfo(false);
        let counter = 0;
        ns.clearPort(port);
        let hasFormulas = ns.fileExists("Formulas.exe");

        while (canHack(ns, server, runner, availableRam)) {
            availableRam -= data.totalRam;
            ns.exec(`/bin/hack.js`, runner, 1, server, ns.getHostname(), port, (counter++).toString(), hasFormulas);
            await ns.sleep(20);
            // break;
        }
        let newVal = 0;
        do {
            newVal = await awaitPortValue(ns, port);
            counter += +newVal;
            // logger.log(`Got ${newVal}. Total: ${counter}. typeof ${typeof newVal}`);
        } while (counter > 0)
        await ns.sleep(1000);

        logger.info(`Finished wait at ${new Date().toLocaleTimeString()}`);
        availableRam = getServerAvailableRam2(ns, runner);

    }

}