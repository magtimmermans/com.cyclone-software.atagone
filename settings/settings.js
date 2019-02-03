
function onHomeyReady( Homey ){
        console.log( "ready!" );
        Homey.ready();
}

function showLogs() {
	Homey.api('GET', 'getlogs/', (err, result) => {
		if (!err) {
			document.getElementById('loglines').innerHTML = '';
			for (let i = (result.length - 1); i >= 0; i -= 1) {
				document.getElementById('loglines').innerHTML += result[i];
				document.getElementById('loglines').innerHTML += '<br />';
			}
		}
	});
}
function deleteLogs() {
	Homey.api('GET', 'deletelogs/', (err) => {
		if (err) {
			Homey.alert(err.message, 'error'); 
		} else { Homey.alert('Logs deleted!', 'info'); }
	});
}
