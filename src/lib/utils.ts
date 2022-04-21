import { NS } from "Bitburner";
import { getServerAvailableRam, getData } from "/bin/utils/analyze";

export async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
export function canHack(ns: NS, server: string, runnerServer: string, availableRam) {
    let data = getData(ns, server, runnerServer).getHackInfo(false);
    if (data == undefined) return false;

    let { growThreads, growTime, hackThreads, hackTime, ramUsage, totalRam, weakenThreads, weakenTime } = data;
    if (totalRam > availableRam) {
        // logger.log("Not enough ram to hack");
        return false;
    }
    return true;
}

export function getAlLServers(ns: NS, runnerServer: string, foundServers: Set<string>) {
    let servers = ns.scan(runnerServer);
    for (let server of servers) {
        if (foundServers.has(server)) continue;
        foundServers.add(server);
        getAlLServers(ns, server, foundServers);
    }

}