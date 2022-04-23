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

export async function main(ns: NS) {
    console.log('Started monitor');

    let showNonRooted = true;
    let showNonHackable = false;

    const eventQueue = new EventHandlerQueue();

    
    function serverFlatList(servers: HSServer[]) {
        return servers.reduce((acc, server) => {
            acc.push(server);
            if (server.children) {
                acc.push(...serverFlatList(server.children));
            }
            return acc;
        }, [] as HSServer[]);
    }
    const servers = serverFlatList( scanDeep(ns));
            
    console.log(servers);
    // servers.splice(0, 0, { hostname: 'home', route: [] });

    while (true) {
        const player = ns.getPlayer();

        const filteredServers = servers.map(s => ({ ...s, server: ns.getServer(s.hostname) })).filter(({ server }) => (
            (showNonRooted || server.hasAdminRights) &&
            (showNonHackable || server.requiredHackingSkill <= player.hacking)
        ));

        ns.tail();
        renderCustomModal(ns,
            <div id='custom-monitor' style={{ fontSize: '0.75rem' }}>
                <style children={css`
                    #custom-monitor th,
                    #custom-monitor td {
                        padding-right: 12px;
                    }
                    #custom-monitor th {
                        text-align: left;
                    }
                    #custom-monitor thead > * {
                        border-bottom: 1px solid green;
                    }
                    #custom-monitor tr:hover {
                        background: rgba(255, 255, 255, 0.1);
                    }
                `} />
                <div style={toolbarStyles}>
                    <button onClick={() => showNonRooted = !showNonRooted}>
                        {showNonRooted ? 'Show' : 'Hide'} non-rooted
                    </button>
                    <button onClick={() => showNonHackable = !showNonHackable}>
                        {showNonHackable ? 'Show' : 'Hide'} non-hackable
                    </button>
                </div>
                <table style={{ borderSpacing: 0, whiteSpace: 'pre' }}>
                    <thead>
                        <th>Server</th>
                        <th>R</th>
                        <th>BD</th>
                        <th>U-RAM</th>
                        <th>M-RAM</th>
                        <th>$</th>
                        <th>Max $</th>
                        <th>Sec</th>
                        <th>MSec</th>
                        <th>Tools</th>
                    </thead>
                    <tbody>
                        {filteredServers.map(({ hostname, level, server }) => {
                            const onKillAllClick = eventQueue.wrap(() => {
                                ns.ps(hostname).forEach(x => ns.kill(x.pid));
                            });
                            const onConnectClick = eventQueue.wrap(() => {
                                ns.tprint(`Connecting to ${hostname}...`);
                                let path = directConnect(ns, hostname).split(" -> ").reverse();
                                let val = path.pop();
                                do{
                                    ns.tprint(val);
                                    val = path.pop();
                                    
                                }while(val != undefined)

                            });
                            return (
                                <tr key={hostname}>
                                    <th>{"".padStart(level * 3," ")} {hostname.trim()}</th>
                                    <td>{server.hasAdminRights ? 'X' : ' '}</td>
                                    <td>{server.backdoorInstalled ? 'X' : ' '}</td>
                                    <td>{Math.round(server.ramUsed * 10) / 10}</td>
                                    <td>{server.maxRam}</td>
                                    <td style={{ color: getColorScale(server.moneyAvailable / server.moneyMax) }}>
                                        {ns.nFormat(server.moneyAvailable, '$0.00a')}
                                    </td>
                                    <td style={{ color: getColorScale(server.moneyAvailable / server.moneyMax) }}>
                                        {ns.nFormat(server.moneyMax, '$0.00a')}
                                    </td>
                                    <td style={{ color: getColorScale(1 - (server.hackDifficulty - server.minDifficulty) / 10) }}>
                                        {Math.round(server.hackDifficulty * 100) / 100}
                                    </td>
                                    <td>
                                        {server.minDifficulty}
                                    </td>
                                    <td>
                                        <button onClick={onConnectClick} title='Connect to this server'>
                                            C
                                        </button>
                                        <button onClick={onKillAllClick} title='Kill all scripts on this server'>
                                            K
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
