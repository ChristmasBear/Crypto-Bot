const Discord = require('discord.js');
const { Client, Intents, MessageAttachment, MessageEmbed } = Discord;
const { token, defaultPrefix, mongoPath } = require('./config.json');
const fs = require('fs');
const mongoose = require("mongoose");
const cache = {};
const settingsSchema = require("./schemas/settings-schema");
module.exports = {
	cache: cache
}

const client = new Client({
    partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]
});

client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if (Array.isArray(command.name)) {
        command.name.forEach(e => {
            client.commands.set(e, command);
        })
    } else {
        client.commands.set(command.name, command);
    }
}

client.once('ready', async () => {
	console.log('Ready!');
	await mongoose.connect(mongoPath).then(() => {
		console.log("Connected to MongoDB!");
	})
});

client.on('messageCreate', async (message) => {
	if (!cache[message.guild.id]) {
		cache[message.guild.id] = await settingsSchema.findOne({_id: message.guild.id});
		if (!cache[message.guild.id]) {
			cache[message.guild.id] = {};
		}
		if (!cache[message.guild.id] || !cache[message.guild.id].defaultCurrency) {
			await settingsSchema.findOneAndUpdate({ _id: message.guild.id }, {
				defaultCurrency: 'usd'
			}, { upsert: true });

			cache[message.guild.id].defaultCurrency = 'usd';
		}
		if (!cache[message.guild.id] || !cache[message.guild.id].prefix) {
			await settingsSchema.findOneAndUpdate({ _id: message.guild.id }, {
				prefix: "_"
			}, { upsert: true });

			cache[message.guild.id].prefix = '_';
		}
	}
	const prefix = (cache[message.guild.id] && cache[message.guild.id].prefix) ? cache[message.guild.id].prefix : defaultPrefix;
	if (!message.content.startsWith(prefix) || message.author.bot) return;

	const args = message.content.slice(prefix.length).trim().split(/ +/);
	const command = args.shift().toLowerCase();

	if (!client.commands.has(command)) return;

	try {
		
		client.commands.get(command).execute(message, args, client);
	} catch (error) {
		console.error(error);
		message.reply('there was an error trying to execute that command!');
	}
});



client.login(token);