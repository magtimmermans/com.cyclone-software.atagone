'use strict';

const Homey = require('homey');
const request = require('request');
const AtagOne = require('./atagone');

let host = '';

class AtagOneDriver extends Homey.Driver {

	onInit() {
		this.log('Init driver');

		this.registerFlowCards();
	}

	registerFlowCards() {
		this._triggers = {
			trgTempChanged: new Homey.FlowCardTriggerDevice('inside_temp_changed').register(),
			trgOutsideTempChanged: new Homey.FlowCardTriggerDevice('outside_temp_changed').register(),
			trgWaterTempChanged: new Homey.FlowCardTriggerDevice('dhw_water_temp_changed').register(),
			trgHeatingChanged: new Homey.FlowCardTriggerDevice('heating_changed').register(),
			trgPressureChanged: new Homey.FlowCardTriggerDevice('pressure_changed').register(),
			trgBurningHoursChanged: new Homey.FlowCardTriggerDevice('my_burning_hours_changed').register(),
			trgHeatingWaterTempChanged: new Homey.FlowCardTriggerDevice('heatingwater_temp_changed').register(),
			trgHeatingReturnWaterTempChanged: new Homey.FlowCardTriggerDevice('heatingreturnwater_temp_changed').register(),
		};

		this._conditions = {
			cndTempAbove: new Homey.FlowCardCondition('temp_above').register().registerRunListener((args, state) => {
				if (args.device.hasOwnProperty('report')) {
					if (args.device.report) return Promise.resolve(args.device.report.room_temp > args.temp);
				} else { return Promise.resolve(false); }
			}),
			cndOutSideTempAbove: new Homey.FlowCardCondition('buitentemp_above').register().registerRunListener((args, state) => {
				if (args.device.hasOwnProperty('report')) {
					if (args.device.report) return Promise.resolve(args.device.report.outside_temp > args.temp);
				} else { return Promise.resolve(false); }
			}),
		};
	}

	onPair(socket) {
		console.log('onPair');

		socket.on('search_devices', (data, callback) => {

			let ao = new AtagOne(null);
			ao.FindDev((err, data) => {
                if (!err) {
                    callback(null, data[0]); /// only first device, I assume people has no 2 ATAG Ones :)
                }
            });
		});
		socket.on('pair_device', (data, callback) => {
			if (data) {
				let ao = new AtagOne(data);
				ao.pair((err, authorized) => {
                    host = data;
                    callback(err, authorized);
                });
			} else {callback(true, 'no ip-address found');}
		});


		socket.on('list_devices', (data, callback) => {
			let devices = [];

			let ao = new AtagOne(host);

			ao.FindDev((err, atags) => {
             
                if (!err) {
                    atags.forEach(dev => {
                        console.log(dev);
                        devices.push({
                            data: {
                                id: dev.devid,
                                ip: dev.ip
                            },
                            name: 'Atag One'
                        });                        
                    });
                    callback( null, devices );
                } 
                callback(true,"No devices found");           
            });
		});

		socket.on('add_device', (device, callback) => {
			console.log(`add_device:${  device}`);
		});


	}

}


module.exports = AtagOneDriver;
