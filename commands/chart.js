const Discord = require('discord.js');
const { MessageAttachment, MessageEmbed } = Discord;
const rp = require('request-promise');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const emojis = require("../emojis.json");
const defaultCurrencyCache = {};
const { cache, symbolToId, ids } = require('../index');
const settingsSchema = require("../schemas/settings-schema");
const currencies = require("../currencies.json");

const months = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.", "Jul.", "Aug", "Sep.", "Oct.", "Nov.", "Dec. "];

const width = 1600;
const height = 1000;

module.exports = {
    name: "chart",
    cooldown: 5,
    async execute(message, args, client) {
        if (args.length === 0) {
            if (cache[message.guild.id] && cache[message.guild.id].mainCoin) {
                args = [cache[message.guild.id].mainCoin]
            } else {
                return message.reply("invalid syntax");
            }
        }
        let currency = cache[message.guild.id].defaultCurrency;
        if (args.includes("--cur")) {
            currency = args[args.indexOf("--cur")+1].toLowerCase();
            if (!currencies.includes(currency)) return message.reply(`Invalid currency: \`${currency.toUpperCase()}\``);
        }
        let time = "1";
        if (args.includes("--time")) {
            time = args[args.indexOf("--time")+1].toLowerCase();
            if (time.endsWith('d')) time = parseInt(time.slice(0, -1));
            else if (time.endsWith('m')) {
                time = parseInt(time.slice(0, -1));
                time *= 30;
            } else if (time.endsWith('y')) {
                time = parseInt(time.slice(0, -1));
                time *= 365;
            } else if (time === 'all') {
                time = 'max';
            }
        }
        if (time != 'max' && !Number.isInteger(Number(time))) return message.reply(`Invalid time period: \`${time.toUpperCase()}\``);
        let symbol = symbolToId[args[0].toLowerCase()];
        const idk = ids.includes(args[0]);
        if (idk) symbol = args[0].toLowerCase();

        if (symbol === undefined) return message.reply(`Could not recognise given token: \`${args[0]}\``);
        
        const requestOptions = {
            method: 'GET',
            uri: `https://api.coingecko.com/api/v3/coins/${symbol}/market_chart?vs_currency=${currency}&days=${time}&interval=hourly`,
            json: true,
            gzip: true
        };
    
        rp(requestOptions).then( async (response) => {
            const dottedLine = [], prices = [], dates = [];
            
            response.prices.forEach(e => {
                let date = new Date(e[0]);
                dates.push(months[date.getUTCMonth()] + ` ${date.getUTCDate()}`);
                prices.push(e[1]);
                dottedLine.push(prices[0]);
            });
            const canvas = new ChartJSNodeCanvas({ width, height });

            let gradient, width_, height_;
            function getGradient(ctx, chartArea, scales, transparent) {
                const chartWidth = chartArea.right - chartArea.left;
                const chartHeight = chartArea.bottom - chartArea.top;
                if (gradient === null || width_ !== chartWidth || height_ !== chartHeight) {
                    const pointZero = scales.y.getPixelForValue(prices[0])
                    const pointZeroHeight = pointZero - chartArea.top;
                    const pointZeroPercentage = pointZeroHeight / chartHeight;
                    width_ = chartWidth;
                    height_ = chartHeight;
                    gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartHeight + chartArea.top);
                    gradient.addColorStop(pointZeroPercentage, (transparent) ? 'rgba(22, 199, 132, 0.35)' : '#16c784');
                    gradient.addColorStop(pointZeroPercentage, (transparent) ? 'rgba(234, 57, 67, 0.35)' : '#ea3943');
                }
                return gradient;
            }

            const config = {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [
                        {
                            label: 'ETH Price',
                            data: prices,
                            pointRadius: 0,
                            fill: 1,
                            backgroundColor: function(context) {
                                const chart = context.chart;
                                const { ctx, chartArea, scales } = chart;
                                if (!chartArea) return null;
                                return getGradient(ctx, chartArea, scales, true);
                            },
                            borderColor: function(context) {
                                const chart = context.chart;
                                const { ctx, chartArea, scales } = chart;
                                if (!chartArea) return null;
                                return getGradient(ctx, chartArea, scales, false);
                            },
                            tension: 0.1
                        },
                        {
                            label: '',
                            data: dottedLine,
                            pointRadius: 0,
                            borderDash: [5, 5],
                            borderColor: '#a1a7bb',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    plugins: [{
                        legend: {
                            display: false,
                            labels: {
                                font: {
                                    family: "Roboto"
                                }
                            }
                        }
                    }],
                    tooltips: {
                        callbacks: {
                            label: function(tooltipItem) {
                                    return tooltipItem.yLabel;
                            }
                        },
                    },
                    scales: {
                        y: {
                            grid: {
                                color: '#40424e'
                            },
                            ticks: {
                                font: {
                                    size: 28
                                },
                                maxTicksLimit: 11,
                                minTicksLimi: 11,
                                color: "#858ca2"
                            },
                            grace: '5%',
                        },
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                font: {
                                    size: 28
                                },
                                color: "#858ca2"
                            },
                        }
                    }
                }
            }

            const image = await canvas.renderToBuffer(config)

            const attachment = new MessageAttachment(image);
            rp({
                method: 'GET',
                uri: `https://api.coingecko.com/api/v3/coins/${symbol}`,
                json: true,
                gzip: true
            }).then( async (coinData) => {
                const format = (num, isPercentage) => {
                    const isCoin = (symbolToId[currency] != undefined);
                    const decimals = (isPercentage) ? 2 : ((isCoin) ? 4 : 2);
                    var parts = (Math.round(num * 10 ** decimals) / 10 ** decimals).toString().split(".");
                    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                    return ((isCoin) ? "" : "$") + (parts.join("."));
                }
                const { market_data } = coinData;
                const embed = new MessageEmbed()
                .setAuthor({ name: `${args[0].toUpperCase()} Price Chart (${currency.toUpperCase()})`, iconURL: client.user.avatarURL, url: coinData.links.homepage[0] })
                .setThumbnail(coinData.image.large)
                .setTitle(`${format(market_data.current_price[currency])} ${(market_data.price_change_percentage_24h >= 0) ? emojis.caret_up : emojis.caret_down} `)
                .addFields(
                    { name: "24h Price Change", value: `${format(market_data.current_price[currency] * market_data.price_change_percentage_24h / 100, false)} (${(market_data.price_change_percentage_24h >= 0) ? emojis.caret_up : emojis.caret_down} ${format(market_data.price_change_percentage_24h, true)}%)`, inline: true},
                    { name: "Market Cap", value: `${format(market_data.market_cap[currency], false)} (${(market_data.market_cap_change_percentage_24h >= 0) ? emojis.caret_up : emojis.caret_down} ${format(market_data.market_cap_change_percentage_24h, true)}%)`, inline: true},
                    { name: "24h Low / 24h High", value: `${format(market_data.low_24h[currency], false)} / ${format(market_data.high_24h[currency], false)}`, inline: true },
                    { name: "24h Volume", value: `${format(market_data.total_volume[currency], false)}`, inline: true}
                )
                .setTimestamp();
                message.channel.send({ files: [ attachment ], embeds: [ embed ] });
            }).catch((error) => {
                console.log("Error:", error.message)
            })
        }).catch((err) => {
            message.reply("There was an error while processing your request. Try again using the syntax: `_chart {coin} --time {time_period}d/m/y (optional) --cur {currency}`");
            console.log(err);
        });
    },
    symbolToId: symbolToId
}