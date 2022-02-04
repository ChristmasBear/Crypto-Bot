const { cache, symbolToId, ids } = require('../index');
const rp = require('request-promise');

module.exports = {
    name: "convert",
    cooldown: 3,
    async execute(message, args, client) {
        if (args.length >= 1) {
            if (isNaN(args[0])) return message.reply("do _convert {amount} {coin} {}");
            if (parseFloat(args[0]) <= 0) return message.reply("Please input an amount greater than 0.");
            if (!symbolToId[args[1]]) return message.reply("do _convert {amount} {coin}");
            const requestOptions = {
                method: 'GET',
                uri: `https://api.coingecko.com/api/v3/simple/price?ids=${symbolToId[args[1]]}&vs_currencies=${cache[message.guild.id].defaultCurrency}`,
                json: true,
                gzip: true
            };
        
            rp(requestOptions).then( async (response) => {
                message.reply(`${response[symbolToId[args[1]]][cache[message.guild.id].defaultCurrency] * parseFloat(args[0])}`)
            });
        } else {
            message.reply("no.")
        }
    }
}