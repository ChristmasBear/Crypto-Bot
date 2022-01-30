const { MessageEmbed } = require("discord.js");
const { cache } = require("../index");

module.exports = {
    name: "help",
    async execute(message, args, client) {
        if (args.length === 0) {
            const prefix = cache[message.guild.id].prefix;
            const embed = new MessageEmbed()
            .setFooter({ text: "Developed by ChristmasBear#9318"})
            .setTimestamp()
            .setTitle(`Help`)
            .setDescription("* means required(don't put this in the actual command)")
            .addFields(
                { name: `${prefix}chart`, value: `syntax: ${prefix}chart {coin}* --time {coin(e.g., eth, btc)}d/m/y --cur {currency(e.g., cad, usd)}`, inline: true},
                { name: `${prefix}setcur`, value: `syntax: ${prefix}setcur {currency(e.g., cad, usd)}*`, inline: true},
                { name: `${prefix}setmaincoin`, value: `syntax: ${prefix}setmaincoin {coin(e.g., eth, btc)}*`, inline: true},
                { name: `${prefix}setprefix`, value: `syntax: ${prefix}setcur {prefix}*`, inline: true},
            )
             message.channel.send({ embeds: [ embed ] });
        }
    }
}