let Service = require('node-windows').Service;
let path = require("path");
 
let o = path.resolve('./server.js');
console.log(o);

let svc = new Service({
  name: 'Server_AutoStart',
  description: 'Sewepo本地服务器',
  script: path.resolve('./server.js'),
  wait: '1',
  grow: '0.25',
  maxRestarts: '40'
});

svc.on('install', () => {
  svc.start();
  console.log('install complete')
});

svc.on('uninstall', () => {
  console.log('Uninstall complete');
  console.log('The service exists:', svc.exists)
})

svc.on('alreadyinstalled', () => {
  console.log('This service is already install.')
})

if(svc.exists) return svc.uninstall();
 
svc.install();