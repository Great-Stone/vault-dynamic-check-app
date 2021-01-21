const config = require("../config");
let vaultoption = {
    apiVersion: "v1",
    endpoint: config.vault.endpoint
}
let VaultSDK = require("node-vault")(vaultoption);
const oracledb = require("oracledb");
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

const vaultLogin = async (callback) => {
    const username = config.vault.id
    const password = config.vault.pw
    VaultSDK.userpassLogin({ username, password })
    .then((result)=>{
        callback(VaultSDK)
    })
    .catch((err) => console.error(err.message));
}

let pool;
let connSecret;
let lease_id;

const newSecret = async (callback) => {
    vaultLogin(vault_client => {
        vault_client.read("oracle/static-creds/oracle-test")
        .then((secret) => {
            callback(secret)
        }).catch((err) => console.error(err.message));
    })
}

const init = async () => {
    newSecret(async (secret) => {
        console.log(`oracle init secret user: ${secret.data.username}`);
        console.log(`oracle init secret pass: ${secret.data.password}`);
        connSecret = secret;
        const username = secret.data.username;
        const password = secret.data.password;
    
        pool = await oracledb.createPool( {
            user          : username,
            password      : password,
            connectString : config.oracle.connectstring,
            poolMin       : 1,
            poolMax       : 10,
            poolIncrement : 1,
            poolTimeout   : 60
        })
    })
}

init();

const renewal = async () => {
    vaultLogin(vault_client => {
        vault_client.write("oracle/rotate-role/oracle-test")
        .then((result) => {
            console.log(result)
            init()
        }).catch((err) => console.error(err.message));
    })
}

setInterval(renewal, 23 * 60 * 60 * 1000); // rotate
// setInterval(init, 23 * 60 * 60 * 1000); // recreate

const query = async (sql, callback) => {
    let data = {
        secret: connSecret,
        result: ''
    };
    let connection = await pool.getConnection()
    try {
        const result = await connection.execute(sql, {}, {outFormat:oracledb.OBJECT});
        data.result = result
    } catch (err) {
        data.result = err
        console.error(err);
    } finally {
        callback(data);
        if (connection) {
          try {
            await connection.close();
          } catch (err) {
            console.error(err);
          }
        }
    }
};

module.exports = {
    newSecret: newSecret,
    query: query,
};
