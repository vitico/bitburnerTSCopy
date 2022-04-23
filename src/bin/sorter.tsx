import { NS } from 'Bitburner';
import type React_Type from 'react';
import renderCustomModal, { css, EventHandlerQueue } from '/lib/renderCustomModal';
import { directConnect, HSServer, scanDeep } from '/lib/utils';

declare var React: typeof React_Type;

function getColorScale(v: number) {
    return `hsl(${Math.max(0, Math.min(1, v)) * 130}, 100%, 50%)`;
}

const toolbarStyles: React_Type.CSSProperties = {
    lineHeight: '30px',
    alignItems: 'center',
    display: 'flex',
    gap: 16,
    margin: 8,
};

type serverTime = {
    totalTime: number,
    growTime: number,
    hackTime: number,
    wt: number,
    count: number,
    maxMoney: number,
    hackPercent: number,
    moneyPerRun: number,
    moneyPerSecond: number,
    moneyAvailable: number,
    hostname: string
}

function parseServers(ns: NS, servers: HSServer[]) {
    let serverTimes: serverTime[] = [];
    let player = ns.getPlayer();
    let growTime, hackTime, wt, totalTime, count = 0, hackPercent, maxMoney, moneyPerRun;
    let hasFormulas = ns.fileExists("Formulas.exe");
    for (let server of servers) {
        var realServer = ns.getServer(server.hostname);
        realServer.hackDifficulty = realServer.minDifficulty;
        growTime = hasFormulas ? ns.formulas.hacking.growTime(realServer, player) / 1000 : ns.getGrowTime(server.hostname);
        hackTime = hasFormulas ? ns.formulas.hacking.hackTime(realServer, player) / 1000 : ns.getHackTime(server.hostname);
        wt = hasFormulas ? ns.formulas.hacking.weakenTime(realServer, player) / 1000 : ns.getWeakenTime(server.hostname);
        hackPercent = hasFormulas ? ns.formulas.hacking.hackPercent(realServer, player) : 0.1;
        maxMoney = realServer.moneyMax;
        moneyPerRun = maxMoney * hackPercent;
        totalTime = Math.max(growTime, hackTime, wt);
        if (realServer.requiredHackingSkill > player.hacking) continue;
        if (realServer.moneyAvailable > 0)
            serverTimes.push({
                totalTime, growTime, hackTime, wt, count, maxMoney, hackPercent, moneyPerRun,
                moneyPerSecond: moneyPerRun / totalTime,
                moneyAvailable: realServer.moneyAvailable,
                hostname: server.hostname
            });

        count++;
    }
    serverTimes = serverTimes.sort((a, b) => {
        return a.moneyPerSecond - b.moneyPerSecond;
    })

    return serverTimes;
}

export async function main(ns: NS) {
    console.log('Started monitor');


    const eventQueue = new EventHandlerQueue();



    while (true) {


        ns.tail();

        function serverFlatList(servers: HSServer[]) {
            return servers.reduce((acc, server) => {
                acc.push(server);
                if (server.children) {
                    acc.push(...serverFlatList(server.children));
                }
                return acc;
            }, [] as HSServer[]);
        }
        const servers = parseServers(ns, serverFlatList(scanDeep(ns)));

        renderCustomModal(ns,
            <div className="custom-monitor" style={{ fontSize: '0.75rem' }}>
                <style children={css`
                    .custom-monitor th,
                    .custom-monitor td {
                        padding-right: 12px;
                    }
                    .custom-monitor th {
                        text-align: left;
                    }
                    .custom-monitor thead > * {
                        border-bottom: 1px solid green;
                    }
                    .custom-monitor tr:hover {
                        background: rgba(255, 255, 255, 0.1);
                    }
                `} />
                <table style={{ borderSpacing: 0, whiteSpace: 'pre' }}>

                    <thead>
                        <th>Server</th>
                        <th>Time</th>
                        <th>$ run</th>
                        <th>$ escond</th>
                        <th>$</th>
                        <th>Tools</th>
                    </thead>
                    <tbody>
                        {servers.map((server) => {
                            const onClickManage = eventQueue.wrap(async () => {
                                ns.scriptKill("bin/hack.js", ns.getHostname());
                                ns.scriptKill("bin/manager.js", ns.getHostname());
                                let port = await ns.prompt("in what port do you want to start the manager?", {
                                    type: "select", choices: [
                                        "1",
                                        "2",
                                        "3",
                                        "4",
                                        "5",
                                        "6",
                                        "7",
                                        "8",
                                        "9",
                                        "10",
                                        "11",
                                        "12",
                                        "13",
                                        "14",
                                        "15",
                                        "16",
                                        "17",
                                        "18",
                                        "19",
                                        "20"
                                    ]
                                });
                                if (!port) return;
                                ns.run("bin/manager.js", 1, "-s", server.hostname, "-p", port);
                            });
                            return (
                                <tr key={server.hostname}>
                                    <th>{server.hostname.trim()}</th>
                                    <td>{ns.tFormat(server.totalTime * 1000)}</td>
                                    <td>{ns.nFormat(server.moneyPerRun, "$0.00a")}</td>
                                    <td>{ns.nFormat(server.moneyPerSecond, "$0.00a")}</td>
                                    <td>{ns.nFormat(server.moneyAvailable, "$0.00a")}</td>
                                    <td>
                                        <button onClick={onClickManage} title='Manage this server'>
                                            M
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
        await eventQueue.executeEvents();
        await ns.sleep(1_000);
    }
}
