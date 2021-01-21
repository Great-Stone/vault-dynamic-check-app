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

let connection;
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
    newSecret((secret) => {
        console.log(`oracle init secret user: ${secret.data.username}`);
        console.log(`oracle init secret pass: ${secret.data.password}`);
        lease_id = secret.lease_id
        connSecret = secret;
        const username = secret.data.username;
        const password = secret.data.password;
    
        try {
            connection = oracledb.getConnection( {
              user          : username,
              password      : password,
              connectString : config.oracle.connectstring
            });
        } catch (err) {
            console.error(err);
        } 
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
    try {
        const result = await connection.execute(sql);
        let data = {
            secret: connSecret,
            result: result
        };
        callback(data);
      } catch (err) {
        console.error(err);
      } finally {
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
