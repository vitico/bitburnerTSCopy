import { NS } from "Bitburner";
import { getData, getServerAvailableRam } from "/bin/utils/analyze";
import { TermLogger } from "/lib/Helpers";
async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
let scriptCount = 0;
const basePath = "/bin/hack/";
export async function main(ns: NS) {
    let server = ns.args[0] as string;
    let runnerServer = ns.args[1] as string || ns.getHostname();
    let logger = new TermLogger(ns);

    async function execScript(script: string, threads: number, time: number) {
        logger.log("Executing " + script + " with " + threads + " threads for " + time + " seconds");
        logger.log(`Running ${script} with ${threads} threads`);
        scriptCount++;
        let args = [
            "--threads",
            threads.toString(),
            "--time",
            time.toString(),
            "--server",
            runnerServer,
            "--script",
            basePath + script,
            "--scriptCount",
            scriptCount.toString()

        ]
        logger.info(`Running ${script} with ${threads} threads and args ${args}`);

        ns.exec(script, runnerServer, threads, server, ...args);
        await delay(time);
    }
    let availableRam = getServerAvailableRam(ns, runnerServer);

    function canHack() {
        let data = getData(ns, server, runnerServer).getHackInfo();

        if (data == undefined) return false;

        let { growThreads, growTime, hackThreads, hackTime, ramUsage, totalRam, weakenThreads, weakenTime } = data;
        if (totalRam > availableRam) {
            logger.log("Not enough ram to hack");
            return false;
        }
        return true;
    }
    async function doHack() {
        let data = getData(ns, server, runnerServer).getHackInfo();

        if (data == undefined) return false;

        let { growThreads, growTime, hackThreads, hackTime, ramUsage, totalRam, weakenThreads, weakenTime } = data;
        if (totalRam > availableRam) {
            logger.log("Not enough ram to hack");
            return false;
        }
        availableRam -= totalRam;

        logger.info("\tStarting scripts");
        let startHackIn = (weakenTime - hackTime) * 1000;
        let hackFinishIn = startHackIn + (hackTime * 1000);
        let startGrowIn = hackFinishIn - (growTime * 1000) + 100;

        let promises: Promise<any>[] = [];
        if (growThreads > 0)
            promises.push(delay((weakenTime - growTime) * 1000 - 600).then(() => execScript(basePath + "grow.js", growThreads, growTime * 1000 + 100)));
        if (hackThreads > 0)
            promises.push(delay((weakenTime - hackTime) * 1000 - 900).then(() => execScript(basePath + "hack.js", hackThreads, hackTime * 1000 + 50)));
        if (weakenThreads > 0)
            promises.push(execScript(basePath + "weaken.js", weakenThreads, weakenTime * 1000));

        await Promise.all(promises);
        logger.info("\tFinished scripts");
        return true;

    }
    let allPromises: Promise<any>[] = [];
    while (canHack()) {
        allPromises.push(doHack());
        await delay(1000);
        break;
    }
    await Promise.all(allPromises);

}