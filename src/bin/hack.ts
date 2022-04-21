import { NS } from "Bitburner";
import { symbolName } from "typescript";
import { getData, getServerAvailableRam } from "/bin/utils/analyze";
import { TermLogger } from "/lib/Helpers";
import { canHack, delay } from "/lib/utils";

const basePath = "/bin/hack/";
export async function main(ns: NS) {
    ns.disableLog("ALL");
    let scriptCount = 0;
    let server = ns.args[0] as string;
    let runnerServer = ns.args[1] as string || ns.getHostname();
    let port = ns.args[2] as number;
    let identifier = ns.args[3] as string || "-1";
    let logger = new TermLogger(ns);
    async function execScript(script: string, threads: number, time: number) {
        // logger.log("Executing " + script + " with " + threads + " threads for " + time + " seconds");
        // logger.log(`Running ${script} with ${threads} threads`);
        scriptCount++;
        let args = [
            scriptCount.toString(),
            identifier

        ]
        // logger.info(`Running ${script} with ${threads} threads and args ${args}`);

        ns.exec(script, runnerServer, threads, server, ...args);
        await ns.asleep(time);
    }
    let availableRam = getServerAvailableRam(ns, runnerServer);

    async function doHack() {
        let data = getData(ns, server, runnerServer).getHackInfo(false);

        if (data == undefined) return false;

        let { growThreads, growTime, hackThreads, hackTime, ramUsage, totalRam, weakenThreads, weakenTime, totalTime } = data;
        if (totalRam > availableRam) {
            // logger.log("Not enough ram to hack");
            return false;
        }
        let scale = (availableRam / totalRam) < 1 ? 1 : 1;
        let roundScale = Math.floor(scale);
        growThreads = growThreads * roundScale;
        weakenThreads = weakenThreads * roundScale;
        hackThreads = hackThreads * roundScale;
        totalRam = totalRam * roundScale;
        ramUsage = totalRam / availableRam;

        if (totalRam > availableRam) {
            // logger.log("Not enough ram to hack: " + availableRam + " available ram, " + totalRam + " total ram");
            return false;
        }

        // logger.info("\tStarting scripts");
        let startHackIn = (weakenTime - hackTime) * 1000 - 1000;
        let hackFinishIn = startHackIn + (hackTime * 1000);
        let startGrowIn = hackFinishIn - (growTime * 1000) + 300;

        if (weakenThreads > 0) {
            // logger.info(`\tWeaken: ${weakenThreads} threads, ${totalRam} ram, ${weakenTime} seconds`);
            execScript(basePath + "weaken.js", weakenThreads, weakenTime * 1000);
            totalTime += 1000;
        }
        if (growThreads > 0) {
            // logger.info(`\tGrow: starts in ${startGrowIn}ms`);
            await ns.sleep(startGrowIn);
            // logger.info(`\tGrow: ${growThreads} threads, ${totalRam} ram, ${growTime} seconds`);
            execScript(basePath + "grow.js", growThreads, growTime * 1000 + 100);
            startHackIn -= startGrowIn;
            totalTime -= startGrowIn - 300;

        }
        if (hackThreads > 0) {
            // logger.info(`\tHack: starts in ${startHackIn}ms`);
            await ns.sleep(startHackIn);

            if (ns.formulas.hacking.hackPercent(ns.getServer(server), ns.getPlayer()) > 0.5)
                hackThreads = ns.hackAnalyzeThreads(server, ns.getServer(server).moneyAvailable * 0.1);
            // logger.info(`\tHack: ${hackThreads} threads, ${totalRam} ram, ${hackTime} seconds`);
            execScript(basePath + "hack.js", hackThreads, hackTime * 1000 + 50);
            totalTime -= startHackIn;
        }
        if (totalTime > 0)
            await ns.sleep(totalTime)

        // logger.info("\tFinished scripts");
        return true;


    }
    getData(ns, server, runnerServer).getHackInfo(false)
    do {

        await doHack();
        await ns.sleep(1000);
        await ns.writePort(port, +ns.readPort(port) - 1);

        availableRam = getServerAvailableRam(ns, runnerServer);
    } while (false)

}