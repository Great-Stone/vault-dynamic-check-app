const config = require("../config");
let vaultoption = {
    apiVersion: "v1",
    endpoint: config.vault.endpoint
}
let VaultSDK = require("node-vault")(vaultoption);
const mongodb = require("mongodb");

const vaultLogin = async (callback) => {
    const username = config.vault.id
    const password = config.vault.pw
    VaultSDK.userpassLogin({ username, password })
    .then((result)=>{
        callback(VaultSDK)
    })
    .catch((err) => console.error(err.message));
}

let db;
let connSecret;
let lease_id;

const newSecret = async (callback) => {
    vaultLogin(vault_client => {
        vault_client.read("mongodb/creds/mongodb-1h-role")
        .then((secret) => {
            callback(secret)
        }).catch((err) => console.error(err.message));
    })
}
// config for your database

const option = {
    useUnifiedTopology: true,
    poolSize : 5
};

const init = async () => {
    newSecret(secret => {
        console.log(`mongodb init secret user: ${secret.data.username}`);
        console.log(`mongodb init secret pass: ${secret.data.password}`);
        lease_id = secret.lease_id
        connSecret = secret;
        const username = encodeURIComponent(secret.data.username);
        const password = encodeURIComponent(secret.data.password);
        const authMechanism = "SCRAM-SHA-1";
        const uri = `mongodb://${username}:${password}@${config.mongodb.ip}:${config.mongodb.port}/?authMechanism=${authMechanism}`
        mongodb.MongoClient.connect(uri, option, function(err, database) {
            if (err) throw err;
            db = database.db(config.mongodb.db);
        });
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
        // await mongodb_client.connect();
        const result = await db.command({
            dbStats: 1,
        });

        const data = {
            secret: connSecret,
            result: result
        };
        callback(data);
    } catch (e) {
        console.error(e)
    }
};

module.exports = {
    newSecret: newSecret,
    query: query,
};
