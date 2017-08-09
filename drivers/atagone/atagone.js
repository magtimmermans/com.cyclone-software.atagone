var request = require("request");
var os = require('os');
var dgram = require('dgram');

var port = 10000;

function AtagOne(ip) {
    this.mac = getMac();
    this.ip = ip;
}

AtagOne.prototype.deviceIP = function() {
    return this.ip;
}

AtagOne.prototype.FindDev = function(callback) {
    var broadcastAddress = "255.255.255.255";

    var message = new Buffer(37);

    var client = dgram.createSocket("udp4");
    client.on('listening', function() {
        var address = client.address();
        console.log('UDP Client listening on ' + address.address + ":" + address.port);
        client.setBroadcast(true)
            //client.setMulticastTTL(128); 
    });

    client.on('message', function(message, remote) {
        console.log('Found: From: ' + remote.address + ':' + remote.port + ' - ' + message);
        if (message.indexOf('ONE') > -1) {
            var atags = [];
            var deviceId = message.toString().split(' ')[1];
            var deviceIp = remote.address;
            atags.push({ devid: deviceId, ip: deviceIp });
            client.close();
            if (callback) {
                callback(false, atags);
            }
        } else {
            callback(true, null);
        }
    });

    client.on('error', function(error) {
        client.close();
        if (callback) {
            callback(true, null);
        }
    });

    client.bind(11000);
}

AtagOne.prototype.pair = function(callback) {

    Homey.log('asking authorization');

    var post_data = {
        pair_message: {
            seqnr: 0,
            account_auth: {
                user_account: '',
                mac_address: this.mac
            },
            accounts: {
                entries: [{
                    user_account: '',
                    mac_address: this.mac,
                    device_name: 'Homey',
                    account_type: 0
                }]
            }
        }
    };

    var options = {
        method: 'POST',
        url: 'http://' + this.ip + ':' + port + '/pair_message',
        headers: {
            'cache-control': 'no-cache',
            'content-type': 'application/json',
            'Content-Length': Buffer.byteLength(JSON.stringify(post_data)),
        },
        body: post_data,
        json: true
    };

    request(options, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log(body) //result
            if (body) {
                if (body.pair_reply.acc_status == 2) {
                    callback(false, true);
                } else {
                    callback(false, false);
                }
            }
        } else {
            throw new Error('cannot connect to AtagOne (check ip address)');
        }
    });
}

AtagOne.prototype.getReport = function(callback) {
    var post_data = {
        retrieve_message: {
            seqnr: 0,
            account_auth: {
                user_account: '',
                mac_address: this.mac
            },
            info: 29
        }
    }

    //console.log(JSON.stringify(post_data));

    var options = {
        method: 'POST',
        url: 'http://' + this.ip + ':' + port + '/retrieve_message',
        headers: {
            'Content-Length': Buffer.byteLength(JSON.stringify(post_data)),
            'cache-control': 'no-cache',
            'content-type': 'application/json'
        },
        body: post_data,
        json: true
    };

    request(options, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            // console.log(body) //result
            if (body) {
                if (body.retrieve_reply.acc_status == 2) {
                    /* authorized */

                    var report = body.retrieve_reply.report;

                    // corrections for temp
                    report.outside_temp = report.outside_temp + body.retrieve_reply.configuration.outs_temp_offs;

                    /* offset correction seems not needed for room temp !!??? **/
                    // report.room_temp = report.room_temp+body.retrieve_reply.configuration.room_temp_offs;
                    report.device_id = body.retrieve_reply.status.device_id;
                    //console.log(body) 
                    callback(false, report);
                } else
                    callback(true, null);
            } else {
                callback(true, null);
            }
        } else {
            callback(true, 'cannot connect to AtagOne (check ip address)');
        }
    });
}

AtagOne.prototype.SetTemperature = function(tempature, callback) {
    var post_data = {
        update_message: {
            seqnr: 0,
            account_auth: {
                user_account: '',
                mac_address: this.mac
            },
            device: null,
            status: null,
            report: null,
            configuration: null,
            schedules: null,
            control: { ch_mode_temp: Number(tempature) }
        }
    }
    var options = {
        method: 'POST',
        url: 'http://' + this.ip + ':' + port + '/update',
        headers: {
            'Content-Length': Buffer.byteLength(JSON.stringify(post_data)),
            'cache-control': 'no-cache',
            'content-type': 'application/json'
        },
        body: post_data,
        json: true
    };

    request(options, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            // console.log(body) //result
            if (body) {
                if (body.update_reply.acc_status == 2) {
                    /* authorized */
                    callback(false, null);
                } else
                    callback(true, 'No Access');
            } else {
                callback(true, 'Empty body');
            }
        } else {
            callback(true, 'cannot connect to AtagOne (check ip address)');
        }
    });
}

function getMac() {
    var interfaces = os.networkInterfaces();
    for (var k in interfaces) {
        for (var k2 in interfaces[k]) {
            var address = interfaces[k][k2];
            if (address.family === 'IPv4' && !address.internal) {
                //console.log(address);
                return address.mac;
            }
        }
    }
}


module.exports = AtagOne;