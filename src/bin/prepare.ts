import { NS } from "Bitburner";
import { TermLogger } from "/lib/Helpers";
import { basePath, getData, getServerAvailableRam } from "/bin/utils/analyze";
/**
 * 
 * @param {NS} ns 
 * @returns 
 */
export async function main(ns: NS) {
    let server = ns.args[0] as string;
    let logger = new TermLogger(ns);

    let data = getData(ns, server, ns.getHostname()).getHackInfo(true);
    function refreshData() {
        data = getData(ns, server, ns.getHostname()).getHackInfo(false);
    }
    if (data == undefined) return;

    let ram = getServerAvailableRam(ns, ns.getHostname());
    async function execScript(script, time, minThreads) {
        let scriptRam = ns.getScriptRam(script);
        let scriptThreads = Math.min(Math.floor(ram / scriptRam), minThreads);
        logger.log(`Running ${script} on ${server} with ${scriptThreads} threads for ${time} seconds`);
        logger.trace(JSON.stringify({
            script,
            scriptRam,
            scriptThreads,
            ram
        }));
        ns.run(script, scriptThreads, server);
        await ns.sleep(time);
        await ns.sleep(1000)
    }
    // weaken the server to the minimun
    while (ns.getServerSecurityLevel(server) > ns.getServerMinSecurityLevel(server)) {
        refreshData();
        await execScript(basePath + "weaken.js", data.weakenTime * 1000, data.weakenThreads);
    }
    // grow the server to the maximum
    while (ns.getServerMaxMoney(server) > ns.getServerMoneyAvailable(server)) {
        refreshData();
        await execScript(basePath + "grow.js", data.growTime * 1000, data.growThreads);
    }

    // weaken the server to the minimun
    while (ns.getServerSecurityLevel(server) > ns.getServerMinSecurityLevel(server)) {
        refreshData();
        await execScript(basePath + "weaken.js", data.weakenTime * 1000, data.weakenThreads);
    }

}