const { exec } = require('child_process');

function ShutDown() {
    exec('shutdown /p', (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
        console.log(`stderr: ${stderr}`);
    });
}

module.exports = { ShutDown }