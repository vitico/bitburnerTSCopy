import { getData, getServerAvailableRam } from "/bin/utils/analyze";
import { NetscriptPort, NS } from "Bitburner";
import { canHack } from "/lib/utils";
import { TermLogger } from "/lib/Helpers";

export async function main(ns: NS) {
    ns.disableLog("ALL");
    let server = ns.args[0] as string;
    let identifier = ns.args[1] as number;
    let runner = ns.getHostname();
    let logger = new TermLogger(ns, runner);
    let availableRam = getServerAvailableRam(ns, runner);
    let port = identifier;
    function getValueOfPort(port: number) {
        let val = ns.peek(port);
        // logger.log(`port(1) = ${val}`);

        return val;

    }
    let data = getData(ns, server, runner).getHackInfo(false);
    // await ns.exec('/bin/hack/weaken.js', runner, availableRam / data.weakenRam, server)
    // await ns.exec('/bin/hack/grow.js', runner, availableRam / data.growRam, server)
    // await ns.exec('/bin/hack/weaken.js', runner, availableRam / data.weakenRam, server)


    if (!canHack(ns, server, runner, availableRam))
        return;

    while (true) {
        let data = getData(ns, server, runner).getHackInfo(false);
        let counter = 0;
        ns.clearPort(port)
        while (canHack(ns, server, runner, availableRam)) {
            availableRam -= data.totalRam;
            ns.exec(`/bin/hack.js`, runner, 1, server, ns.getHostname(), identifier, (counter++).toString());
            await ns.sleep(20);
        }
        await ns.writePort(port, counter);
        let toWait = data.totalTime + (Math.random() * 1000) + 1000;
        logger.info(`Waiting ${toWait / 1000} seconds at ${new Date().toLocaleTimeString()} ${data.totalTime / 1000}`);
        if ((toWait / 1000) > 1000) {
            logger.log(JSON.stringify({ data, toWait }))
        }
        await ns.sleep(1000)
        while (getValueOfPort(port) > 0)
            await ns.sleep(1000);

        logger.info(`Finished wait at ${new Date().toLocaleTimeString()}`);
        availableRam = getServerAvailableRam(ns, runner);

    }
}