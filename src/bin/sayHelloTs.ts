import { NS } from "Bitburner";
import { TermLogger } from "/lib/Helpers";

/** @param {NS} ns **/
export async function main(ns: NS) {
    const logger = new TermLogger(ns);
    logger.log("Hello from TypeScript o/");
    logger.info("\tEverything seems to be in order :D");
    logger.warn("\tJust showing some colors");
    logger.err("Fake error, no panik");

    let serverName = ns.args[0] as string || "joesgun";
    let data = getDataOfServer(ns, serverName);
    logger.info(`\tServer: ${JSON.stringify(data, null, 2)}`);
}


/** @param {NS} ns */
export async function main2(ns: NS) {

    let servers = ns.args as string[];
    let serverTimes: any[] = [];
    let player = ns.getPlayer();
    let growTime, hackTime, wt, totalTime, count = 0, hackPercent, maxMoney, moneyPerRun, moneyPerSecond;
    for (let server of servers) {
        var realServer = ns.getServer(server);
        growTime = ns.formulas.hacking.growTime(realServer, player) / 1000;
        hackTime = ns.formulas.hacking.hackTime(realServer, player) / 1000;
        wt = ns.formulas.hacking.weakenTime(realServer, player) / 1000;
        hackPercent = ns.formulas.hacking.hackPercent(realServer, player); // 1 = 100%
        maxMoney = realServer.moneyMax;

        // how many hacks i have to do to get half of max money. Knowing that 1 hackPercent = 100% of maxMoney
        let hacksToGetHalf = Math.floor(maxMoney / (hackPercent * 2));
        moneyPerRun = maxMoney * hackPercent;


        totalTime = growTime + hackTime + wt;
        moneyPerSecond = moneyPerRun / totalTime;

        serverTimes.push({
            totalTime, growTime, hackTime, wt, count, maxMoney, hackPercent, moneyPerRun, moneyPerSecond
        });

        count++;
    }


    // remove servers that are not profitable
    serverTimes = serverTimes.filter(s => s.moneyPerRun > 0);

    //calculate wich server would generate more money based on the server with the max time
    let maxTimeServer = serverTimes.slice().sort((a, b) => b.totalTime - a.totalTime)[0];
    for (let server of serverTimes) {
        server.totalMoney = server.moneyPerRun * (maxTimeServer.totalTime / server.totalTime);
    }

    // sort servers by total money
    serverTimes = serverTimes.sort((a, b) => b.totalMoney - a.totalMoney);

    // print out the servers
    for (let server of serverTimes) {
        ns.tprint(`${servers[server.count]}. ${maxTimeServer.totalTime}s: ${server.totalMoney.toPrecision(4)}, ${server.moneyPerSecond.toPrecision(4)}/s`);
    }
}
function getDataOfServer(ns: NS, server: string) {
    var realServer = ns.getServer(server);
    let player = ns.getPlayer();
    let growTime = ns.formulas.hacking.growTime(realServer, player) / 1000;
    let hackTime = ns.formulas.hacking.hackTime(realServer, player) / 1000;
    let weakenTime = ns.formulas.hacking.weakenTime(realServer, player) / 1000;
    let hackPercent = ns.formulas.hacking.hackPercent(realServer, player); // 1 =100%
    let maxMoney = realServer.moneyMax;
    // how many hacks i have to do to get half of max money. Knowing that 1 hackPercent =100% of maxMoney
    let hacksToGetHalf = Math.floor(maxMoney / (hackPercent * 2));
    let moneyPerRun = maxMoney * hackPercent;


    let totalTime = growTime + hackTime + weakenTime;
    let moneyPerSecond = moneyPerRun / totalTime;

    return {
        totalTime, growTime, hackTime, weakenTime, server, maxMoney, hackPercent, moneyPerRun, moneyPerSecond
    }


}