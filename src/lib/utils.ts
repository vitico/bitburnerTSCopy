import { NS, Server } from "Bitburner";
import { getServerAvailableRam, getData, getServerAvailableRam2 } from "/bin/utils/analyze";

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

export interface HSServer {
    // server: Server;
    hostname: string;
    ports: number;
    children: HSServer[];
    ram: number;
    route: string;
    level: number;
    parent?: HSServer;
}

function serverFlatList(servers: HSServer[]) {
    return servers.reduce((acc, server) => {
        acc.push(server);
        if (server.children) {
            acc.push(...serverFlatList(server.children));
        }
        return acc;
    }, [] as HSServer[]);
}

export function scanDeep(ns: NS, parentServer?: HSServer, scanned?: Set<string>): HSServer[] {
    if (parentServer == undefined) {
        parentServer = {
            hostname: ns.getHostname(),
            ports: ns.getServerNumPortsRequired(ns.getHostname()),
            children: [] as HSServer[],
            ram: ns.getServerMaxRam(ns.getHostname()),
            route: "",
            level: 0,
            parent: undefined

        }
    }
    if (scanned == undefined) scanned = new Set<string>([ns.getHostname()]);
    let children = ns.scan(parentServer.hostname);

    for (let child of children) {
        if (scanned.has(child) || child == parentServer.hostname) continue;
        scanned.add(child);

        let childServer: HSServer = {
            hostname: child,
            ports: ns.getServerNumPortsRequired(child),
            children: [],
            ram: ns.getServerMaxRam(child),
            route: parentServer.route + "\t",
            level: parentServer.level + 1,
            parent: parentServer
        }

        parentServer.children.push(childServer);
    }

    for (let child of parentServer.children) {
        scanDeep(ns, child, scanned);
    }

    if (parentServer.hostname == ns.getHostname()) {
        console.log("returning", parentServer);
        return [parentServer];
    }

    return parentServer.children;
}

export function directConnect(ns: NS, server: string): string {
    let servers = scanDeep(ns);
    let serverList = serverFlatList(servers);
    let serverIndex = serverList.findIndex(s => s.hostname == server);
    let realServer = serverList[serverIndex];
    function constructPath(server: HSServer) {
        if (server.parent == undefined) return server.hostname;
        return constructPath(server.parent) + " -> " + server.hostname;
    }
    let path = constructPath(realServer);
    console.log(path);
    return path;

}