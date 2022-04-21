import { NS } from "Bitburner";
import { getAlLServers } from "/lib/utils";

export async function main(ns: NS) {
    let servers = new Set<string>();
    getAlLServers(ns, ns.getHostname(), servers);

}