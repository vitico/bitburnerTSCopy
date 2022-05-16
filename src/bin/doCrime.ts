import { CrimeStats, NS } from "Bitburner";
type Crime = {
    crime: string, // the crime name
    chance: number, // 0-100
    stats: CrimeStats

}
export async function main(ns: NS) {

    // let crimes = [
    //     "Shoplift",
    //     "Rob store",
    //     "Mug someone",
    //     "Larceny",
    //     "Deal Drugs",
    //     "Bond Forgery",
    //     "Traffick illegal Arms",
    //     "Homicide",
    //     "Grand Theft Auto",
    //     "Kidnap and Ransom",
    //     "Assassinate",
    //     "Heist"
    // ].map(crime => ({
    //     crime,
    //     // chance: ns.singularity.getCrimeChance(crime),
    //     stats: ns.singularity.getCrimeStats(crime)
    // }));

    // ns.tprint(crimes);
    const members = ns.gang.getMemberNames().map(t => ({
        member: t,
        stats: ns.gang.getMemberInformation(t),
        ascension: ns.gang.getAscensionResult(t),
    }));
    const equipments = ns.gang.getEquipmentNames()
    const info = ns.gang.getGangInformation();

    ns.tprint(JSON.stringify({
        members,
        equipments,
        info
    }, undefined, 2));

}