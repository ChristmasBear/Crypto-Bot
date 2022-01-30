const settingsSchema = require("../schemas/settings-schema");
const { Permissions } = require('discord.js');
const { cache } = require('../index');

module.exports = {
    name: "setprefix",
    async execute(message, args, client) {
        if (!message.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) return message.reply("no perms");
        if (args.length === 1) {
            await settingsSchema.findOneAndUpdate({ _id: message.guild.id }, {
                prefix: args[0]
            }, { upsert: true });
            cache[message.guild.id].prefix = args[0];
            message.reply(`You have successfully changed the prefix to: \`${args[0].toUpperCase()}\``);
            message.guild.me.setNickname(`[${args[0]}] Crypto Bot`);
        }
    }
}