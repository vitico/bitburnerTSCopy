import { NS } from "Bitburner";
import { TermLogger } from "/lib/Helpers";

/**
 * 
 * @param {NS} ns 
 */
export async function main(ns: NS) {
    let params = ns.flags(
        [
            ["p", -1],
            ["b", false],
        ]
    )

    let ramTarget = params.p == -1 ? params._[0] || 2 : 2 ** params.p;
    let logger = new TermLogger(ns);
    let price = ns.getPurchasedServerCost(ramTarget);
    let money = ns.getServerMoneyAvailable(ns.getHostname());
    logger.info(`Price of server with ${ramTarget}GB of RAM: ${price.toPrecision(4)}`);
    logger.info(`Money available: ${money.toPrecision(4)}`);
    logger.info(`Money needed: ${(price - money).toPrecision(4)}`);
    if (price < money && params.b) {
        ns.purchaseServer("hhvm", ramTarget);
    }

}    