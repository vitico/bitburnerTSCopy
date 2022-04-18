import { NS } from "Bitburner";
import { TermLogger } from "/lib/Helpers";

const basePath = "/bin/hack/";
export function getServerAvailableRam(ns: NS, server: string): number {
    let ram = ns.getServerMaxRam(server);
    let usedRam = ns.getServerUsedRam(server);
    return ram - usedRam;
}
export function getData(ns: NS, server: string, runnerServer: string = "") {
    let logger = new TermLogger(ns);

    let hackRam = ns.getScriptRam(basePath + "hack.js");
    let growRam = ns.getScriptRam(basePath + "grow.js");
    let weakenRam = ns.getScriptRam(basePath + "weaken.js");

    let minSecurity = ns.getServerMinSecurityLevel(server);
    let maxMoney = ns.getServerMaxMoney(server);
    let currentServer = runnerServer || ns.getHostname();
    let realCurrentServer = ns.getServer(currentServer);
    let cores = realCurrentServer.cpuCores;
    function neededWeakenThreads(GrowThreads: number, HackThreads: number) {
        let security = ns.getServerSecurityLevel(server);
        // how many threads are needed to weaken the server. knowning that each weaken reduces security by 0.05, and each grow up security by 0.004 and hack by 0.002
        let neededWeakenThreads = ((security - minSecurity) + (ns.hackAnalyzeSecurity(HackThreads, server) + ns.growthAnalyzeSecurity(GrowThreads, server, cores))) / ns.weakenAnalyze(1, cores);

        return neededWeakenThreads;
    }
    function neededGrowingThreads() {
        let money = ns.getServerMoneyAvailable(server);
        // how many threads are needed to grow the server to maxMoney. 
        let neededMoney = Math.ceil(Math.max(maxMoney / (money * 0.5), 2));
        if (money == 0) return 0;
        logger.log(`Needed money: ${neededMoney}`);
        return Math.ceil(ns.growthAnalyze(server, neededMoney, cores));
    }
    function neededHackThreads() {
        // how many threads are needed to hack the server to get 50%. 
        let hackPercentPerThread = ns.hackAnalyze(server);// 0.01 = 1%
        if (hackPercentPerThread == 0) return 0;


        return Math.floor(0.1 / hackPercentPerThread);
        // return ns.hackAnalyzeThreads(server, maxMoney * 0.5);
    }


    function getHackInfo(log = true) {
        if (!log)
            logger = { info: () => { }, err: () => { }, warn: () => { }, ns, log: () => { }, trace: () => { } };
        let growThreads = neededGrowingThreads();
        let hackThreads = neededHackThreads();
        let weakenThreads = neededWeakenThreads(growThreads, hackThreads);

        let totalGrowRam = growRam * growThreads;
        let totalHackRam = hackRam * hackThreads;
        let totalWeakenRam = weakenRam * weakenThreads;

        let totalRam = totalGrowRam + totalHackRam + totalWeakenRam;

        let growTime = ns.getGrowTime(server) / 1000;
        let hackTime = ns.getHackTime(server) / 1000;
        let weakenTime = ns.getWeakenTime(server) / 1000;

        let availableRam = getServerAvailableRam(ns, currentServer);
        // coordinate the threads so that hack executes first, grow second and weaken last, with the least amount of time


        logger.info(`\tServer: ${server}`);
        logger.info(`\tGrow: ${growThreads} threads, ${totalGrowRam} ram, ${growTime} seconds`);
        logger.info(`\tHack: ${hackThreads} threads, ${totalHackRam} ram, ${hackTime} seconds`);
        logger.info(`\tWeaken: ${weakenThreads} threads, ${totalWeakenRam} ram, ${weakenTime} seconds`);
        logger.info(`\tTotal: ${totalRam} ram, ${growTime + hackTime + weakenTime} seconds`);
        logger.info(`\tAvailable Ram: ${availableRam}`);
        let ramUsage = totalRam / availableRam;
        logger.info(`\tTotal: ${ramUsage}`);

        if (totalRam > availableRam) {
            logger.info("Not enough ram to hack this server");
            logger.err(`\tTotal ram: ${totalRam} is greater than server ram: ${availableRam}`);
            return;
        }

        return {
            growThreads,
            hackThreads,
            weakenThreads,
            totalRam,
            growTime,
            hackTime,
            weakenTime,
            ramUsage

        }


    }

    return {
        getHackInfo,
        neededWeakenThreads,
        neededGrowingThreads,
        neededHackThreads
    }
}
