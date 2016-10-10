'use strict';

var request = require('request');
var AtagOne = require('./atagone');

var host = '192.168.10.222'

var thermostats = {}
var number_of_devices = 0
var devices = [];

/**
 * Driver start up, re-initialize devices
 * that were already installed before driver
 * shutdown
 * @param devices_data
 * @param callback
 */
module.exports.init = function (devices_data, callback) {

		Homey.manager('flow').on('trigger.inside_temp_changed', function (callback, args) {
			Homey.log('trigger.inside_temp_changed started')
			console.log('[trigger] temp changed: ' + args)
			callback(null, true); // true to make the flow continue, or false to abort
		})
		Homey.manager('flow').on('trigger.outside_temp_changed', function (callback, args) {
			Homey.log('trigger.outside_temp_changed started')
			console.log('[trigger] temp changed: ' + args)
			callback(null, true); // true to make the flow continue, or false to abort
		})
		Homey.manager('flow').on('trigger.outside_temp_changed', function (callback, args) {
			callback(null, true); // true to make the flow continue, or false to abort
		})		

		Homey.manager('flow').on('condition.temp_above', function( callback, args ){
			var result = false;
			// Check for proper incoming arguments
			if (args != null && args.hasOwnProperty("temp") && args.hasOwnProperty("device") && args.device.id) {

				// Get device
				var device = devices[args.device.id];

				// If found and status is away return true
				if (device != null && (device.data.heatInfo.report.room_temp > args.temp) && args.device.id == device.data.id) {
					console.log("room:" + device.data.heatInfo.report.room_temp + ' args Outside:'+args.temp);
					result = true;
				}
			}
			callback(null, result);
		}); 

		Homey.manager('flow').on('condition.buitentemp_above', function( callback, args ){
			var result = false;
			// Check for proper incoming arguments
			if (args != null && args.hasOwnProperty("temp") && args.hasOwnProperty("device") && args.device.id) {

				// Get device
				var device = devices[args.device.id];

				// If found and status is away return true
				if (device != null && (device.data.heatInfo.report.outside_temp > args.temp) && args.device.id == device.data.id) {
					console.log("outside:" + device.data.heatInfo.report.outside_temp + ' args Outside:'+args.temp);
					result = true;
				}
			}
			callback(null, result);
		});

		Homey.manager('insights').createLog( 'room_temperature', {
			label: {
				en: 'Inside temperature',
				nl: 'Binnen temperatuur'
			},
			type: 'number',
			units: {
				en: 'Degrees',
				nl: 'Graden'
			},
			decimals: 1,
			chart: 'stepLine' // prefered, or default chart type. can be: line, area, stepLine, column, spline, splineArea, scatter
		}, function callback(err , success){
			//if( err ) return console.error(err);
		});		
		Homey.manager('insights').createLog( 'outside_temperature', {
			label: {
				en: 'Outside temperature',
				nl: 'Buiten temperatuur'
			},
			type: 'number',
			units: {
				en: 'Degrees',
				nl: 'Graden'
			},
			decimals: 1,
			chart: 'stepLine' // prefered, or default chart type. can be: line, area, stepLine, column, spline, splineArea, scatter
		}, function callback(err , success){
			//if( err ) return console.error(err);
		});	
		Homey.manager('insights').createLog( 'water_temperature', {
			label: {
				en: 'Water temperature',
				nl: 'Water temperatuur'
			},
			type: 'number',
			units: {
				en: 'Degrees',
				nl: 'Graden'
			},
			decimals: 1,
			chart: 'stepLine' // prefered, or default chart type. can be: line, area, stepLine, column, spline, splineArea, scatter
		}, function callback(err , success){
			//if( err ) return console.error(err);
		});	

		// when the driver starts, Homey rebooted. Initialize all previously paired devices.
		Homey.log('----devices data----')
		Homey.log(devices_data)
		Homey.log('----devices data----')
		devices_data.forEach(function(device_data){
			Homey.log('===== device data====')
			Homey.log(device_data)
			Homey.log('===== device data====')
			number_of_devices++
			Homey.log(number_of_devices)
			devices[ device_data.id ] = {
					data    : device_data,
				}
		})
		updateState(callback)

		// Start listening for changes on target and measured temperature
		startPolling();

		// Success
		callback(null, true);
};

/**
 * Default pairing process
 */
module.exports.pair = function (socket) {

	socket.on("search_devices", function(data,callback) {

		var ao = new AtagOne(null);
		ao.FindDev(function(err,data) {
			if (!err) {
				callback(null,data[0]); /// only first device
			}
		});
	})

socket.on("pair_device", function(data,callback) {
		if (data) {
			var ao = new AtagOne(data);
			ao.pair(function(err,authorized) {
				host=data;
				callback(err,authorized);	
			});
		} else 
			callback(true,'no ip-address found');
	})


	socket.on("list_devices", function (data, callback) {
		//console.log('list_devices:' + data)

		devices = [];	

		var ao = new AtagOne(host);

		ao.pair(function(err,authorized) {
			if (!err && authorized) {
				ao.getReport(function(err, data){
					if (!err) {
							//console.log('data :'+data)
							devices.push({
								data: {
									id: data.status.device_id,
									ip: host,
									heatInfo : data		
								},
								name: 'Atag One'
							});
							callback(null, devices);	
					} else 
						callback(null, devices);	
				});
			} else
			   	callback(null, devices);	
		});
	})

	socket.on("add_device", function (device, callback) {
	    // console.log('add_device:' + device.data.id);
	    // console.log('report:' + device.data.heatInfo);
		// console.log('name'+device.name);

		devices.push(device);
	
		if (callback) callback(null, true);
	});
};

/**
 * These represent the capabilities of the Heatmiser Neo Smart
 */
module.exports.capabilities = {

	target_temperature: {

		get: function (device, callback) {
			if (device instanceof Error) return callback(device);
			
			//  console.log('get target_temp');
			// console.log('device:'+device.id);
			// console.log('device:'+device.ip);
			// console.log('device:'+device.heatInfo);

		    // send the value to Homey from cach, do not retrieve again.
            if (typeof callback == 'function' ) {
                callback( null, device.heatInfo.report.shown_set_temp);
            }
		},

		set: function (device, temperature, callback) {
			if (device instanceof Error) return callback(device);

				console.log('set target_temp');
				console.log('device:'+ device.heatInfo.report.shown_set_temp);

				// Catch faulty trigger and max/min temp
				if (!temperature) {
					callback(true, temperature);
					return false;
				}
				else if (temperature < 4) {
					temperature = 4;
				}
				else if (temperature > 27) {
					temperature = 27;
				}

				temperature = Math.round(temperature * 2) / 2;

				var ao = new AtagOne(device.ip);
				ao.SetTemperature(temperature, function(err, errData){
					if (callback) callback(err, temperature);
				})
		}
			
	},

	measure_temperature: {

		get: function (device, callback) {
			if (device instanceof Error) return callback(device);
			
			// console.log('get measure_temp');
			// console.log('device:'+device.id);
			// console.log('device:'+device.ip);
			// console.log('device:'+device.heatInfo);

		    // send the value to Homey from cach, do not retrieve again.
            if (typeof callback == 'function' ) {
                callback( null, device.heatInfo.report.room_temp);
            }
		}
	}
};

module.exports.deleted = function (device_data) {
    devices.forEach(function (device) {
        if (device_data.id == device.id) {
            delete devices[devices.indexOf(device)];
        }
    });
};


function updateState(){
    Object.keys(devices).forEach(function (id) {
		var device = devices[id];
		// console.log('update data:\n' + device.data.id);
		// console.log(device.data.ip);		
		// console.log(device.data.report);	
		var ao = new AtagOne(devices[id].data.ip);
		ao.getReport(function(err, data){
			if (!err) {
				var report = device.data.heatInfo.report;
				var newReport = data.report
				// check room tempature
				var temp_old = Number(report.room_temp);
            	var temp_new = Number(newReport.room_temp);
				if ( temp_old != temp_new) {
					// room tempature changed
					Homey.log('room temperature difference')
					report.room_temp=newReport.room_temp;
					module.exports.realtime(device, 'measure_temperature', temp_new);
					console.log('old room temp:'+temp_old + '\tnew room temp:'+temp_new);
                	// this will tigger the action card
					Homey.manager('flow').trigger('inside_temp_changed', { "insidetemp": temp_new, "outsidetemp":newReport.outside_temp })
					Homey.manager('insights').createEntry( 'room_temperature', newReport.room_temp, new Date(), function(err, success){
						if( err ) return console.error(err);
					})
				}
				// check outside tempature
				temp_old = Number(report.outside_temp);
            	temp_new = Number(newReport.outside_temp);
				if ( temp_old != temp_new) {
					// outside  tempature changed
					Homey.log('outside temperature difference')
					report.outside_temp=newReport.outside_temp;
					console.log('old outside temp:'+temp_old + '\tnew outside temp:'+temp_new);

                	// this will tigger the action card
					Homey.manager('flow').trigger('outside_temp_changed', { "insidetemp": newReport.room_temp, "outsidetemp":temp_new })
					// insight update
					Homey.manager('insights').createEntry( 'outside_temperature', newReport.outside_temp, new Date(), function(err, success){
						if( err ) return console.error(err);
					})
				}
				// check water temp
				temp_old = Number(report.dhw_water_temp);
            	temp_new = Number(newReport.dhw_water_temp);
				if ( temp_old != temp_new) {
					// outside  tempature changed
					Homey.log('dhw_water_temp difference')
					report.dhw_water_temp=newReport.dhw_water_temp;
					console.log('old dhw_water_temp temp:'+temp_old + '\tnew dhw_water_temp temp:'+temp_new);

                	// this will tigger the action card
					Homey.manager('flow').trigger('dhw_water_temp_changed', { "temp": newReport.dhw_water_temp })

					Homey.manager('insights').createEntry( 'water_temperature', newReport.outside_temp, new Date(), function(err, success){
						if( err ) return console.error(err);
					})
				}
				// * check target_temperature
				temp_old = Number(report.shown_set_temp);
				temp_new = Number(newReport.shown_set_temp);
				if ( temp_old != temp_new) {
						Homey.log('target temperature difference')
						report.shown_set_temp=temp_new;
						module.exports.realtime(device, 'target_temperature', temp_new);
				}
				var heating_old = Number(report.ch_setpoint)==0;
				var heating_new = Number(newReport.ch_setpoint)==0;
				if ( heating_old != heating_new) {
					if (!heating_old && heating_new) {
						// heating on
						Homey.manager('flow').trigger('heating_changed', { "heating_status": true })
					} else {
						Homey.manager('flow').trigger('heating_changed', { "heating_status": false })
					}
				}
				var wp_old = Number(report.ch_water_pres);
				var wp_new = Number(newReport.ch_water_pres);
				if ( wp_old != wp_new) {
					// water pressure changed
					Homey.log('water pressure difference')
					report.ch_water_pres=newReport.ch_water_pres;

                	// this will tigger the action card
					Homey.manager('flow').trigger('pressure_changed', { "pressure": newReport.ch_water_pres })
				}


				device.data.heatInfo=data;
			} 
		});
	})
};


/**
 * ATAG doesn't support realtime, therefore we have to poll
 * for changes considering the measured and target temperature
 */
function startPolling() {
	// Poll every 5 minute
	setInterval(function () {

		//Update device data
		console.log('[AtagOne] Polling data');
		updateState();
	}, 300000);
}


function getDevice(device_id) {
	if (devices.length > 0) {
		for (var x = 0; x < devices.length; x++) {
			if (devices[x].data.id === device_id) {
				return devices[x];
			}
		}
	}
};




