import { NS, Server } from "Bitburner";
import { TermLogger } from "/lib/Helpers";

export const basePath = "/bin/hack/";
export function getServerAvailableRam(ns: NS, server: Server): number {
    let ram = server.maxRam;
    let usedRam = server.ramUsed;
    return ram - usedRam;
}
export function getServerAvailableRam2(ns: NS, host: string): number {
    let server = ns.getServer(host);
    return getServerAvailableRam(ns, server);
}
export function getData(ns: NS, server: string, runnerServer: string = "") {
    let logger = new TermLogger(ns);
    const toHack = 0.1;
    const growMargin = 0.4;

    let hackRam = ns.getScriptRam(basePath + "hack.js");
    let growRam = ns.getScriptRam(basePath + "grow.js");
    let weakenRam = ns.getScriptRam(basePath + "weaken.js");
    let manager1Ram = ns.getScriptRam("/bin/hack.js");
    let realServer = ns.getServer(server);

    let minSecurity = realServer.minDifficulty;
    let maxMoney = realServer.moneyMax;
    let currentServer = runnerServer || ns.getHostname();
    let realCurrentServer = ns.getServer(currentServer);
    let cores = realCurrentServer.cpuCores;
    function neededWeakenThreads(GrowThreads: number, HackThreads: number) {
        let security = realServer.hackDifficulty;
        // how many threads are needed to weaken the server. knowning that each weaken reduces security by 0.05, and each grow up security by 0.004 and hack by 0.002

        let growSecurity = 0.004 * GrowThreads;
        let hackSecurity = 0.002 * HackThreads;
        let neededWeakenThreads = Math.ceil(((security - minSecurity) + (hackSecurity + growSecurity)) / ns.weakenAnalyze(1, cores));

        return (neededWeakenThreads);
    }
    function neededGrowingThreads() {
        let money = realServer.moneyAvailable;
        // how many threads are needed to grow the server to maxMoney. 
        let neededMoney = Math.ceil(Math.max(maxMoney / (money * (1 - (toHack + growMargin))), 4));
        if (money == 0) return 0;
        return Math.ceil(ns.growthAnalyze(server, neededMoney, cores));
    }
    function neededHackThreads() {
        // how many threads are needed to hack the server to get 10%. 
        let hackPercentPerThread = ns.hackAnalyze(server);// 0.01 = 1%
        if (hackPercentPerThread == 0) return 0;

        return Math.floor(Math.max((toHack / hackPercentPerThread), ns.hackAnalyzeThreads(server, maxMoney * toHack)));
        // return ns.hackAnalyzeThreads(server, maxMoney * 0.5);
    }


    function getHackInfo(log = true) {

        logger.canLog = log;
        let growThreads = neededGrowingThreads();
        let hackThreads = neededHackThreads();
        let weakenThreads = neededWeakenThreads(growThreads, hackThreads);

        let totalGrowRam = growRam * growThreads;
        let totalHackRam = hackRam * hackThreads;
        let totalWeakenRam = weakenRam * weakenThreads;

        let totalRam = totalGrowRam + totalHackRam + totalWeakenRam + manager1Ram;
        let growTime = ns.getGrowTime(server) / 1000;
        let hackTime = ns.getHackTime(server) / 1000;
        let weakenTime = ns.getWeakenTime(server) / 1000;

        let totalTime = Math.max(growTime, hackTime, weakenTime) * 1000;

        let availableRam = getServerAvailableRam(ns, ns.getServer(currentServer));

        let scale = availableRam / totalRam;
        if (scale > 1)
            scale = 1;
        else if (scale < 1) {
            logger.log(`Scaling down to ${scale}`);

            scale -= 0.02;
        }

        let growThreadsScaled = Math.floor(growThreads * scale);
        let hackThreadsScaled = Math.floor(hackThreads * scale);
        let weakenThreadsScaled = Math.floor(weakenThreads * scale);

        let growRamScaled = growThreadsScaled * growRam;
        let hackRamScaled = hackThreadsScaled * hackRam;
        let weakenRamScaled = weakenThreadsScaled * weakenRam;

        let totalRamScaled = growRamScaled + hackRamScaled + weakenRamScaled + manager1Ram;

        // coordinate the threads so that hack executes first, grow second and weaken last, with the least amount of time


        logger.info(`\tServer: ${server}`);
        logger.info(`\tGrow: ${growThreads} threads, ${totalGrowRam} ram, ${growTime} seconds`);
        logger.info(`\tHack: ${hackThreads} threads, ${totalHackRam} ram, ${hackTime} seconds`);
        logger.info(`\tWeaken: ${weakenThreads} threads, ${totalWeakenRam} ram, ${weakenTime} seconds`);
        logger.info(`\tTotal: ${totalRam} ram, ${growTime + hackTime + weakenTime} seconds`);
        logger.info(`\tAvailable Ram: ${availableRam}`);
        let ramUsage = totalRamScaled / availableRam;
        logger.info(`\tTotal: ${ramUsage}`);


        return {
            growThreads: growThreadsScaled,
            hackThreads: hackThreadsScaled,
            weakenThreads: weakenThreadsScaled,
            totalRam: totalRamScaled,
            growTime,
            hackTime,
            weakenTime,
            ramUsage,
            totalTime,
            weakenRam,
            growRam,
            hackRam,
            realServer,
            realCurrentServer,

        }


    }

    return {
        getHackInfo,
        neededWeakenThreads,
        neededGrowingThreads,
        neededHackThreads
    }
}
