import { NS } from "Bitburner";
import { getData } from "bin/utils/analyze.js";
export async function main(ns: NS) {
    let server = ns.args[0] as string;

    await getData(ns, server).getHackInfo();



}

export { getData };