const config = require("../config");
let vaultoption = {
    apiVersion: "v1",
    endpoint: config.vault.endpoint
}
let VaultSDK = require("node-vault")(vaultoption);
const mssql = require("mssql");

const vaultLogin = async (callback) => {
    const username = config.vault.id
    const password = config.vault.pw
    VaultSDK.userpassLogin({ username, password })
    .then((result)=>{
        callback(VaultSDK)
    })
    .catch((err) => console.error(err.message));
}
// config for your database
var connectionConfig = {
    user: '',
    password: '',
    server: config.mssql.ip, 
    port: Number(config.mssql.port), 
    database: 'tempdb',
    stream: true,
    pool: {
        max: 5,
        min: 5,
        idleTimeoutMillis: 30000
    }
};

let pool;
let poolConnect;
let connSecret;
let lease_id;

const newSecret = async (callback) => {
    vaultLogin(vault_client => {
        vault_client.read("mssql/creds/mssql-1h-role")
        .then((secret) => {
            callback(secret)
        }).catch((err) => console.error(err.message));
    })
}

const init = async () => {
    newSecret(secret => {
        console.log(`mssql init secret user: ${secret.data.username}`);
        console.log(`mssql init secret pass: ${secret.data.password}`);
        lease_id = secret.lease_id
        connSecret = secret;
        connectionConfig.user = secret.data.username;
        connectionConfig.password = secret.data.password;
    
        pool = new mssql.ConnectionPool(connectionConfig);
        poolConnect = pool.connect();
    
        pool.on('error', err => {
            console.error(`pool err: ${err}`)
        })
    })
}

init();

const renewal = async () => {
    vaultLogin(vault_client => {
        vault_client.renew({ lease_id: lease_id })
        .then((result) => {
            console.log(result)
        }).catch((err) => console.error(err.message));
    })
}

setInterval(renewal, 30 * 60 * 1000); // renewel
setInterval(init, 23 * 60 * 60 * 1000); // recreate

const query = async (sql, callback) => {
    await poolConnect;
    try {
        const request = pool.request()
        request.stream = true
        request.query(sql)

        let data = {
            secret: connSecret,
            result: []
        };
        request.on('row', row => {
            data.result.push(row)
        })
        request.on('error', err => {
            console.error('SQL request error', err);
        })
        request.on('done', result => {
            callback(data)
            data.result = [];
        })
    } catch (err) {
        console.error('SQL error', err);
    }
};

module.exports = {
    newSecret: newSecret,
    query: query,
};
