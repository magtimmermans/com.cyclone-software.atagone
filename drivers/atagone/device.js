// Device.js
'use strict';

const Homey = require('homey');
const request = require('request');
const AtagOne = require('./atagone');

const formatValue   = t => Math.round(t.toFixed(1) * 10) / 10

class AtagOneDevice extends Homey.Device {

    async onInit() {
        var name=this.getName();
        console.log(name);
        this.log(`Init device ${name}`);
 
        var data = this.getData();
        console.log(data);

        this.settings = Object.assign({}, data);

        await this.setUnavailable(Homey.__('device.connecting'));
        try {
            this.aoDev = new AtagOne(this.settings.ip);
            await this.aoDev.getReport().then(
                report => {
                  this.report = report;
                } 
             ).catch(
                 error => console.log(error)
             );
        } catch (error) {
            console.log('Unable to retrieve data :' + error.message);
            throw error;
        }

        console.log(this.report);
        await this.setAvailable();

        // Get driver.
        this.driver = await this._getDriver();

        this.registerCapabilities();

        // Start syncing periodically.
        this.shouldSync = true;
        this.startSyncing();
    }

    // Get a (ready) instance of the driver.
    async _getDriver() {
        return new Promise(resolve => {
        let driver = this.getDriver();
        driver.ready(() => resolve(driver));
        });
    }

    // Register setters for capabilities.
    registerCapabilities() {
        this.registerCapabilityListener("target_temperature", this.onSetTargetTemperature.bind(this));
    }

    onSettings( oldSettingsObj, newSettingsObj, changedKeysArr, callback ) {
        callback( null, true );
    }

    onAdded() {
        this.log(`New device added: ${this.getName()} - ${this.getData().ip} `);
    }

    onDeleted() {
        this.log('device deleted');
        this.shouldSync = false;
        this.setUnavailable();
    }

    // Set target temperature on ATAG One device.
    async onSetTargetTemperature(value, opts) {
        this.log('setting target temperature to', value);

        // Catch faulty trigger and max/min temp
        if (!value) {
           return false;
        } else if (value < 4) {
            value = 4;
        } else if (value > 27) {
            value = 27;
        }

        value = Math.round(value * 2) / 2;

        this.log('setting target temperature to', value);
        return this.aoDev.SetTemperature(value);
    }

    async startSyncing() {
        // Prevent more than one syncing cycle.
        if (this.syncRunning) return;
    
        // Start syncing.
        this.syncRunning = true;
        this.log('starting sync');
        this.sync();
    }
    
    async sync() {
        if (! this.shouldSync || this.isSyncing) return;
    
        this.isSyncing = true;
        this.log('syncing');
        try {
          await this.updateStatus();
          await this.setAvailable(); // We could update so the device is available.
        } catch(e) {
          this.log('error syncing', e);
          await this.setUnavailable(Homey.__('device.sync_error') + ': ' + e.message);
        }
        this.isSyncing = false;
    
        // Schedule next sync.
        this.timeout = setTimeout(
          () => this.sync(),
           300000
        );
    }

      // Set a capability value, optionally formatting it.
    async setValue(cap, value) {
        if (value == null) return;
        if (typeof value === 'number') {
            value = formatValue(value);
        }
        if (this.getCapabilityValue(cap) !== value) {
            await this.setCapabilityValue(cap, value).catch(e => {
                this.log(`Unable to set capability '${ cap }': ${ e.message }`);
            });
        }
    }

    async updateStatus() {
        await this.aoDev.getReport().then(
            report => {
              this.report = report;
            } 
         ).catch(
             error => console.log(error)
        );

        this.log('...updating status');
        await Promise.all([
            this.setValue("measure_temperature",this.report.room_temp),
            this.setValue("my_outside_temperature", this.report.outside_temp),
            this.setValue("my_water_temp", this.report.dhw_water_temp),
            this.setValue("target_temperature", this.report.shown_set_temp),
            this.setValue("my_water_pressure", this.report.ch_water_pres),
            this.setValue("my_burning_hours", this.report.burning_hours),
            this.setValue("my_heatingwater_temp", this.report.ch_water_temp),
            this.setValue("my_heatingreturnwater_temp", this.report.ch_return_temp),
            this.setValue("central_heating", (this.report.boiler_status&2) == 2),
        ]);



        // set all triggers, in the feature make better code 
        this.log('...sent triggers');
        
        if (this.getCapabilityValue("measure_temperature") !== this.report.room_temp)
            this.driver._triggers.trgTempChanged.trigger(this, { "insidetemp": this.report.room_temp, "outsidetemp": this.report.outside_temp }).catch(this.error ).then(this.log);
                        
       if (this.getCapabilityValue("my_outside_temperature") !== this.report.outside_temp)
         this.driver._triggers.trgOutsideTempChanged.trigger(this, { "insidetemp": this.report.room_temp, "outsidetemp": this.report.outside_temp }).catch(this.error ).then(this.log);

        if (this.getCapabilityValue("my_water_temp") !== this.report.dhw_water_temp)
            this.driver._triggers.trgWaterTempChanged.trigger(this, { "temp": this.report.dhw_water_temp }).catch(this.error ).then(this.log);

        // current setups do not have this, so check if exist.    
        if (this.hasCapability("central_heating")) {
            if (this.getCapabilityValue("central_heating") !== ((this.report.boiler_status&8) == 8))
            this.driver._triggers.trgHeatingChanged.trigger(this, { "heating_status": ((this.report.boiler_status&8) == 8) }).catch(this.error ).then(this.log);
        }

        if (this.getCapabilityValue("my_water_pressure") !== this.report.ch_water_pres)
            this.driver._triggers.trgPressureChanged.trigger(this, { "pressure": this.report.ch_water_pres }).catch(this.error ).then(this.log);

         if (this.getCapabilityValue("my_burning_hours") !== formatValue(this.report.burning_hours))
            this.driver._triggers.trgBurningHoursChanged.trigger(this, { "burninghours": formatValue(this.report.burning_hours)}).catch(this.error ).then(this.log);

        if (this.getCapabilityValue("my_heatingwater_temp") !== this.report.ch_water_temp)
            this.driver._triggers.trgHeatingWaterTempChanged.trigger(this, { "temp": this.report.ch_water_temp}).catch(this.error ).then(this.log);

        if (this.getCapabilityValue("my_heatingreturnwater_temp") !== this.report.ch_return_temp)
            this.driver._triggers.trgHeatingReturnWaterTempChanged.trigger(this, { "temp": this.report.ch_return_temp }).catch(this.error ).then(this.log);
    }
}

module.exports = AtagOneDevice;
