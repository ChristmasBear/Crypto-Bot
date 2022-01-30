const settingsSchema = require("../schemas/settings-schema");
const { Permissions } = require('discord.js');
const { cache } = require('../index');
const { symbolToId } = require("./chart")

module.exports = {
    name: "setmaincoin",
    async execute(message, args, client) {
        if (!message.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) return message.reply("no perms");
        if (!symbolToId[args[0]]) return message.reply("not a valid coin");
        if (args.length === 1) {
            await settingsSchema.findOneAndUpdate({ _id: message.guild.id }, {
                mainCoin: args[0]
            }, { upsert: true });
            cache[message.guild.id].mainCoin = args[0];
            message.reply(`You have successfully changed default coin to: \`${args[0].toUpperCase()}\``);
        }
    }
}