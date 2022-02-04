const Discord = require('discord.js');
const { Client, Intents, MessageAttachment, MessageEmbed } = Discord;
const { token, defaultPrefix, mongoPath } = require('./config.json');
const fs = require('fs');
const rp = require('request-promise');
const mongoose = require("mongoose");
const cache = {};
const settingsSchema = require("./schemas/settings-schema");
const symbolToId = {};
const ids = [];
const getSymbolToId = {
	method: 'GET',
	uri: 'https://api.coingecko.com/api/v3/coins/list/',
	json: true,
	gzip: true
};

rp(getSymbolToId).then( async (response) => {
	response.forEach(e => {
		symbolToId[e.symbol] = e.id;
        ids.push(e.id);
	})
    symbolToId["eth"] = "ethereum";
}).catch((err) => {
	console.log('Symbol => Slug Error:', err.message);
});

module.exports = {
	cache: cache,
	symbolToId: symbolToId,
	ids: ids
}

const client = new Client({
    partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]
});

client.commands = new Discord.Collection();
client.cooldowns = new Discord.Collection();
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
	client.guilds.cache.forEach(guild => {
		console.log(`${guild.name} | ${guild.id}`);
	})
});

client.on('guildCreate', async (guild) => {
	console.log(`Joined Guild: ${guild.name}`);
})

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
	const commandName = args.shift().toLowerCase();
	const command = client.commands.get(commandName);
	const { cooldowns } = client;

	if (!client.commands.has(commandName)) return;

	if (!cooldowns.has(command.name)) {
		cooldowns.set(command.name, new Discord.Collection());
	}

	const now = Date.now();
	const timestamps = cooldowns.get(command.name);
	const cooldownAmount = (command.cooldown || 0) * 1000;

	if (timestamps.has(message.author.id)) {
		const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

		if (now < expirationTime) {
			const timeLeft = (expirationTime - now) / 1000;
			return message.reply(`Please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.`);
		}
	}

	timestamps.set(message.author.id, now);
	setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

	try {
		client.commands.get(commandName).execute(message, args, client);
	} catch (error) {
		console.error(error);
		message.reply('there was an error trying to execute that command!');
	}
});



client.login(token);