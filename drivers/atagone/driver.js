'use strict';

var request = require('request');
var AtagOne = require('./atagone');

var host = '192.168.10.222'

var thermostats = {}
var number_of_devices = 0
var devices = {};

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
				if (device != null && (device.report.room_temp > args.temp) && args.device.id == device.data.id) {
					console.log("room:" + device.report.room_temp + ' args Outside:'+args.temp);
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
				if (device != null && (device.report.outside_temp > args.temp) && args.device.id == device.data.id) {
					console.log("outside:" + device.report.outside_temp + ' args Outside:'+args.temp);
					result = true;
				}
			}
			callback(null, result);
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
					report  : {}
				}
		})

		/* update device to latest info */
		Object.keys(devices).forEach(function (id) {
			updateState(devices[id].data);
  	    });

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

		var device_list = [];	

		var ao = new AtagOne(host);

		ao.pair(function(err,authorized) {
			if (!err && authorized) {
				ao.getReport(function(err, data){
					if (!err) {
							console.log('data :'+data)
							device_list.push({
								data: {
									id: data.device_id,
									ip: host		
								},
								name: 'Atag One'
							});
							callback(null, device_list);	
					} else 
						callback(null, device_list);	
				});
			} else
			   	callback(null, device_list);	
		});
	})

	socket.on("add_device", function (device, callback) {
	     console.log('add_device:' + device);

		 initDevice(device.data, function(err,data) {
			if (!err) {
				callback(null, true);
			} else	
				callback(null, false);
		 })
	});
};

function initDevice( device_data, callback ) {
    console.log('Initializing ATAG ONE device');
	console.log(device_data);

	/** Create insights */

	Homey.manager('insights').createLog( 'room_temperature', {
		label: {
			en: 'Inside temperature',
			nl: 'Binnen temperatuur'
		},
		type: 'number',
		units: {en: 'Degrees',nl: 'Graden'},
		decimals: 1,
		chart: 'line' // prefered, or default chart type. can be: line, area, stepLine, column, spline, splineArea, scatter
	}, function callback(err , success){
		if( err ) return console.error(err);
	});		
	Homey.manager('insights').createLog( 'outside_temperature', {
		label: {
			en: 'Outside temperature',
			nl: 'Buiten temperatuur'
		},
		type: 'number',
		units: {en: 'Degrees',nl: 'Graden'},
		decimals: 1,
		chart: 'line' // prefered, or default chart type. can be: line, area, stepLine, column, spline, splineArea, scatter
	}, function callback(err , success){
		if( err ) return console.error(err);
	});	
	Homey.manager('insights').createLog( 'water_temperature', {
		label: {
			en: 'Water temperature',
			nl: 'Water temperatuur'
		},
		type: 'number',
		units: {en: 'Degrees',nl: 'Graden'},
		decimals: 1,
		chart: 'line' // prefered, or default chart type. can be: line, area, stepLine, column, spline, splineArea, scatter
	}, function callback(err , success){
		if( err ) return console.error(err);
	});	

	// Delete a log
	Homey.manager('insights').deleteLog('water_pressure' , function callback(err , success){
			if( err ) return console.error(err);
	});	
	// Delete a log
	Homey.manager('insights').deleteLog('burning_hours' , function callback(err , success){
			if( err ) return console.error(err);
	});	

	Homey.manager('insights').createLog( 'water_pressure', {
		label: {
			en: 'Water pressure',
			nl: 'Waterdruk'
		},
		type: 'number',
		units: {en: 'Bar',nl: 'Bar'},
		decimals: 1,
		chart: 'line' // prefered, or default chart type. can be: line, area, stepLine, column, spline, splineArea, scatter
	}, function callback(err , success){
		if( err ) return console.error(err);
	});	

	Homey.manager('insights').createLog( 'burning_hours', {
		label: {
			en: 'Burning hours',
			nl: 'Branduren'
		},
		type: 'number',
		units: {en: 'Hours',nl: 'Uren'},
		decimals: 1,
		chart: 'line' // prefered, or default chart type. can be: line, area, stepLine, column, spline, splineArea, scatter
	}, function callback(err , success){
		if( err ) return console.error(err);
	});	
	/** Initialize device & latest report */
	var ao = new AtagOne(device_data.ip);

	ao.getReport(function(err, data){
		if (!err) {
			devices[ device_data.id ] = {
				id: device_data.id,
				data: device_data,
				report: data
			};
			callback(err, true);
		} else 
		   callback(err, true);
	});
}

/**
 * These represent the capabilities of the Heatmiser Neo Smart
 */
module.exports.capabilities = {

	target_temperature: {

		get: function (device, callback) {
			if (device instanceof Error) return callback(device);
			
			 console.log('get target_temp');
			console.log('device:'+device.id);
			console.log('device:'+device.ip);

			var dev = devices[ device.id ];

            if (dev) {
				if (dev.hasOwnProperty("report")) {
					var report=devices[ device.id ].report;
					
					console.log('set temp:'+report.shown_set_temp);

					// send the value to Homey from cach, do not retrieve again.
					if (typeof callback == 'function' ) {
					callback( null, report.shown_set_temp);
					}
				} else 
					/** retrieve live data instead of cache!? */
					callback(true,null)
			} else
				callback(true,null);
		},

		set: function (device, temperature, callback) {
			if (device instanceof Error) return callback(device);

				console.log('set target_temp');
				console.log(device);
				// console.log('device:'+ device.report.shown_set_temp);

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
			console.log('###########get measure_temp');
			console.log('device:'+device.id);
			console.log('device:'+device.ip);

			if (device instanceof Error) return callback(device);

			var dev = devices[ device.id ];

            if (dev) {
				if (dev.hasOwnProperty("report")) {
					var report=devices[ device.id ].report;
					
					console.log('set temp:'+report.shown_set_temp);

					// send the value to Homey from cach, do not retrieve again.
					if (typeof callback == 'function' ) {
					callback( null, report.room_temp);
					}
				} else 
					/** retrieve live data instead of cache!? */
					callback(true,null)
			} else
				callback(true,null);
		}
	}
};

module.exports.deleted = function (device_data) {
 	delete devices[ device_data.id ];
};


function updateState(device_data){
		console.log('update:'+device_data);

		var device = devices[ device_data.id ];

		var ao = new AtagOne(device_data.ip);
		ao.getReport(function(err, data){
			if (!err) {
				var report = device.report;
				var newReport = data
				// check room tempature
				var temp_old = Number(report.room_temp);
            	var temp_new = Number(newReport.room_temp);
				if ( temp_old != temp_new) {
					// room tempature changed
					Homey.log('room temperature difference')
				//	console.log(device.data);
					module.exports.realtime(device_data, "measure_temperature", temp_new, function(err, success) { 
						Homey.log('Real-time meas temp', err, success) 
					})
					console.log('old room temp:'+temp_old + '\tnew room temp:'+temp_new);
                	// this will tigger the action card
					Homey.manager('flow').trigger('inside_temp_changed', { "insidetemp": temp_new, "outsidetemp":newReport.outside_temp })
					Homey.manager('insights').createEntry( 'room_temperature', temp_new, new Date(), function(err, success){
						if( err ) return console.error(err);
					})
				}
				// //check outside tempature
				temp_old = Number(report.outside_temp);
            	temp_new = Number(newReport.outside_temp);
				if ( temp_old != temp_new) {
					// outside  tempature changed
					Homey.log('outside temperature difference')
					console.log('old outside temp:'+temp_old + '\tnew outside temp:'+temp_new);

                	// this will tigger the action card
					Homey.manager('flow').trigger('outside_temp_changed', { "insidetemp": newReport.room_temp, "outsidetemp":temp_new })
					// insight update
					Homey.manager('insights').createEntry( 'outside_temperature', temp_new, new Date(), function(err, success){
						if( err ) return console.error(err);
					})
				}
				// check water temp
				temp_old = Number(report.dhw_water_temp);
            	temp_new = Number(newReport.dhw_water_temp);
				if ( temp_old != temp_new) {
					// outside  tempature changed
					Homey.log('dhw_water_temp difference')

					console.log('old dhw_water_temp temp:'+temp_old + '\tnew dhw_water_temp temp:'+temp_new);

                	// this will tigger the action card
					Homey.manager('flow').trigger('dhw_water_temp_changed', { "temp": temp_new })

					Homey.manager('insights').createEntry( 'water_temperature', temp_new, new Date(), function(err, success){
						if( err ) return console.error(err);
					})
				}
				// * check target_temperature
				temp_old = Number(report.shown_set_temp);
				temp_new = Number(newReport.shown_set_temp);
				if ( temp_old != temp_new) {
						Homey.log('target temperature difference')
						module.exports.realtime(device_data, "target_temperature", temp_new, function(err, success) { 
											Homey.log('Real-time target_temp', err, success) 
						})
				}
				var heating_old = Number(report.ch_setpoint)==0;
				var heating_new = Number(newReport.ch_setpoint)==0;
				if ( heating_old != heating_new) {
					if (heating_old && !heating_new) {
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
                	// this will tigger the action card
					Homey.manager('flow').trigger('pressure_changed', { "pressure": wp_new })
					Homey.manager('insights').createEntry( 'water_pressure', wp_new, new Date(), function(err, success){
						if( err ) return console.error(err);
					})
				}
				var bh_old = Number(report.burning_hours);
				var bh_new = Number(newReport.burning_hours);
				if ( bh_old != bh_new) {
					// water pressure changed
					Homey.log('Burning Hours difference')
                	// this will tigger the action card
					Homey.manager('flow').trigger('burning_hours_changed', { "pressure": wp_new })
					Homey.manager('insights').createEntry( 'burning_hours', bh_new, new Date(), function(err, success){
						if( err ) return console.error(err);
					})
				}
				device.report=data;
			} 
		});
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
		Object.keys(devices).forEach(function (id) {
			updateState(devices[id].data);
  	    });
	}, 300000);
}

function randomIntInc (low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
}





