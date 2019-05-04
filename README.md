# ATAG ONE

This app lets you control your ATAG-ONE thermostat using Homey! (Unofficial app)

## Trigger:
 - inside temperature changed
 - outside temperature changed
 - Tap Water Temperature changed (drinking/shower water)
 - Heating changed (on / off)
 - Heating Water pressure changed
 - Burning Hours changed
 - Heating water temperature
 - Heating return water temperature
 - Target Temperature changed


## Conditions

 - Inside Temperature above/below
 - Outside Temperature above/below


## Actions

 - Set Temperature on desired value

### v0.5.6
Changed syncing mechanism

### v0.5.5
Still syncing stopped after a few days. Hopefully fixed now.

### v0.5.4
Syncing back to 5 minutes. Seems that lower the device will not respond :( at some users. 

### v0.5.3
Add logging to see what is going on. Thanks Robin de Gruijter (I have used the code from you). The logging part is developed and copyright from Robin de Gruijter.
Syncing to 3 minutes. 2 minutes seems to get the device not responding.

### v0.5.2
Sync more often (2 minutes) in stead of 5min and insights updates

### v0.5.1
Fixed (I hope) paring process.

### v0.5.0
Complete rewrite for the ATAG One app for Homey 2.0. Thanks to Robert Klep which wrote the Nefit app and I used this as an example, as I found this very nice and clean written. It's the best to delete your device and re-add it as you will get then more capabilities.

### v.0.11
Bug fix heating status and text correction

### v.0.10
Add action card to set temperature

### v.0.09
Bugfixes for homey 1.5 RC

### v.0.08
Bugfix for homey 1.5 RC

### v.0.07
Add insight log for difference between Heating water temperature-return Heating Temperature

### v.0.06
Remove all insights and made capabilities which have automatic insight graphics. Added authorization fix for Firmware R46 (Thanks to Rob Juurlink).
Make sure you remove the device and add it again. For some reason the capabilities are not seen correctly if you won't

### v 0.0.5
Added heating water temperature trigger and insight

### v 0.0.4
Added burning hours trigger and insight

## Change Log:

### v 0.0.3
Fix temperature measuring. Created water tap Insight

### v 0.0.2
First BETA release

## Donate
This is an open source application and totaly free. 
By donating you support me in my work of which I do in my own free time.
[![Paypal Donate](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=FU4J2LWM6WSNS)