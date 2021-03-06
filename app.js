var app = new Vue({
	el: '#app',
	data: {
		machine: null,
		spinning: false,
		addresses: [],
		address: null,
		found_address: null,
		coins: window.coins,
		faq: window.faq
	},
	mounted: function() {
		this.initMachine();
		for (var code in this.coins) {
			this.initCoin(this.coins[code]);
		}
	},
	methods: {
		initMachine: function() {
			this.machine = new CryptoSlots({
				elem: '.machine',
				before_spin: function() {
					app.spinning = true;
				},
				after_spin: function() {
					app.spinning = false;
					app.address = app.found_address;
					app.addresses.unshift(app.address);
				}
			});
		},
		initCoin: function(coin) {
			$.ajax('https://api.cryptonator.com/api/ticker/'+coin.code+'-usd',{
				success: function(data) {
					coin.price = parseFloat(data.ticker.price);
				}
			});
		},
		pickRandomCoin: function() {
			var keys = Object.keys(this.coins);
			return this.coins[keys[Math.floor(keys.length * Math.random())]];
		},
		createPair: function(coin) {
			return coinkey.createRandom(coininfo(coin.code));
		},
		checkBalance: function(coin, address, callback) {
			//callback(0);
			var url = coin.api.url.replace('{address}',address);
			var success = function(data) {
				callback(coin.api.callback(data));
			}
			if (coin.api.proxy) {
				$.ajax('proxy.php',{
					data: {
						csurl: url
					},
					success: (data) => {return success(JSON.parse(data))},
					error: this.getLucky
				});
			} else {
				$.ajax(url,{
					success: success,
					error: this.getLucky
				});
			}
		},
		generateDraw: function(address) {
			var coin = address.coin.name.toLowerCase();
			if (address.amount > 0) {
				// If there is an amount => Jackpot 5 same coin
				return [coin,coin,coin,coin,coin];
			}
			// First col is the address's coin
			var draw = [coin];
			var good = 1;
			// 2nd, 3rd and 4th are random with a 1/3 probability for the same as 1st
			// The 5th also as a 1/3 probability if there isn't already 4 good coins
			// Otherwise, the 5th will never be the same coin
			for (var i = 0; i < 4; i++) {
				if (good < 4 && Math.floor(Math.random()*3) == 0) {
					draw.push(coin);
					good++;
				} else {
					var randomCoin;
					do {
						randomCoin = this.pickRandomCoin().name.toLowerCase();
					} while (randomCoin == coin);
					draw.push(randomCoin);
				}
			}

			return draw;
		},
		getLucky: function() {

			var coin = this.pickRandomCoin();
			var pair = this.createPair(coin);

			this.machine.spin();

			address = pair.publicAddress;

			var start_timestamp = (+ new Date());
			this.checkBalance(coin, address, function(amount) {

				if (amount > 0) {
					alert('OMG!!! You found an address with coins on it!!');
				}

				var address = {
					coin: coin,
					amount: amount,
					price: amount * (coin.price || 0),
					pair: pair
				};

				this.found_address = address;

				var duration = (+ new Date())-start_timestamp;
				var machine_time_left = (1000 - duration) > 0 ? (1000 - duration) : 1;
				setTimeout(function() {
					this.machine.setDraw(this.generateDraw(address));
					this.machine.stop();
				}.bind(this),machine_time_left);

			}.bind(this));
		}
	}
});
