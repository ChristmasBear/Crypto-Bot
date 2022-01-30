const settingsSchema = require("../schemas/settings-schema");
const { Permissions } = require('discord.js');
const { cache } = require('../index');
const currencies = require("../currencies.json");

module.exports = {
    name: "setcur",
    async execute(message, args, client) {
        if (!message.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) return message.reply("no perms");
        if (args.length === 1) {
            if (!currencies.includes(args[0])) return message.reply(`Invalid currency: \`${args[0].toUpperCase()}\``);
            await settingsSchema.findOneAndUpdate({ _id: message.guild.id }, {
                defaultCurrency: args[0]
            }, { upsert: true });
            cache[message.guild.id].defaultCurrency = args[0];
            message.reply(`You have successfully changed the default currency to: \`${args[0].toUpperCase()}\``);
        }
    }
}