import { NS } from "Bitburner"

/**
 * 
 * @param {NS} ns 
 */
export async function main(ns: NS) {
    let server = ns.args[0] as string;

    await ns.grow(server);
}