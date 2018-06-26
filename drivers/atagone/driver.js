'use strict';

var request = require('request');
var AtagOne = require('./atagone');

var host = ''

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
module.exports.init = function(devices_data, callback) {


    // Delete old log
    Homey.manager('insights').deleteLog('water_pressure', function callback(err, success) {
        //	if( err ) return console.error(err);
    });
    Homey.manager('insights').deleteLog('heating_water_temp', function callback(err, success) {
        //	if( err ) return console.error(err);
    });
    Homey.manager('insights').deleteLog('heating_return_water_temp', function callback(err, success) {
        //	if( err ) return console.error(err);
    });
    Homey.manager('insights').deleteLog('room_temperature', function callback(err, success) {
        //	if( err ) return console.error(err);
    });
    Homey.manager('insights').deleteLog('outside_temperature', function callback(err, success) {
        //	if( err ) return console.error(err);
    });
    Homey.manager('insights').deleteLog('water_temperature', function callback(err, success) {
        //	if( err ) return console.error(err);
    });
    Homey.manager('insights').deleteLog('burning_hours', function callback(err, success) {
        //	if( err ) return console.error(err);
    });
    Homey.manager('insights').deleteLog('water_pressure', function callback(err, success) {
        //	if( err ) return console.error(err);
    });

    Homey.manager('insights').createLog('DeltaT', {
        label: {
            en: 'DeltaT '
        },
        type: 'number',
        units: {
            en: '°C'
        },
        decimals: 2,
        chart: 'line' // prefered, or default chart type. can be: line, area, stepLine, column, spline, splineArea, scatter
    }, function callback(err, success) {
        if (err) return console.error(err);
    });


    Homey.manager('flow').on('trigger.inside_temp_changed', function(callback, args) {
        Homey.log('trigger.inside_temp_changed started')
        console.log('[trigger] temp changed: ' + args)
        callback(null, true); // true to make the flow continue, or false to abort
    })
    Homey.manager('flow').on('trigger.outside_temp_changed', function(callback, args) {
        Homey.log('trigger.outside_temp_changed started')
        console.log('[trigger] temp changed: ' + args)
        callback(null, true); // true to make the flow continue, or false to abort
    })
    Homey.manager('flow').on('trigger.outside_temp_changed', function(callback, args) {
        callback(null, true); // true to make the flow continue, or false to abort
    })

    Homey.manager('flow').on('condition.temp_above', function(callback, args) {
        var result = false;
        // Check for proper incoming arguments
        if (args != null && args.hasOwnProperty("temp") && args.hasOwnProperty("device") && args.device.id) {

            // Get device
            var device = devices[args.device.id];

            // If found and status is away return true
            if (device != null && (device.report.room_temp > args.temp) && args.device.id == device.data.id) {
                console.log("room:" + device.report.room_temp + ' args Outside:' + args.temp);
                result = true;
            }
        }
        callback(null, result);
    });

    Homey.manager('flow').on('condition.buitentemp_above', function(callback, args) {
        var result = false;
        // Check for proper incoming arguments
        if (args != null && args.hasOwnProperty("temp") && args.hasOwnProperty("device") && args.device.id) {

            // Get device
            var device = devices[args.device.id];

            // If found and status is away return true
            if (device != null && (device.report.outside_temp > args.temp) && args.device.id == device.data.id) {
                console.log("outside:" + device.report.outside_temp + ' args Outside:' + args.temp);
                result = true;
            }
        }
        callback(null, result);
    });

    Homey.manager('flow').on('action.set_temperature', function (callback, args) {
        var new_target = Number(Math.round(args.temp_range * 2) / 2).toFixed(1)
        Homey.log('device id: ' + args.device.id)
        Homey.log('New temperature: ' + new_target)

        var ao = new AtagOne(devices[args.device.id].data.ip);
        ao.SetTemperature(new_target, function(err, errData) {
            Homey.log('Error: ' + err);
            Homey.log('Error_Text: ' + errData);
            if (callback) callback(null, err);
        })
    })


    // when the driver starts, Homey rebooted. Initialize all previously paired devices.
    Homey.log('----devices data----')
    Homey.log(devices_data)
    Homey.log('----devices data----')
    devices_data.forEach(function(device_data) {
        Homey.log('===== device data====')
        Homey.log(device_data)
        Homey.log('===== device data====')
        number_of_devices++
        Homey.log(number_of_devices)
        var ao = new AtagOne(device_data.ip);
        ao.getReport(function(err, data) {
            Homey.log('latest data');
            devices[device_data.id] = {
                data: device_data,
                report: data
            }
            updateState(devices[device_data.id].data, true);
        });
    })

    // Start listening for changes on target and measured temperature
    startPolling();

    // Success
    callback(null, true);
};

/**
 * Default pairing process
 */
module.exports.pair = function(socket) {

    socket.on("search_devices", function(data, callback) {

        var ao = new AtagOne(null);
        ao.FindDev(function(err, data) {
            if (!err) {
                callback(null, data[0]); /// only first device
            }
        });
    })

    socket.on("pair_device", function(data, callback) {
        if (data) {
            var ao = new AtagOne(data);
            ao.pair(function(err, authorized) {
                host = data;
                callback(err, authorized);
            });
        } else
            callback(true, 'no ip-address found');
    })


    socket.on("list_devices", function(data, callback) {
        //console.log('list_devices:' + data)

        var device_list = [];

        var ao = new AtagOne(host);

        ao.pair(function(err, authorized) {
            if (!err && authorized) {
                ao.getReport(function(err, data) {
                    if (!err) {
                        console.log('data :' + data)
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

    socket.on("add_device", function(device, callback) {
        console.log('add_device:' + device);

        initDevice(device.data, function(err, data) {
            if (!err) {
                callback(null, true);
            } else
                callback(null, false);
        })
    });
};

function initDevice(device_data, callback) {
    console.log('Initializing ATAG ONE device');
    console.log(device_data);

    /** Initialize device & latest report */
    var ao = new AtagOne(device_data.ip);

    ao.getReport(function(err, data) {
        if (!err) {
            devices[device_data.id] = {
                id: device_data.id,
                data: device_data,
                report: data
            };
            updateState(devices[device_data.id].data, true);
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

        get: function(device, callback) {
            if (device instanceof Error) return callback(device);

            console.log('get target_temp');
            console.log('device:' + device.id);
            console.log('device:' + device.ip);

            var dev = devices[device.id];

            if (dev) {
                if (dev.hasOwnProperty("report")) {
                    var report = devices[device.id].report;

                    console.log('set temp:' + report.shown_set_temp);

                    // send the value to Homey from cach, do not retrieve again.
                    if (typeof callback == 'function') {
                        callback(null, report.shown_set_temp);
                    }
                } else
                /** retrieve live data instead of cache!? */
                    callback(true, null)
            } else
                callback(true, null);
        },

        set: function(device, temperature, callback) {
            if (device instanceof Error) return callback(device);

            console.log('set target_temp');
            console.log(device);
            // console.log('device:'+ device.report.shown_set_temp);

            // Catch faulty trigger and max/min temp
            if (!temperature) {
                callback(true, temperature);
                return false;
            } else if (temperature < 4) {
                temperature = 4;
            } else if (temperature > 27) {
                temperature = 27;
            }

            temperature = Math.round(temperature * 2) / 2;

            var ao = new AtagOne(device.ip);
            ao.SetTemperature(temperature, function(err, errData) {
                if (callback) callback(err, temperature);
            })
        }

    },

    measure_temperature: {

        get: function(device, callback) {
            console.log('###########get measure_temp');
            // console.log('device:' + device.id);

            if (device instanceof Error) return callback(device);

            var dev = devices[device.id];

            if (dev) {
                if (dev.hasOwnProperty("report")) {
                    var report = devices[device.id].report;

                    //console.log('get measure temp:' + report.shown_set_temp);

                    // send the value to Homey from cach, do not retrieve again.
                    if (typeof callback == 'function') {
                        callback(null, report.room_temp);
                    }
                } else
                /** retrieve live data instead of cache!? */
                    callback(true, null)
            } else
                callback(true, null);
        }
    },

    my_outside_temperature: {
        get: function(device, callback) {
            console.log('###########my_outside_temperature');
            // console.log('device:' + device.id);

            if (device instanceof Error) return callback(device);

            var dev = devices[device.id];

            if (dev) {
                if (dev.hasOwnProperty("report")) {
                    var report = devices[device.id].report;

                    // console.log('set ch_water_pres:' + report.outside_temp);

                    // send the value to Homey from cach, do not retrieve again.
                    if (typeof callback == 'function') {
                        callback(null, report.outside_temp);
                    }
                } else
                /** retrieve live data instead of cache!? */
                    callback(true, null)
            } else
                callback(true, null);
        }
    },

    my_water_temp: {
        get: function(device, callback) {
            console.log('###########dhw_water_temp');
            // console.log('device:' + device.id);

            if (device instanceof Error) return callback(device);

            var dev = devices[device.id];

            if (dev) {
                if (dev.hasOwnProperty("report")) {
                    var report = devices[device.id].report;

                    // console.log('set dhw_water_temp:' + report.dhw_water_temp);

                    // send the value to Homey from cach, do not retrieve again.
                    if (typeof callback == 'function') {
                        callback(null, report.dhw_water_temp);
                    }
                } else
                /** retrieve live data instead of cache!? */
                    callback(true, null)
            } else
                callback(true, null);
        }
    },

    my_heatingwater_temp: {
        get: function(device, callback) {
            console.log('###########my_heatingwater_temp');
            // console.log('device:' + device.id);

            if (device instanceof Error) return callback(device);

            var dev = devices[device.id];

            if (dev) {
                if (dev.hasOwnProperty("report")) {
                    var report = devices[device.id].report;

                    // console.log('set ch_water_pres:' + report.ch_water_temp);

                    // send the value to Homey from cach, do not retrieve again.
                    if (typeof callback == 'function') {
                        callback(null, report.ch_water_temp);
                    }
                } else
                /** retrieve live data instead of cache!? */
                    callback(true, null)
            } else
                callback(true, null);
        }
    },
    my_heatingreturnwater_temp: {
        get: function(device, callback) {
            console.log('###########my_heatingreturnwater_temp');
            // console.log('device:' + device.id);

            if (device instanceof Error) return callback(device);

            var dev = devices[device.id];

            if (dev) {
                if (dev.hasOwnProperty("report")) {
                    var report = devices[device.id].report;

                    // console.log('set ch_water_pres:' + report.ch_return_temp);

                    // send the value to Homey from cach, do not retrieve again.
                    if (typeof callback == 'function') {
                        callback(null, report.ch_return_temp);
                    }
                } else
                /** retrieve live data instead of cache!? */
                    callback(true, null)
            } else
                callback(true, null);
        }
    },

    my_water_pressure: {
        get: function(device, callback) {
            console.log('###########get my_water_pressure');
            // console.log('device:' + device.id);

            if (device instanceof Error) return callback(device);

            var dev = devices[device.id];

            if (dev) {
                if (dev.hasOwnProperty("report")) {
                    var report = devices[device.id].report;

                    // console.log('set ch_water_pres:' + report.ch_water_pres);

                    // send the value to Homey from cach, do not retrieve again.
                    if (typeof callback == 'function') {
                        callback(null, report.ch_water_pres);
                    }
                } else
                /** retrieve live data instead of cache!? */
                    callback(true, null)
            } else
                callback(true, null);
        }
    },

    my_burning_hours: {
        get: function(device, callback) {
            console.log('###########my_burning_hours');
            // console.log('device:' + device.id);

            if (device instanceof Error) return callback(device);

            var dev = devices[device.id];

            if (dev) {
                if (dev.hasOwnProperty("report")) {
                    var report = devices[device.id].report;

                    console.log('set my_burning_hours:' + report.burning_hours);

                    // send the value to Homey from cach, do not retrieve again.
                    if (typeof callback == 'function') {
                        callback(null, report.burning_hours);
                    }
                } else
                /** retrieve live data instead of cache!? */
                    callback(true, null)
            } else
                callback(true, null);
        }
    }
};

module.exports.deleted = function(device_data) {
    delete devices[device_data.id];
};


function updateState(device_data, forceUpdate) {
    console.log('update:' + device_data + '  Forced:' + forceUpdate);

    var device = devices[device_data.id];

    var ao = new AtagOne(device_data.ip);
    ao.getReport(function(err, data) {
        if (!err) {
            var report = device.report;
            var newReport = data
                // check room tempature

            var temp_old = (forceUpdate ? 0 : Number(report.room_temp));
            var temp_new = Number(newReport.room_temp);
            if (temp_old != temp_new) {
                // room tempature changed
                Homey.log('room temperature difference')

                //	console.log(device.data);
                module.exports.realtime(device_data, "measure_temperature", temp_new, function(err, success) {
                    Homey.log('Real-time meas temp', err, success)
                })

                console.log('old room temp:' + temp_old + '\tnew room temp:' + temp_new);
                // this will tigger the action card

                Homey.manager('flow').trigger('inside_temp_changed', { "insidetemp": temp_new, "outsidetemp": newReport.outside_temp })
            }
            // //check outside tempature
            temp_old = (forceUpdate ? 0 : Number(report.outside_temp));
            temp_new = Number(newReport.outside_temp);
            if (temp_old != temp_new) {
                // outside  tempature changed
                Homey.log('outside temperature difference')
                console.log('old outside temp:' + temp_old + '\tnew outside temp:' + temp_new);

                module.exports.realtime(device_data, "my_outside_temperature", temp_new, function(err, success) {
                    Homey.log('Real-time meas temp', err, success)
                })

                // this will tigger the action card
                Homey.manager('flow').trigger('outside_temp_changed', { "insidetemp": newReport.room_temp, "outsidetemp": temp_new })
            }
            // check water temp
            temp_old = (forceUpdate ? 0 : Number(report.dhw_water_temp));
            temp_new = Number(newReport.dhw_water_temp);
            if (temp_old != temp_new) {
                // outside  tempature changed
                Homey.log('dhw_water_temp difference')

                console.log('old dhw_water_temp temp:' + temp_old + '\tnew dhw_water_temp temp:' + temp_new);

                module.exports.realtime(device_data, "my_water_temp", temp_new, function(err, success) {
                    Homey.log('Real-time my_water_temp', err, success)
                })

                // this will tigger the action card
                Homey.manager('flow').trigger('dhw_water_temp_changed', { "temp": temp_new })

            }
            // * check target_temperature
            temp_old = (forceUpdate ? 0 : Number(report.shown_set_temp));
            temp_new = Number(newReport.shown_set_temp);
            if (temp_old != temp_new) {
                Homey.log('target temperature difference')
                module.exports.realtime(device_data, "target_temperature", temp_new, function(err, success) {
                    Homey.log('Real-time target_temp', err, success)
                })
            }
            var heating_old = Number(report.boiler_status&8) == 8;
            var heating_new = Number(newReport.boiler_status&8) == 8;
            // Homey.log(newReport.boiler_status&8);
            // Homey.log(newReport.boiler_status&4);
            // Homey.log(newReport.boiler_status&2);
            if (heating_old != heating_new) {
                if (heating_old && !heating_new) {
                  
                    //console.log('Heating off');
                    Homey.manager('flow').trigger('heating_changed', { "heating_status": false })
                } else {
                      // heating on
                    //console.log('Heating on');
                    Homey.manager('flow').trigger('heating_changed', { "heating_status": true })
                }
            }
            var wp_old = (forceUpdate ? 0 : Number(report.ch_water_pres));
            var wp_new = Number(newReport.ch_water_pres);
            if (wp_old != wp_new) {
                // water pressure changed
                Homey.log('water pressure difference')
                module.exports.realtime(device_data, "my_water_pressure", wp_new, function(err, success) {
                    Homey.log('Real-time my_water_pressure', err, success)
                })

                // this will tigger the action card
                Homey.manager('flow').trigger('pressure_changed', { "pressure": wp_new })
            }
            var bh_old = (forceUpdate ? 0 : Number(report.burning_hours));
            var bh_new = Number(newReport.burning_hours);
            if (bh_old != bh_new) {
                // water pressure changed
                Homey.log('Burning Hours difference')

                module.exports.realtime(device_data, "my_burning_hours", bh_new, function(err, success) {
                        Homey.log('Real-time my_burning_hours', err, success)
                    })
                    // this will tigger the action card
                Homey.manager('flow').trigger('burning_hours_changed', { "pressure": wp_new })
            }
            var cvw_old = (forceUpdate ? 0 : Number(report.ch_water_temp));
            var cvw_new = Number(newReport.ch_water_temp);
            if (cvw_old != cvw_new) {
                // water pressure changed
                Homey.log('ch_water_temp difference')

                module.exports.realtime(device_data, "my_heatingwater_temp", cvw_new, function(err, success) {
                    Homey.log('Real-time my_heatingwater_temp', err, success)
                })

                // this will tigger the action card
                Homey.manager('flow').trigger('heatingwater_temp_changed', { "temp": cvw_new })
            }
            var cvrw_old = (forceUpdate ? 0 : Number(report.ch_return_temp));
            var cvrw_new = Number(newReport.ch_return_temp);
            if (cvrw_old != cvrw_new) {
                // water pressure changed
                Homey.log('ch_return_temp difference')

                module.exports.realtime(device_data, "my_heatingreturnwater_temp", cvrw_new, function(err, success) {
                        Homey.log('Real-time my_heatingreturnwater_temp', err, success)
                    })
                    // this will tigger the action card
                Homey.manager('flow').trigger('heatingreturnwater_temp_changed', { "temp": cvrw_new })
            }
            // difference water_temp-return_temp
            Homey.manager('insights').createEntry('DeltaT', parseFloat(cvw_new - cvrw_new), new Date(), function(err, success) {
                if (err) {
                    Homey.log(Homey.error(err)); //return Homey.error(err);
                };
            });

            device.report = data;
        }
    });
};


/**
 * ATAG doesn't support realtime, therefore we have to poll
 * for changes considering the measured and target temperature
 */
function startPolling() {
    // Poll every 5 minute

    setInterval(function() {
        //Update device data
        console.log('[AtagOne] Polling data');
        Object.keys(devices).forEach(function(id) {
            updateState(devices[id].data, false);
        });
    }, 300000);
}

function randomIntInc(low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
}